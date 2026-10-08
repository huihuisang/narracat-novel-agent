import { ipcMain } from 'electron'
import { isWriterPromptChange, type WriterPromptPreview } from '@shared/types/writer-prompts'
import { getWriterPromptPreview } from '../engine/writer-prompt'
import { updateWriterPromptSettings } from '../novel/writer-prompts'
import { loadNovelProjectSummary } from '../novel/novel-project'
import { currentAgentCorePath } from './app'
import { invalidateAgentSessions } from './agent'
import { readInputRecord, readRequiredString, userDataPath } from './inputs'
import { isKnownProseAgentId } from './prose-blocks'

async function projectInput(input: unknown): Promise<{ projectPath: string; value: Record<string, unknown> }> {
  const value = readInputRecord(input, '写手提示词参数无效。')
  const projectPath = readRequiredString(value, 'projectPath', '缺少小说项目路径。')
  const summary = await loadNovelProjectSummary(projectPath)
  if (!summary.id) throw new Error('小说项目无法读取，请重新打开项目。')
  return { projectPath, value }
}

function agentInput(value: Record<string, unknown>): string {
  const agentId = value.agentId === undefined ? 'chapter-writer' : readRequiredString(value, 'agentId', '缺少 Agent。')
  if (!isKnownProseAgentId(agentId)) throw new Error('Agent 档案不存在。')
  return agentId
}

function preview(projectPath: string, agentId: string): Promise<WriterPromptPreview> {
  return getWriterPromptPreview({ projectPath, agentId, agentCorePath: currentAgentCorePath(), userDataPath: userDataPath() })
}

export function registerWriterPromptsIpcHandlers(): void {
  ipcMain.handle('writer-prompts:get', async (_event, input: unknown) => {
    const { projectPath, value } = await projectInput(input)
    return preview(projectPath, agentInput(value))
  })
  ipcMain.handle('writer-prompts:set', async (_event, input: unknown) => {
    const { projectPath, value } = await projectInput(input)
    const agentId = agentInput(value)
    if (!isWriterPromptChange(value.change)) throw new Error('写手提示词开关参数无效。')
    const current = await preview(projectPath, agentId)
    const change = value.change
    if (change.kind === 'agent-persona' && !current.proseBlocks.some((block) => block.id === change.id)) throw new Error('该人设不属于当前 Agent。')
    if (change.kind === 'author-request' && !current.authorRequests.some((request) => request.id === change.id)) throw new Error('该要求不属于当前 Agent。')
    if (agentId !== 'chapter-writer' && ['writer-persona', 'book-persona', 'book-style'].includes(change.kind)) throw new Error('声音卡和书级文风属于章节写手。')
    await updateWriterPromptSettings(projectPath, value.change)
    // Invalidate cached history without aborting the run already in progress.
    await invalidateAgentSessions('writer-prompts-changed')
    return preview(projectPath, agentId)
  })
}
