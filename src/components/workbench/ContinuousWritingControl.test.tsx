import { describe, expect, test } from 'bun:test'
import { continuousWritingLabel } from './ContinuousWritingControl'
import type { ContinuousWritingPlan } from '@shared/types/continuous-writing'

describe('continuous writing status', () => {
  const plan: ContinuousWritingPlan = { version: 1, projectPath: '/book', threadId: 'novel:book',
    startChapter: 5, nextChapter: 6, endChapter: 10, status: 'running', skipChapterConfirmation: true }

  test('distinguishes waiting, paused, running and complete states', () => {
    expect(continuousWritingLabel(null, false)).toBe('连续写作')
    expect(continuousWritingLabel(plan, false)).toBe('正在写第 6 章 · 至第 10 章')
    expect(continuousWritingLabel(plan, true)).toContain('等待你的回答')
    expect(continuousWritingLabel({ ...plan, status: 'paused' }, true)).toContain('已暂停')
    expect(continuousWritingLabel({ ...plan, status: 'complete' }, false)).toBe('已写到第 10 章')
  })
})
