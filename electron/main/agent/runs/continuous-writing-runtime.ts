import { createHash } from 'node:crypto'
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getAgentThreadIdForProjectIdentity } from '@shared/types/agent'
import type { ContinuousWritingPlan } from '@shared/types/continuous-writing'
import { atomicWriteFile } from '../../atomic-write'
import { loadNovelProjectDetail } from '../../novel/novel-project'
import { readPendingMemorySync } from '../../novel/pending-memory-sync'
import { listManuscriptDrafts } from '../../novel/manuscript-drafts'
import type { AgentRuntimeCoordinator } from './agent-runtime-coordinator'
import { createContinuousWritingManager } from './continuous-writing'

export function createContinuousWritingRuntime(rootDir: string, coordinator: AgentRuntimeCoordinator) {
  const directory = join(rootDir, 'continuous-writing')
  const filePath = (projectPath: string) => join(directory, `${createHash('sha256').update(projectPath).digest('hex')}.json`)
  return createContinuousWritingManager({
    async read(projectPath) {
      let source: string
      try { source = await readFile(filePath(projectPath), 'utf8') } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
        throw error
      }
      const plan = JSON.parse(source) as ContinuousWritingPlan
      if (!plan || plan.version !== 1 || plan.projectPath !== projectPath || typeof plan.threadId !== 'string' ||
        !['running', 'paused', 'complete'].includes(plan.status) ||
        ![plan.startChapter, plan.nextChapter, plan.endChapter].every((value) => Number.isSafeInteger(value) && value > 0) ||
        plan.startChapter > plan.endChapter || plan.nextChapter > plan.endChapter + 1 ||
        typeof plan.skipChapterConfirmation !== 'boolean' ||
        (plan.runId !== undefined && typeof plan.runId !== 'string')) {
        throw new Error('连续写作计划损坏，请检查保存文件。')
      }
      return plan
    },
    async write(plan) {
      await mkdir(directory, { recursive: true })
      await atomicWriteFile(filePath(plan.projectPath), `${JSON.stringify(plan, null, 2)}\n`)
    },
    async inspect(projectPath) {
      const detail = await loadNovelProjectDetail(projectPath)
      if (detail.problem || !['ready', 'in-progress'].includes(detail.status)) {
        throw new Error(detail.problem ?? '请先完成小说设定和大纲规划。')
      }
      const chapters = detail.tocItems.filter((item) => item.kind === 'chapter' && item.chapterNumber)
        .sort((left, right) => left.chapterNumber! - right.chapterNumber!)
      const next = chapters.find((item) => item.status !== 'completed')
      const recovery = chapters.find((item) => item.status === 'recoverable')
      if (recovery && recovery.chapterNumber !== next?.chapterNumber) {
        throw new Error('前文章节与写作断点不一致，请先检查并恢复当前任务。')
      }
      return {
        threadId: getAgentThreadIdForProjectIdentity(detail),
        chapters: chapters
          .map((item) => ({ chapter: item.chapterNumber!, completed: item.status === 'completed',
            writable: ['planned', 'in-progress', 'recoverable', 'interrupted-draft'].includes(item.status ?? '') }))
          .sort((left, right) => left.chapter - right.chapter),
      }
    },
    async checkReady(projectPath) {
      const pending = await readPendingMemorySync(projectPath)
      if (Object.keys(pending).length) throw new Error('正文修改尚未同步记忆，请同步后恢复连续写作。')
      if ((await listManuscriptDrafts(projectPath)).length) throw new Error('有未保存的正文恢复草稿，请保存或放弃后恢复连续写作。')
    },
    async getRun(threadId) {
      const snapshot = await coordinator.getThreadSnapshot(threadId)
      return snapshot.activeRun ?? snapshot.lastRun
    },
    isBusy: coordinator.hasActiveRunForThread,
    startRun: coordinator.startRun,
  })
}
