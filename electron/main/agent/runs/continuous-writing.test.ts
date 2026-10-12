import { describe, expect, test } from 'bun:test'
import type { ContinuousWritingPlan } from '@shared/types/continuous-writing'
import type { AgentRun } from '@shared/types/agent'
import type { AgentRunRequest } from '@shared/types/agent-run'
import { createContinuousWritingManager } from './continuous-writing'

function fixture() {
  let saved: ContinuousWritingPlan | null = null
  let run: AgentRun | null = null
  let completed = 0
  let blocked = false
  let failSave = false
  const requests: AgentRunRequest[] = []
  const deps = {
    read: async () => saved && { ...saved },
    write: async (plan: ContinuousWritingPlan) => {
      if (failSave) throw new Error('disk full')
      saved = { ...plan }
    },
    inspect: async () => ({
      threadId: 'novel:test',
      chapters: [1, 2, 3].map((chapter) => ({ chapter, completed: chapter <= completed, writable: true })),
    }),
    checkReady: async () => { if (blocked) throw new Error('Memory must be synchronized') },
    getRun: async () => run,
    isBusy: () => Boolean(run && ['running', 'waiting-user'].includes(run.status)),
    startRun: async (request: AgentRunRequest) => {
      requests.push(request)
      run = { id: `run-${requests.length}`, threadId: request.threadId, command: request.command,
        prompt: '', status: 'running', startedAt: '', selectedChapter: request.selectedChapter }
      return { runId: run.id }
    },
  }
  return {
    manager: createContinuousWritingManager(deps), deps, requests,
    finish: (status: AgentRun['status'] = 'complete', commit = true) => {
      if (!run) throw new Error('No run')
      run = { ...run, status }
      if (commit) completed = run.selectedChapter!
    },
    setRun: (value: AgentRun) => { run = value },
    block: () => { blocked = true },
    failSave: () => { failSave = true },
  }
}

