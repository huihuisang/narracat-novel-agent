import { ipcMain } from 'electron'
import { isWriterPromptChange, type WriterPromptPreview } from '@shared/types/writer-prompts'
import { getWriterPromptPreview } from '../engine/writer-prompt'
import { updateWriterPromptSettings } from '../novel/writer-prompts'
import { loadNovelProjectSummary } from '../novel/novel-project'
import { currentAgentCorePath } from './app'
import { invalidateAgentSessions } from './agent'
import { readInputRecord, readRequiredString, userDataPath } from './inputs'

async function projectInput(input: unknown): Promise<{ projectPath: string; value: Record<string, unknown> }> {
  const value = readInputRecord(input, '写手提示词参数无效。')
  const projectPath = readRequiredString(value, 'projectPath', '缺少小说项目路径。')
  const summary = await loadNovelProjectSummary(projectPath)
  if (!summary.id) throw new Error('小说项目无法读取，请重新打开项目。')
  return { projectPath, value }
}

function preview(projectPath: string): Promise<WriterPromptPreview> {
  return getWriterPromptPreview({ projectPath, agentCorePath: currentAgentCorePath(), userDataPath: userDataPath() })
}

export function registerWriterPromptsIpcHandlers(): void {
  ipcMain.handle('writer-prompts:get', async (_event, input: unknown) => {
    const { projectPath } = await projectInput(input)
    return preview(projectPath)
  })
  ipcMain.handle('writer-prompts:set', async (_event, input: unknown) => {
    const { projectPath, value } = await projectInput(input)
    if (!isWriterPromptChange(value.change)) throw new Error('写手提示词开关参数无效。')
    await updateWriterPromptSettings(projectPath, value.change)
    // Invalidate cached history without aborting the run already in progress.
    await invalidateAgentSessions('writer-prompts-changed')
    return preview(projectPath)
  })
}
