import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defaultWriterPromptSettings } from '@shared/types/writer-prompts'
import { createWriterContextReadTool } from './pi-writer-context'

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
