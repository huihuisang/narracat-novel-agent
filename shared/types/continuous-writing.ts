export interface ContinuousWritingPlan {
  version: 1
  projectPath: string
  threadId: string
  startChapter: number
  nextChapter: number
  endChapter: number
  status: 'running' | 'paused' | 'complete'
  skipChapterConfirmation: boolean
  runId?: string
  reason?: string
}

export interface ContinuousWritingInput {
  projectPath: string
  action: 'start' | 'pause' | 'resume'
  endChapter?: number
  skipChapterConfirmation?: boolean
}
