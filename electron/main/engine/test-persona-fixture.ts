import { mkdir, mkdtemp, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

export async function createPersonaFixture() {
  const root = await mkdtemp(join(tmpdir(), 'live-persona-'))
  const core = join(root, 'core')
  const project = join(root, 'novel')
  const userData = join(root, 'user')
  for (const dir of [join(core, 'mcp-server'), join(core, 'packs/official-base/cards'), join(project, '.narracat/context-packs'), join(project, '.narracat/capability-receipts'), join(project, '.narracat/staging')]) await mkdir(dir, { recursive: true })
  await symlink(resolve('agent-core/narracat/mcp-server/dist'), join(core, 'mcp-server/dist'))
  await writeFile(join(core, 'packs/official-base/pack.json'), JSON.stringify({
    pack_format_version: 1, id: 'official-base', name: 'Voice', author: 'Tester', version: '1.0.0',
    cards: [{ type: 'persona', id: 'voice', name: 'Voice', path: 'cards/voice.md', keywords: ['voice'] }],
  }))
  const source = join(core, 'packs/official-base/cards/voice.md')
  const pack = join(project, '.narracat/context-packs/ch-003.json')
  await writeFile(source, 'Live book voice')
  await writeFile(pack, JSON.stringify({ persona: 'Old book voice', chapter_outline: 'Plot facts' }))
  await writeFile(join(project, '.narracat/capability-receipts/ch-003.json'), JSON.stringify({ chapter: 3, entries: [{ type: 'persona', card_id: 'voice', pack_id: 'official-base', pack_version: '0.9.0', origin: 'official' }] }))
  return { root, core, project, userData, source, pack }
}
