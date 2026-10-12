import { randomUUID } from 'node:crypto'
import type { AgentRun } from '@shared/types/agent'
import type { AgentRunRequest, AgentRunStarted } from '@shared/types/agent-run'
import type { ContinuousWritingInput, ContinuousWritingPlan } from '@shared/types/continuous-writing'

export interface ContinuousWritingDeps {
  read: (projectPath: string) => Promise<ContinuousWritingPlan | null>
  write: (plan: ContinuousWritingPlan) => Promise<void>
  inspect: (projectPath: string) => Promise<{
    threadId: string
    chapters: { chapter: number; completed: boolean; writable: boolean }[]
  }>
  checkReady: (projectPath: string) => Promise<void>
  getRun: (threadId: string) => Promise<AgentRun | null>
  isBusy: (threadId: string) => boolean
  startRun: (request: AgentRunRequest & { requestId: string }) => Promise<AgentRunStarted>
}

export function createContinuousWritingManager(deps: ContinuousWritingDeps) {
  const plans = new Map<string, ContinuousWritingPlan | null>()
  const pauseRequests = new Set<string>()
  let operations: Promise<unknown> = Promise.resolve()
  let stopped = false

  function serialize<T>(operation: () => Promise<T>): Promise<T> {
    const next = operations.catch(() => undefined).then(operation)
    operations = next
    return next
  }

  async function save(plan: ContinuousWritingPlan) {
    try {
      await deps.write(plan)
      plans.set(plan.projectPath, { ...plan })
    } catch (error) {
      // A failed write must never leave an active in-memory queue.
      plans.set(plan.projectPath, { ...plan, status: 'paused', reason: '连续写作进度保存失败，请检查磁盘后恢复。' })
      throw error
    }
  }

  async function load(projectPath: string) {
    if (!plans.has(projectPath)) {
      const plan = await deps.read(projectPath)
      if (plan?.status === 'running') {
        await save({ ...plan, status: 'paused', reason: '应用已重启，点击继续写作可恢复。' })
      } else {
        plans.set(projectPath, plan)
      }
    }
    const plan = plans.get(projectPath)
    return plan ? { ...plan } : null
  }

  async function advance(plan: ContinuousWritingPlan) {
    if (stopped || plan.status !== 'running') return
    try {
      const run = await deps.getRun(plan.threadId)
      if (plan.runId) {
        if (!run || run.id !== plan.runId) throw new Error('写作任务已变化，请检查当前章节后恢复。')
        if (run.selectedChapter !== undefined && run.selectedChapter !== plan.nextChapter) throw new Error('写作章节已变化，请检查当前任务后恢复。')
        if (run.status === 'durability-failed') throw new Error('当前任务保存失败，请先处理后恢复。')
        if (deps.isBusy(plan.threadId)) return
        if (run.status !== 'complete') throw new Error('当前章节写作已停止，点击继续写作可重试。')
        const detail = await deps.inspect(plan.projectPath)
        if (!detail.chapters.some((chapter) => chapter.chapter === plan.nextChapter && chapter.completed)) {
          throw new Error(`第 ${plan.nextChapter} 章尚未完成入库，请检查任务结果后恢复。`)
        }
        plan = { ...plan, nextChapter: plan.nextChapter + 1, runId: undefined }
        await save(plan)
      }

      const detail = await deps.inspect(plan.projectPath)
      if (detail.threadId !== plan.threadId) throw new Error('小说身份已变化，请重新安排连续写作。')
      const next = detail.chapters.find((chapter) => !chapter.completed)
      if (!next || next.chapter > plan.endChapter) {
        await save({ ...plan, status: 'complete', nextChapter: plan.endChapter + 1, reason: undefined })
        return
      }
      if (next.chapter < plan.startChapter || next.chapter < plan.nextChapter) {
        throw new Error('前文完成状态已变化，请检查后重新安排连续写作。')
      }
      for (let chapter = 1; chapter < next.chapter; chapter++) {
        if (!detail.chapters.some((item) => item.chapter === chapter && item.completed)) {
          throw new Error(`第 ${chapter} 章尚未完成，请先处理前文。`)
        }
      }
      if (!next.writable) throw new Error(`第 ${next.chapter} 章还没有可用细纲，请先完成规划。`)
      plan = { ...plan, nextChapter: next.chapter }
      if (deps.isBusy(plan.threadId)) {
        if (run && (run.command === 'write-next' || run.command === 'recover-write') &&
          (run.selectedChapter === undefined || run.selectedChapter === next.chapter)) {
          await save({ ...plan, runId: run.id })
          return
        }
        throw new Error('当前小说有其他任务，请等任务结束后恢复连续写作。')
      }
      await deps.checkReady(plan.projectPath)
      if (stopped) return
      await save(plan)
      if (stopped || pauseRequests.has(plan.projectPath)) return
      const started = await deps.startRun({
        requestId: randomUUID(), threadId: plan.threadId, projectPath: plan.projectPath,
        command: 'write-next', prompt: '', selectedChapter: next.chapter, origin: 'action',
        displayPrompt: `连续写作 · 第 ${next.chapter} 章`,
        skipChapterConfirmation: plan.skipChapterConfirmation,
      })
      await save({ ...plan, runId: started.runId })
    } catch (error) {
      await save({ ...plan, status: 'paused', reason: error instanceof Error ? error.message : '连续写作已暂停，请检查后恢复。' })
    }
  }

  return {
    get: (projectPath: string) => serialize(() => load(projectPath)),
    update: (input: ContinuousWritingInput) => {
      if (input.action === 'pause') pauseRequests.add(input.projectPath)
      else pauseRequests.delete(input.projectPath)
      return serialize(async () => {
        if (stopped) throw new Error('应用正在退出。')
        const existing = await load(input.projectPath)
        if (input.action === 'pause') {
          if (!existing) throw new Error('没有连续写作计划。')
          if (existing.status !== 'complete') await save({ ...existing, status: 'paused', reason: '已暂停续写；当前章会继续完成。' })
        } else {
          if (existing?.status === 'running') return existing
          const detail = await deps.inspect(input.projectPath)
          const next = detail.chapters.find((chapter) => !chapter.completed)
          if (input.action === 'resume' && !existing) throw new Error('没有可恢复的连续写作计划。')
          const endChapter = input.action === 'resume' ? existing!.endChapter : input.endChapter
          if (!Number.isSafeInteger(endChapter) || !endChapter || endChapter < 1 ||
            !detail.chapters.some((chapter) => chapter.chapter === endChapter)) throw new Error('请选择已规划范围内的结束章。')
          if (input.action === 'start' && (!next || endChapter < next.chapter)) throw new Error('结束章不能早于当前待写章节。')
          if (next && next.chapter <= endChapter) {
            for (let chapter = next.chapter; chapter <= endChapter; chapter++) {
              if (!detail.chapters.some((item) => item.chapter === chapter && (item.completed || item.writable))) {
                throw new Error(`第 ${chapter} 章还没有可用细纲，请先完成规划。`)
              }
            }
          }
          const plan: ContinuousWritingPlan = {
            version: 1, projectPath: input.projectPath, threadId: detail.threadId,
            startChapter: input.action === 'resume' ? existing!.startChapter : next!.chapter,
            nextChapter: next?.chapter ?? endChapter + 1, endChapter, status: 'running',
            skipChapterConfirmation: input.action === 'resume' ? existing!.skipChapterConfirmation : input.skipChapterConfirmation === true,
          }
          await save(plan)
          await advance(plan)
        }
        return (await load(input.projectPath))!
      })
    },
    tick: () => serialize(async () => {
      for (const plan of plans.values()) if (plan?.status === 'running') await advance({ ...plan })
    }),
    shutdown: () => {
      stopped = true
      return serialize(async () => {
        for (const plan of plans.values()) {
          if (plan?.status === 'running') await save({ ...plan, status: 'paused', reason: '应用已退出，点击继续写作可恢复。' })
        }
      })
    },
  }
}