describe('continuous writing', () => {
  test('runs one chapter at a time and stops at the requested end', async () => {
    const f = fixture()
    await f.manager.update({ projectPath: '/book', action: 'start', endChapter: 2, skipChapterConfirmation: true })
    await f.manager.tick()
    expect(f.requests.map((request) => request.selectedChapter)).toEqual([1])
    expect(f.requests[0].skipChapterConfirmation).toBe(true)
    f.finish()
    await f.manager.tick()
    expect(f.requests.map((request) => request.selectedChapter)).toEqual([1, 2])
    f.finish()
    await f.manager.tick()
    expect((await f.manager.get('/book'))?.status).toBe('complete')
    expect(f.requests).toHaveLength(2)
  })

  test('does not treat a successful conversation as a completed chapter', async () => {
    const f = fixture()
    await f.manager.update({ projectPath: '/book', action: 'start', endChapter: 3 })
    f.finish('complete', false)
    await f.manager.tick()
    expect((await f.manager.get('/book'))?.status).toBe('paused')
    expect(f.requests).toHaveLength(1)
  })

  test('failure and cancellation stop the batch even if progress changed', async () => {
    for (const status of ['failed', 'cancelled', 'interrupted'] as const) {
      const f = fixture()
      await f.manager.update({ projectPath: '/book', action: 'start', endChapter: 3 })
      f.finish(status)
      await f.manager.tick()
      expect((await f.manager.get('/book'))?.status).toBe('paused')
      expect(f.requests).toHaveLength(1)
    }
  })

  test('pause lets the current chapter finish and resume uses fresh progress', async () => {
    const f = fixture()
    await f.manager.update({ projectPath: '/book', action: 'start', endChapter: 3 })
    await f.manager.update({ projectPath: '/book', action: 'pause' })
    f.finish()
    await f.manager.tick()
    expect(f.requests).toHaveLength(1)
    await f.manager.update({ projectPath: '/book', action: 'resume' })
    expect(f.requests[1].selectedChapter).toBe(2)
  })

  test('adopts the current chapter and waits for user questions without answering them', async () => {
    const f = fixture()
    f.setRun({ id: 'existing', threadId: 'novel:test', command: 'write-next', selectedChapter: 1,
      prompt: '', status: 'waiting-user', startedAt: '' })
    await f.manager.update({ projectPath: '/book', action: 'start', endChapter: 3 })
    await f.manager.tick()
    expect(f.requests).toHaveLength(0)
    expect((await f.manager.get('/book'))?.runId).toBe('existing')
    f.finish()
    await f.manager.tick()
    expect(f.requests[0].selectedChapter).toBe(2)
  })

  test('restart restores a paused plan without running a model', async () => {
    const f = fixture()
    await f.manager.update({ projectPath: '/book', action: 'start', endChapter: 3 })
    const restarted = createContinuousWritingManager(f.deps)
    expect((await restarted.get('/book'))?.status).toBe('paused')
    await restarted.tick()
    expect(f.requests).toHaveLength(1)
  })

  test('checks memory and editor drafts again before each chapter', async () => {
    const f = fixture()
    await f.manager.update({ projectPath: '/book', action: 'start', endChapter: 3 })
    f.finish()
    f.block()
    await f.manager.tick()
    expect((await f.manager.get('/book'))?.reason).toContain('Memory')
    expect(f.requests).toHaveLength(1)
  })

  test('serializes duplicate starts and concurrent ticks', async () => {
    const f = fixture()
    await Promise.allSettled([1, 2].map(() => f.manager.update({ projectPath: '/book', action: 'start', endChapter: 3 })))
    await Promise.all([f.manager.tick(), f.manager.tick()])
    expect(f.requests).toHaveLength(1)
  })

  test('does not start a run when the plan cannot be saved', async () => {
    const f = fixture()
    f.failSave()
    await expect(f.manager.update({ projectPath: '/book', action: 'start', endChapter: 2 })).rejects.toThrow('disk full')
    await f.manager.tick()
    expect(f.requests).toHaveLength(0)
  })

  test('rejects a range outside planned chapters', async () => {
    const f = fixture()
    await expect(f.manager.update({ projectPath: '/book', action: 'start', endChapter: 4 })).rejects.toThrow()
    expect(f.requests).toHaveLength(0)
  })

  test('pause during preflight prevents the next model request', async () => {
    const f = fixture()
    await f.manager.update({ projectPath: '/book', action: 'start', endChapter: 3 })
    f.finish()
    let entered!: () => void
    let release!: () => void
    const ready = new Promise<void>((resolve) => { entered = resolve })
    const held = new Promise<void>((resolve) => { release = resolve })
    f.deps.checkReady = async () => { entered(); await held }
    const ticking = f.manager.tick()
    await ready
    const pausing = f.manager.update({ projectPath: '/book', action: 'pause' })
    release()
    await Promise.all([ticking, pausing])
    expect(f.requests).toHaveLength(1)
    expect((await f.manager.get('/book'))?.status).toBe('paused')
  })

  test('an immediate pause also stops a start that is still queued', async () => {
    const f = fixture()
    await Promise.all([
      f.manager.update({ projectPath: '/book', action: 'start', endChapter: 3 }),
      f.manager.update({ projectPath: '/book', action: 'pause' }),
    ])
    expect(f.requests).toHaveLength(0)
    expect((await f.manager.get('/book'))?.status).toBe('paused')
  })

  test('does not attach an unrelated project command', async () => {
    const f = fixture()
    f.setRun({ id: 'other', threadId: 'novel:test', command: 'rewrite', selectedChapter: 1,
      prompt: '', status: 'running', startedAt: '' })
    const plan = await f.manager.update({ projectPath: '/book', action: 'start', endChapter: 3 })
    expect(plan.status).toBe('paused')
    expect(f.requests).toHaveLength(0)
  })

  test('shutdown saves a paused plan and never starts another chapter', async () => {
    const f = fixture()
    await f.manager.update({ projectPath: '/book', action: 'start', endChapter: 3 })
    f.finish()
    await f.manager.shutdown()
    await f.manager.tick()
    expect((await f.manager.get('/book'))?.status).toBe('paused')
    expect(f.requests).toHaveLength(1)
  })
})
