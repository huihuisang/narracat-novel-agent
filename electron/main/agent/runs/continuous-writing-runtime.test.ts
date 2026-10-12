import { describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNovelProjectFixture } from '../../novel/test-novel-fixture'
import { createContinuousWritingRuntime } from './continuous-writing-runtime'
import type { AgentRuntimeCoordinator } from './agent-runtime-coordinator'
import type { AgentRunRequest } from '@shared/types/agent-run'
import type { AgentRun } from '@shared/types/agent'
import { markPendingMemorySync } from '../../novel/pending-memory-sync'

describe('continuous writing persistence and project checks', () => {
  async function fixture() {
    const { root } = await createNovelProjectFixture({ name: 'continuous', state: 'outlined' })
    const userData = await mkdtemp(join(tmpdir(), 'narracat-continuous-state-'))
    const requests: AgentRunRequest[] = []
    let activeRun: AgentRun | null = null
    const coordinator = {
      getThreadSnapshot: async () => ({ activeRun, lastRun: null }),
      hasActiveRunForThread: () => activeRun !== null,
      startRun: async (request: AgentRunRequest) => {
        requests.push(request)
        activeRun = { id: 'run-1', command: request.command, selectedChapter: request.selectedChapter,
          threadId: request.threadId, prompt: '', status: 'running', startedAt: '' }
        return { runId: 'run-1' }
      },
    } as unknown as AgentRuntimeCoordinator
    return { root, userData, requests, coordinator, manager: createContinuousWritingRuntime(userData, coordinator) }
  }

  test('keeps chapter confirmation scoped to the batch and restores the plan as paused', async () => {
    const f = await fixture()
    const config = await readFile(join(f.root, '.narracat/config.yaml'), 'utf8')
    const state = await f.manager.update({ projectPath: f.root, action: 'start', endChapter: 1, skipChapterConfirmation: true })
    expect(state.status).toBe('running')
    expect(f.requests).toHaveLength(1)
    expect(await readFile(join(f.root, '.narracat/config.yaml'), 'utf8')).toBe(config)
    const restored = createContinuousWritingRuntime(f.userData, f.coordinator)
    expect(await restored.get(f.root)).toMatchObject({ status: 'paused', endChapter: 1, skipChapterConfirmation: true })
    await restored.tick()
    expect(f.requests).toHaveLength(1)
  })

  test('pending memory changes stop before invoking the model', async () => {
    const f = await fixture()
    await markPendingMemorySync(f.root, 1, ['Changed a fact'])
    const result = await f.manager.update({ projectPath: f.root, action: 'start', endChapter: 1 })
    expect(result.status).toBe('paused')
    expect(result.reason).toContain('同步记忆')
    expect(f.requests).toHaveLength(0)
  })

  test('does not silently accept a damaged project', async () => {
    const f = await fixture()
    await writeFile(join(f.root, '.narracat/state.yaml'), 'structure: [broken]\n')
    await expect(f.manager.update({ projectPath: f.root, action: 'start', endChapter: 1 })).rejects.toThrow()
    expect(f.requests).toHaveLength(0)
  })
})
