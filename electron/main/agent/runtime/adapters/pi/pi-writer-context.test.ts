import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { defaultWriterPromptSettings } from '@shared/types/writer-prompts'
import { createWriterContextReadTool } from './pi-writer-context'
import { createPersonaFixture } from '../../../../engine/test-persona-fixture'

const roots: string[] = []
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))) })
async function workspace() {
  const root = await mkdtemp(join(tmpdir(), 'writer-context-'))
  roots.push(root)
  await mkdir(join(root, '.narracat/context-packs'), { recursive: true })
  await mkdir(join(root, '.narracat/staging'), { recursive: true })
  return root
}

describe('writer context delivery', () => {
  test('enabled voice reads the source before pagination and through an alias', async () => {
    const fixture = await createPersonaFixture()
    roots.push(fixture.root)
    await writeFile(fixture.pack, JSON.stringify({ persona: 'Old book voice', chapter_outline: 'Plot facts', persona_source: {
      card_id: 'voice', pack_id: 'official-base', pack_version: '0.9.0', origin: 'official',
      body_sha256: createHash('sha256').update('Old book voice').digest('hex'),
    } }))
    const stored = await readFile(fixture.pack, 'utf8')
    const alias = join(fixture.project, 'pack-alias.json')
    await symlink(fixture.pack, alias)
    const tool = createWriterContextReadTool(fixture.project, defaultWriterPromptSettings(), fixture.core, fixture.userData)
    const text = async (path: string, limit?: number) => {
      const result = await tool.execute('r1', { path, limit }, undefined, undefined, {} as never)
      return result.content.map((part) => part.type === 'text' ? part.text : '').join('')
    }
    expect(await text(alias)).toContain('Live book voice')
    expect(await text(alias)).not.toContain('Old book voice')
    expect(await text(alias)).not.toContain('persona_source')
    await writeFile(fixture.source, 'Next book voice')
    expect(await text(fixture.pack, 2)).toContain('Next book voice')
    expect(await text(fixture.pack)).toContain('Plot facts')
    expect(await readFile(fixture.pack, 'utf8')).toBe(stored)
  })

  test('disabled voice does not resolve a missing source and removes provenance', async () => {
    const fixture = await createPersonaFixture()
    roots.push(fixture.root)
    await rm(fixture.source)
    await writeFile(fixture.pack, JSON.stringify({ persona: 'Old book voice', persona_source: { card_id: 'voice' }, chapter_outline: 'Plot facts' }))
    const tool = createWriterContextReadTool(fixture.project, { ...defaultWriterPromptSettings(), bookPersonaEnabled: false }, fixture.core, fixture.userData)
    const result = await tool.execute('r1', { path: fixture.pack }, undefined, undefined, {} as never)
    const text = result.content.map((part) => part.type === 'text' ? part.text : '').join('')
    expect(text).not.toContain('persona')
    expect(text).toContain('Plot facts')
  })

  test('rejects a brief while its source has changed since context generation', async () => {
    const fixture = await createPersonaFixture()
    roots.push(fixture.root)
    const brief = join(fixture.project, '.narracat/staging/ch-003.brief.md')
    await writeFile(brief, 'Old compressed voice')
    const tool = createWriterContextReadTool(fixture.project, defaultWriterPromptSettings(), fixture.core, fixture.userData)
    await expect(tool.execute('r1', { path: brief }, undefined, undefined, {} as never)).rejects.toThrow('重新生成')
    await writeFile(fixture.pack, JSON.stringify({ persona: 'Live book voice', chapter_outline: 'Plot facts' }))
    await writeFile(brief, 'Fresh brief')
    const result = await tool.execute('r2', { path: brief }, undefined, undefined, {} as never)
    expect(result.content).toContainEqual({ type: 'text', text: 'Fresh brief' })
  })

  test('craft library and selected references are independent, including canonical aliases', async () => {
    const root = await workspace()
    const core = await workspace()
    const library = join(core, 'skills/novel-web-craft/SKILL.md')
    const reference = join(core, 'custom-craft.md')
    await mkdir(join(core, 'skills/novel-web-craft'), { recursive: true })
    await writeFile(library, 'Library principle')
    await writeFile(reference, 'Selected craft principle')
    await symlink(library, join(root, 'library-alias.md'))
    await symlink(reference, join(root, 'reference-alias.md'))
    const file = join(root, '.narracat/context-packs/ch-001.json')
    const pack = { craft_pack_hints: [{ reference_path: reference }], persona: 'Voice', style_directive: 'Style', chapter_outline: 'Plot' }
    await writeFile(file, JSON.stringify(pack))
    const text = async (tool: ReturnType<typeof createWriterContextReadTool>, path: string) => {
      const result = await tool.execute('r1', { path }, undefined, undefined, {} as never)
      return result.content.map((part) => part.type === 'text' ? part.text : '').join('')
    }
    const noLibrary = createWriterContextReadTool(root, { ...defaultWriterPromptSettings(), craftLibraryEnabled: false }, core)
    expect(await text(noLibrary, join(root, 'library-alias.md'))).not.toContain('Library principle')
    expect(await text(noLibrary, reference)).toContain('Selected craft principle')
    expect(await text(noLibrary, file)).toContain('craft_pack_hints')
    const noReferences = createWriterContextReadTool(root, { ...defaultWriterPromptSettings(), craftReferencesEnabled: false }, core)
    expect(await text(noReferences, library)).toContain('Library principle')
    expect(await text(noReferences, join(root, 'reference-alias.md'))).not.toContain('Selected craft principle')
    const context = await text(noReferences, file)
    expect(context).not.toContain('craft_pack_hints')
    for (const value of ['Voice', 'Style', 'Plot']) expect(context).toContain(value)
    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual(pack)
  })

  test('craft switches invalidate old briefs even when the sources are re-enabled', async () => {
    const root = await workspace()
    const file = join(root, '.narracat/staging/ch-001.brief.md')
    await writeFile(file, 'Old craft requirements')
    const tool = createWriterContextReadTool(root, { ...defaultWriterPromptSettings(), craftSourcesChangedAt: new Date(Date.now() + 10000).toISOString() })
    await expect(tool.execute('r1', { path: file }, undefined, undefined, {} as never)).rejects.toThrow('重新生成')
  })

  test('a newly rebuilt pack refreshes blocked reference paths without changing source files', async () => {
    const root = await workspace()
    const first = join(root, 'first.md')
    const next = join(root, 'next.md')
    await writeFile(first, 'First reference')
    await writeFile(next, 'New reference')
    const pack = join(root, '.narracat/context-packs/ch-001.json')
    await writeFile(pack, JSON.stringify({ craft_pack_hints: [{ reference_path: first }] }))
    const tool = createWriterContextReadTool(root, { ...defaultWriterPromptSettings(), craftReferencesEnabled: false })
    await tool.execute('r1', { path: first }, undefined, undefined, {} as never)
    await writeFile(pack, JSON.stringify({ craft_pack_hints: [{ reference_path: next }] }))
    await tool.execute('r2', { path: pack }, undefined, undefined, {} as never)
    const result = await tool.execute('r3', { path: next }, undefined, undefined, {} as never)
    expect(result.content.map((part) => part.type === 'text' ? part.text : '').join('')).not.toContain('New reference')
    expect(await readFile(next, 'utf8')).toBe('New reference')
  })

  test('disabled book style removes its directive and samples but preserves voice and plot', async () => {
    const root = await workspace()
    const file = join(root, '.narracat/context-packs/ch-001.json')
    const pack = { persona: 'Enabled voice', style_directive: 'Disabled style', style_examples: ['Disabled sample'], chapter_outline: 'Plot facts' }
    await writeFile(file, JSON.stringify(pack, null, 2))
    const tool = createWriterContextReadTool(root, { ...defaultWriterPromptSettings(), bookStyleEnabled: false })
    const result = await tool.execute('r1', { path: file }, undefined, undefined, {} as never)
    const text = result.content.map((part) => part.type === 'text' ? part.text : '').join('')
    expect(text).not.toContain('Disabled style')
    expect(text).not.toContain('Disabled sample')
    expect(text).toContain('Enabled voice')
    expect(text).toContain('Plot facts')
    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual(pack)
  })

  test('a brief from before a style switch must also be rebuilt', async () => {
    const root = await workspace()
    const file = join(root, '.narracat/staging/ch-001.brief.md')
    await writeFile(file, 'Old compressed style')
    const tool = createWriterContextReadTool(root, { ...defaultWriterPromptSettings(), bookStyleChangedAt: new Date(Date.now() + 10000).toISOString() })
    await expect(tool.execute('r1', { path: file }, undefined, undefined, {} as never)).rejects.toThrow('重新生成')
  })

  test('filters the full context pack before pagination and does not alter the stored source', async () => {
    const root = await workspace()
    const file = join(root, '.narracat/context-packs/ch-001.json')
    const pack = { persona: 'Disabled book voice', style_directive: 'Book style', character_cards: ['Plot facts'] }
    await writeFile(file, JSON.stringify(pack, null, 2))
    const tool = createWriterContextReadTool(root, { ...defaultWriterPromptSettings(), bookPersonaEnabled: false })
    const result = await tool.execute('r1', { path: file }, undefined, undefined, {} as never)
    const text = result.content.map((part) => part.type === 'text' ? part.text : '').join('')
    expect(text).not.toContain('Disabled book voice')
    expect(text).not.toContain('"persona"')
    expect(text).toContain('Book style')
    expect(text).toContain('Plot facts')
    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual(pack)
  })

  test('enabled voice and unrelated files keep their content', async () => {
    const root = await workspace()
    const file = join(root, '.narracat/context-packs/ch-001.json')
    await writeFile(file, JSON.stringify({ persona: 'Book voice' }))
    const tool = createWriterContextReadTool(root, defaultWriterPromptSettings())
    const result = await tool.execute('r1', { path: file }, undefined, undefined, {} as never)
    expect(result.content).toContainEqual({ type: 'text', text: '{"persona":"Book voice"}' })
  })

  test('a brief from before a voice switch must be rebuilt', async () => {
    const root = await workspace()
    const file = join(root, '.narracat/staging/ch-001.brief.md')
    await writeFile(file, 'Old compressed voice')
    const tool = createWriterContextReadTool(root, { ...defaultWriterPromptSettings(), bookPersonaChangedAt: new Date(Date.now() + 10000).toISOString() })
    await expect(tool.execute('r1', { path: file }, undefined, undefined, {} as never)).rejects.toThrow('重新生成')
  })
})
