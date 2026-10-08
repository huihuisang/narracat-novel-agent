import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { PROSE_BLOCK_ID_RE } from '@shared/lib/prose-blocks'
import { defaultWriterPromptSettings, isWriterPromptChange, type WriterPromptChange, type WriterPromptSettings } from '@shared/types/writer-prompts'
import { withJsonFileLock } from '../engine/write-json-atomic'

function settingsPath(projectPath: string): string {
  return join(projectPath, '.narracat', 'writer-prompts.json')
}

export async function readWriterPromptSettings(projectPath?: string): Promise<WriterPromptSettings> {
  if (!projectPath) return defaultWriterPromptSettings()
  let raw: unknown
  try {
    raw = JSON.parse(await readFile(settingsPath(projectPath), 'utf8'))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return defaultWriterPromptSettings()
    throw new Error('本书写手提示词设置无法读取，请检查 writer-prompts.json。')
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const value = raw as Record<string, unknown>
    if (value.version === 1 && typeof value.writerPersonaEnabled === 'boolean' && typeof value.bookPersonaEnabled === 'boolean'
      && (value.bookStyleEnabled === undefined || typeof value.bookStyleEnabled === 'boolean')
      && (value.bookStyleChangedAt === undefined || value.bookStyleChangedAt === null || (typeof value.bookStyleChangedAt === 'string' && Number.isFinite(Date.parse(value.bookStyleChangedAt))))
      && Array.isArray(value.disabledAuthorRequestIds) && value.disabledAuthorRequestIds.every((id) => typeof id === 'string' && id.trim())
      && (value.disabledProseBlockIds === undefined || (Array.isArray(value.disabledProseBlockIds) && value.disabledProseBlockIds.every((id) => typeof id === 'string' && PROSE_BLOCK_ID_RE.test(id))))
      && (value.bookPersonaChangedAt === null || (typeof value.bookPersonaChangedAt === 'string' && Number.isFinite(Date.parse(value.bookPersonaChangedAt))))) {
      // Older v1 files retain their choices and keep book style enabled.
      return { ...value, disabledProseBlockIds: value.disabledProseBlockIds ?? [], bookStyleEnabled: value.bookStyleEnabled ?? true, bookStyleChangedAt: value.bookStyleChangedAt ?? null } as unknown as WriterPromptSettings
    }
  }
  throw new Error('本书写手提示词设置格式无效，请检查 writer-prompts.json。')
}

export async function updateWriterPromptSettings(projectPath: string, change: WriterPromptChange): Promise<WriterPromptSettings> {
  if (!isWriterPromptChange(change)) throw new Error('写手提示词开关参数无效。')
  return withJsonFileLock(settingsPath(projectPath), async (write) => {
    const previous = await readWriterPromptSettings(projectPath)
    const next = { ...previous }
    if (change.kind === 'writer-persona' || (change.kind === 'agent-persona' && change.id === 'writer-persona')) {
      next.writerPersonaEnabled = change.enabled
      next.disabledProseBlockIds = previous.disabledProseBlockIds.filter((id) => id !== 'writer-persona')
    } else if (change.kind === 'agent-persona') {
      next.disabledProseBlockIds = change.enabled
        ? previous.disabledProseBlockIds.filter((id) => id !== change.id)
        : [...new Set([...previous.disabledProseBlockIds, change.id])]
    }
    else if (change.kind === 'book-persona') {
      if (previous.bookPersonaEnabled !== change.enabled) {
        next.bookPersonaEnabled = change.enabled
        next.bookPersonaChangedAt = new Date().toISOString()
      }
    } else if (change.kind === 'book-style') {
      if (previous.bookStyleEnabled !== change.enabled) {
        next.bookStyleEnabled = change.enabled
        next.bookStyleChangedAt = new Date().toISOString()
      }
    } else {
      next.disabledAuthorRequestIds = change.enabled
        ? previous.disabledAuthorRequestIds.filter((id) => id !== change.id)
        : [...new Set([...previous.disabledAuthorRequestIds, change.id])]
    }
    await write(next)
    return next
  })
}
