import { readFile, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { parseProseBlocks } from '@shared/lib/prose-blocks'
import { isProseSourceEnabled, type WriterPromptPreview, type WriterPromptSettings } from '@shared/types/writer-prompts'
import type { ProseOverrideEntry } from '@shared/types/prose-block'
import { readWriterPromptSettings } from '../novel/writer-prompts'
import { assembleAgentSkills, type AssembledAgentDefinition } from './assemble-agent-skills'
import { authorRequestStorePath, listAuthorRequests } from './author-request-store'
import { proseOverrideStorePath, readProseOverrides } from './prose-override-store'
import { NARRACAT_ENGINE_AGENT_IDS } from './agent-core-contract'
import { readOfficialSkillBody } from './official-skill-body'
import { readBookPersona } from './book-persona'

export interface WriterPromptInput {
  projectPath: string
  agentCorePath: string
  userDataPath?: string
  settings?: WriterPromptSettings
  agentId?: string
}

export async function resolveAgentPrompt(input: WriterPromptInput): Promise<Omit<WriterPromptPreview, 'systemPrompt' | 'bookContext' | 'craftLibrary'> & { definition: AssembledAgentDefinition }> {
  const agentId = input.agentId ?? 'chapter-writer'
  if (!(NARRACAT_ENGINE_AGENT_IDS as readonly string[]).includes(agentId)) throw new Error('Agent 档案不存在。')
  const [settings, overrides, requests, source] = await Promise.all([
    input.settings ? Promise.resolve(input.settings) : readWriterPromptSettings(input.projectPath),
    input.userDataPath ? readProseOverrides(proseOverrideStorePath(input.userDataPath)) : Promise.resolve<Record<string, ProseOverrideEntry>>({}),
    input.userDataPath ? listAuthorRequests(authorRequestStorePath(input.userDataPath)) : Promise.resolve([]),
    readFile(join(input.agentCorePath, `agents/${agentId}.md`), 'utf8'),
  ])
  const blocks = parseProseBlocks(source)
  const proseBlocks = blocks.map((block) => ({
    id: block.id, title: block.title, text: overrides[block.id]?.text ?? block.body,
    origin: overrides[block.id] ? 'user' as const : 'official' as const,
    enabled: isProseSourceEnabled(settings, block.id),
  }))
  const effectiveOverrides = { ...overrides }
  for (const block of blocks) {
    const text = isProseSourceEnabled(settings, block.id) ? overrides[block.id]?.text ?? block.body : ''
    effectiveOverrides[block.id] = { text, baseText: block.body, baseEngineVersion: '', updatedAt: '' }
  }
  const authorRequests = requests.filter((request) => request.agentId === agentId).map((request) => ({
    id: request.id, text: request.text, enabled: !settings.disabledAuthorRequestIds.includes(request.id),
  }))
  const definitions = await assembleAgentSkills({
    agentCorePath: input.agentCorePath,
    agentIds: [agentId],
    proseOverrides: effectiveOverrides,
    authorRequestsByAgent: { [agentId]: authorRequests.filter((request) => request.enabled).map((request) => request.text) },
  })
  const definition = definitions[agentId]
  if (!definition) throw new Error('Agent 提示词无法组装，请检查 Agent Core。')
  return { agentId, settings, proseBlocks, writerPersona: proseBlocks[0]?.text ?? '', writerPersonaOrigin: proseBlocks[0]?.origin ?? 'official', authorRequests, definition }
}

export function resolveWriterPrompt(input: WriterPromptInput) {
  return resolveAgentPrompt({ ...input, agentId: 'chapter-writer' })
}

export async function resolveBookAgentOverrides(input: WriterPromptInput): Promise<Record<string, AssembledAgentDefinition>> {
  const resolved = await Promise.all(NARRACAT_ENGINE_AGENT_IDS.map((agentId) => resolveAgentPrompt({ ...input, agentId })))
  return Object.fromEntries(resolved.map((item) => [item.agentId, item.definition]))
}

async function readLatestBookContext(input: WriterPromptInput): Promise<WriterPromptPreview['bookContext']> {
  const { projectPath } = input
  const directory = join(projectPath, '.narracat/context-packs')
  let files: string[]
  try {
    files = await readdir(directory)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
  const candidates = await Promise.all(files.filter((file) => /^ch-\d+\.json$/.test(file)).map(async (file) => ({ file, modifiedAt: (await stat(join(directory, file))).mtimeMs })))
  const latest = candidates.sort((a, b) => b.modifiedAt - a.modifiedAt)[0]
  if (!latest) return null
  const pack = JSON.parse(await readFile(join(directory, latest.file), 'utf8')) as Record<string, unknown>
  const chapter = Number(latest.file.match(/\d+/)?.[0])
  let persona = ''
  let personaError: string | undefined
  try {
    persona = (await readBookPersona({ ...input, chapter, pack })).body
  } catch (error) {
    personaError = error instanceof Error ? error.message : '声音卡无法读取，请检查来源。'
  }
  return {
    chapter,
    persona,
    ...(personaError ? { personaError } : {}),
    styleDirective: typeof pack.style_directive === 'string' ? pack.style_directive : '',
    craftReferences: Array.isArray(pack.craft_pack_hints) ? pack.craft_pack_hints.flatMap((hint: unknown) => {
      if (!hint || typeof hint !== 'object') return []
      const reason = (hint as Record<string, unknown>).reason
      return typeof reason === 'string' && reason.trim() ? [reason] : []
    }) : [],
  }
}

export async function getWriterPromptPreview(input: WriterPromptInput): Promise<WriterPromptPreview> {
  const isWriter = (input.agentId ?? 'chapter-writer') === 'chapter-writer'
  const [resolved, bookContext, craftLibrary] = await Promise.all([resolveAgentPrompt(input), isWriter ? readLatestBookContext(input) : Promise.resolve(null), isWriter ? readOfficialSkillBody({ agentCorePath: input.agentCorePath, skillId: 'novel-web-craft' }) : Promise.resolve('')])
  const { definition, ...sources } = resolved
  return { ...sources, systemPrompt: definition.prompt, bookContext, craftLibrary }
}
