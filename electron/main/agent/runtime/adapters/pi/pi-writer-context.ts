import { access, readFile, realpath, stat } from 'node:fs/promises'
import { relative, resolve } from 'node:path'
import { createReadToolDefinition } from '@mariozechner/pi-coding-agent'
import type { ToolDefinition } from '@mariozechner/pi-coding-agent'
import type { WriterPromptSettings } from '@shared/types/writer-prompts'
import { expandLikePi } from './pi-tool-guard'

export function createWriterContextReadTool(cwd: string, settings: WriterPromptSettings): ToolDefinition {
  const normal = createReadToolDefinition(cwd)
  const filtered = createReadToolDefinition(cwd, {
    operations: {
      access,
      async readFile(file) {
        const pack = JSON.parse(await readFile(file, 'utf8')) as Record<string, unknown>
        const context = { ...pack }
        if (!settings.bookPersonaEnabled) delete context.persona
        if (!settings.bookStyleEnabled) {
          delete context.style_directive
          delete context.style_examples
        }
        return Buffer.from(JSON.stringify(context, null, 2))
      },
    },
  })
  const tool: ReturnType<typeof createReadToolDefinition> = {
    ...normal,
    async execute(id, params, signal, onUpdate, context) {
      // Match canonical paths so aliases cannot bypass filtering or touch another book.
      const file = await realpath(resolve(cwd, expandLikePi(params.path)))
      const root = await realpath(cwd)
      const local = relative(root, file).replaceAll('\\', '/')
      const contextChangedAt = Math.max(
        settings.bookPersonaChangedAt ? Date.parse(settings.bookPersonaChangedAt) : 0,
        settings.bookStyleChangedAt ? Date.parse(settings.bookStyleChangedAt) : 0,
      )
      if (/^\.narracat\/staging\/ch-\d+\.brief\.md$/.test(local) && contextChangedAt > 0) {
        if ((await stat(file)).mtimeMs < contextChangedAt) {
          throw new Error('本书写法来源选项已更改，请重新读取当前上下文包并重新生成本章任务书，再派发写手。')
        }
      }
      if ((!settings.bookPersonaEnabled || !settings.bookStyleEnabled) && /^\.narracat\/context-packs\/ch-\d+\.json$/.test(local)) {
        return filtered.execute(id, { ...params, path: file }, signal, onUpdate, context)
      }
      return normal.execute(id, params, signal, onUpdate, context)
    },
  }
  return tool as ToolDefinition
}
