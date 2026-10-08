import { PROSE_BLOCK_ID_RE } from '@shared/lib/prose-blocks'

export interface WriterPromptSettings {
  version: 1
  writerPersonaEnabled: boolean
  bookPersonaEnabled: boolean
  bookStyleEnabled: boolean
  disabledAuthorRequestIds: string[]
  disabledProseBlockIds: string[]
  bookPersonaChangedAt: string | null
  bookStyleChangedAt: string | null
}

export type WriterPromptChange =
  | { kind: 'writer-persona'; enabled: boolean }
  | { kind: 'agent-persona'; id: string; enabled: boolean }
  | { kind: 'book-persona'; enabled: boolean }
  | { kind: 'book-style'; enabled: boolean }
  | { kind: 'author-request'; id: string; enabled: boolean }

export interface WriterPromptPreview {
  agentId: string
  settings: WriterPromptSettings
  proseBlocks: { id: string; title: string; text: string; origin: 'official' | 'user'; enabled: boolean }[]
  writerPersona: string
  writerPersonaOrigin: 'official' | 'user'
  authorRequests: { id: string; text: string; enabled: boolean }[]
  systemPrompt: string
  bookContext: { chapter: number; persona: string; styleDirective: string } | null
}

export function defaultWriterPromptSettings(): WriterPromptSettings {
  return { version: 1, writerPersonaEnabled: true, bookPersonaEnabled: true, bookStyleEnabled: true, disabledAuthorRequestIds: [], disabledProseBlockIds: [], bookPersonaChangedAt: null, bookStyleChangedAt: null }
}

export function isProseSourceEnabled(settings: WriterPromptSettings, id: string): boolean {
  return (id !== 'writer-persona' || settings.writerPersonaEnabled) && !settings.disabledProseBlockIds.includes(id)
}

export function isWriterPromptChange(value: unknown): value is WriterPromptChange {
  if (!value || typeof value !== 'object') return false
  const input = value as Record<string, unknown>
  if (typeof input.enabled !== 'boolean') return false
  if (input.kind === 'writer-persona' || input.kind === 'book-persona' || input.kind === 'book-style') return true
  if (input.kind === 'agent-persona') return typeof input.id === 'string' && PROSE_BLOCK_ID_RE.test(input.id)
  return input.kind === 'author-request' && typeof input.id === 'string' && input.id.trim().length > 0
}
