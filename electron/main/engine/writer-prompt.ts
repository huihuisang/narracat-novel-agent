import { readFile, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { parseProseBlocks } from '@shared/lib/prose-blocks'
import type { WriterPromptPreview, WriterPromptSettings } from '@shared/types/writer-prompts'
import type { ProseOverrideEntry } from '@shared/types/prose-block'
import { readWriterPromptSettings } from '../novel/writer-prompts'
import { assembleAgentSkills, type AssembledAgentDefinition } from './assemble-agent-skills'
import { authorRequestStorePath, listAuthorRequests } from './author-request-store'
import { proseOverrideStorePath, readProseOverrides } from './prose-override-store'

export interface WriterPromptInput {
  projectPath: string
  agentCorePath: string
  userDataPath?: string
  settings?: WriterPromptSettings
}

export async function resolveWriterPrompt(input: WriterPromptInput): Promise<Omit<WriterPromptPreview, 'systemPrompt' | 'bookContext'> & { definition: AssembledAgentDefinition }> {
  const [settings, overrides, requests, source] = await Promise.all([
    input.settings ? Promise.resolve(input.settings) : readWriterPromptSettings(input.projectPath),
    input.userDataPath ? readProseOverrides(proseOverrideStorePath(input.userDataPath)) : Promise.resolve<Record<string, ProseOverrideEntry>>({}),
    input.userDataPath ? listAuthorRequests(authorRequestStorePath(input.userDataPath)) : Promise.resolve([]),
    readFile(join(input.agentCorePath, 'agents/chapter-writer.md'), 'utf8'),
  ])
  const block = parseProseBlocks(source).find((item) => item.id === 'writer-persona')
  if (!block) throw new Error('写手人设定义缺失，请检查 Agent Core。')
  const custom = overrides['writer-persona']
  const writerPersona = custom?.text ?? block.body
  const authorRequests = requests.filter((request) => request.agentId === 'chapter-writer').map((request) => ({
    id: request.id, text: request.text, enabled: !settings.disabledAuthorRequestIds.includes(request.id),
  }))
  const definitions = await assembleAgentSkills({
    agentCorePath: input.agentCorePath,
    agentIds: ['chapter-writer'],
    proseOverrides: {
      ...overrides,
      'writer-persona': { text: settings.writerPersonaEnabled ? writerPersona : '', baseText: block.body, baseEngineVersion: '', updatedAt: '' },
    },
    authorRequestsByAgent: { 'chapter-writer': authorRequests.filter((request) => request.enabled).map((request) => request.text) },
  })
  const definition = definitions['chapter-writer']
  if (!definition) throw new Error('写手提示词无法组装，请检查 Agent Core。')
  return { settings, writerPersona, writerPersonaOrigin: custom ? 'user' : 'official', authorRequests, definition }
}

async function readLatestBookContext(projectPath: string): Promise<WriterPromptPreview['bookContext']> {
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
  return {
    chapter: Number(latest.file.match(/\d+/)?.[0]),
    persona: typeof pack.persona === 'string' ? pack.persona : '',
    styleDirective: typeof pack.style_directive === 'string' ? pack.style_directive : '',
  }
}

export async function getWriterPromptPreview(input: WriterPromptInput): Promise<WriterPromptPreview> {
  const [resolved, bookContext] = await Promise.all([resolveWriterPrompt(input), readLatestBookContext(input.projectPath)])
  const { definition, ...sources } = resolved
  return { ...sources, systemPrompt: definition.prompt, bookContext }
}
