import { access, readFile, readdir, realpath, stat } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import { createReadToolDefinition } from '@mariozechner/pi-coding-agent'
import type { ToolDefinition } from '@mariozechner/pi-coding-agent'
import type { WriterPromptSettings } from '@shared/types/writer-prompts'
import { expandLikePi } from './pi-tool-guard'
import { readBookPersona } from '../../../../engine/book-persona'

async function selectedReferencePaths(cwd: string): Promise<Set<string>> {
  const directory = join(cwd, '.narracat/context-packs')
  const files = await readdir(directory).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return []
    throw error
  })
  const paths = new Set<string>()
  for (const file of files.filter((name) => /^ch-\d+\.json$/.test(name))) {
    let pack: Record<string, unknown>
    try { pack = JSON.parse(await readFile(join(directory, file), 'utf8')) } catch (error) {
      if (error instanceof SyntaxError || (error as NodeJS.ErrnoException).code === 'ENOENT') continue
      throw error
    }
    if (!Array.isArray(pack?.craft_pack_hints)) continue
    for (const hint of pack.craft_pack_hints) {
      if (typeof hint?.reference_path !== 'string') continue
      const path = resolve(cwd, hint.reference_path)
      paths.add(await realpath(path).catch(() => path))
    }
  }
  return paths
}

export function createWriterContextReadTool(cwd: string, settings: WriterPromptSettings, agentCorePath?: string, userDataPath?: string): ToolDefinition {
  const normal = createReadToolDefinition(cwd)
  let references: Promise<Set<string>> | undefined
  const filtered = (text: string) => createReadToolDefinition(cwd, {
    operations: {
      access,
      readFile: async () => Buffer.from(text),
    },
  })
  const tool: ReturnType<typeof createReadToolDefinition> = {
    ...normal,
    async execute(id, params, signal, onUpdate, context) {
      // Match canonical paths so aliases cannot bypass filtering or touch another book.
      const file = await realpath(resolve(cwd, expandLikePi(params.path)))
      const root = await realpath(cwd)
      const local = relative(root, file).replaceAll('\\', '/')
      const isContextPack = /^\.narracat\/context-packs\/ch-\d+\.json$/.test(local)
      const contextChangedAt = Math.max(
        settings.bookPersonaChangedAt ? Date.parse(settings.bookPersonaChangedAt) : 0,
        settings.bookStyleChangedAt ? Date.parse(settings.bookStyleChangedAt) : 0,
        settings.craftSourcesChangedAt ? Date.parse(settings.craftSourcesChangedAt) : 0,
      )
      const briefChapter = local.match(/^\.narracat\/staging\/ch-(\d+)\.brief\.md$/)?.[1]
      if (briefChapter) {
        const modifiedAt = (await stat(file)).mtimeMs
        if (contextChangedAt > 0 && modifiedAt < contextChangedAt) {
          throw new Error('本书写法来源选项已更改，请重新读取当前上下文包并重新生成本章任务书，再派发写手。')
        }
        if (agentCorePath && settings.bookPersonaEnabled) {
          const packPath = join(root, '.narracat/context-packs', `ch-${briefChapter}.json`)
          const pack = await readFile(packPath, 'utf8').catch((error: NodeJS.ErrnoException) => {
            if (error.code === 'ENOENT') return null
            throw error
          })
          if (pack) {
            const persona = await readBookPersona({ projectPath: root, agentCorePath, userDataPath, chapter: Number(briefChapter), pack: JSON.parse(pack) })
            if (persona.changed || (persona.sourceModifiedAt !== undefined && modifiedAt < persona.sourceModifiedAt)) {
              throw new Error('本书声音卡已更新，请重新生成本章上下文和任务书，再派发写手。')
            }
          }
        }
      }
      if (agentCorePath && !settings.craftLibraryEnabled) {
        const library = await realpath(join(agentCorePath, 'skills/novel-web-craft/SKILL.md'))
        if (file === library) return filtered('本书已关闭网文写作手艺，跳过此来源，不向章节任务书添加其写法要求。').execute(id, { ...params, path: file }, signal, onUpdate, context)
      }
      if (!settings.craftReferencesEnabled && !isContextPack && (await (references ??= selectedReferencePaths(root))).has(file)) {
        return filtered('本书已关闭选中的写法参考，跳过此来源，不向章节任务书添加其写法要求。').execute(id, { ...params, path: file }, signal, onUpdate, context)
      }
      if (isContextPack) {
        // A rebuilt pack can select new files during this run.
        references = undefined
        const pack = JSON.parse(await readFile(file, 'utf8')) as Record<string, unknown>
        const delivered = { ...pack }
        if (!settings.bookPersonaEnabled) {
          delete delivered.persona
          delete delivered.persona_source
        } else if (agentCorePath) {
          const persona = await readBookPersona({ projectPath: root, agentCorePath, userDataPath, chapter: Number(local.match(/ch-(\d+)/)?.[1]), pack })
          if (typeof pack.persona === 'string') delivered.persona = persona.body
        }
        delete delivered.persona_source
        if (!settings.bookStyleEnabled) {
          delete delivered.style_directive
          delete delivered.style_examples
        }
        if (!settings.craftReferencesEnabled) delete delivered.craft_pack_hints
        const unchanged = JSON.stringify(delivered) === JSON.stringify(pack)
        if (unchanged) return normal.execute(id, params, signal, onUpdate, context)
        return filtered(JSON.stringify(delivered, null, 2)).execute(id, { ...params, path: file }, signal, onUpdate, context)
      }
      return normal.execute(id, params, signal, onUpdate, context)
    },
  }
  return tool as ToolDefinition
}
