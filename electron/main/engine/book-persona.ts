import { access } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { userPacksDir } from '../packs/pack-store'

interface ContextPersona {
  body: string
  changed: boolean
  sourceModifiedAt?: number
}

interface ContextPersonaModule {
  resolveContextPersona(input: {
    projectRoot: string
    chapter: number
    pack: Record<string, unknown>
    builtinPacksDir: string
    userPacksDir?: string
  }): ContextPersona
}

export async function readBookPersona(input: {
  projectPath: string
  agentCorePath: string
  userDataPath?: string
  chapter: number
  pack: Record<string, unknown>
}): Promise<ContextPersona> {
  const snapshot = typeof input.pack.persona === 'string' ? input.pack.persona : ''
  if (!snapshot.trim()) return { body: snapshot, changed: false }
  if (input.pack.persona_source === undefined) {
    const receipt = join(input.projectPath, '.narracat/capability-receipts', `ch-${String(input.chapter).padStart(3, '0')}.json`)
    try { await access(receipt) } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { body: snapshot, changed: false }
      throw error
    }
  }
  // The engine owns pack resolution; the App does not keep a second card registry.
  const entry = join(input.agentCorePath, 'mcp-server/dist/context-persona.js')
  const engine = await import(pathToFileURL(entry).href) as ContextPersonaModule
  return engine.resolveContextPersona({
    projectRoot: input.projectPath, chapter: input.chapter, pack: input.pack,
    builtinPacksDir: join(input.agentCorePath, 'packs'),
    userPacksDir: input.userDataPath ? userPacksDir(input.userDataPath) : undefined,
  })
}
