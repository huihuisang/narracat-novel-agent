import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defaultWriterPromptSettings } from '@shared/types/writer-prompts'
import { readWriterPromptSettings, updateWriterPromptSettings } from './writer-prompts'
import { resolveAgentPrompt, resolveWriterPrompt } from '../engine/writer-prompt'

const roots: string[] = []
async function workspace() {
  const root = await mkdtemp(join(tmpdir(), 'writer-prompts-'))
  roots.push(root)
  return root
}
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('per-book writer prompt sources', () => {
  test('other agent personas persist independently and preserve legacy writer choices', async () => {
    const root = await workspace()
    await updateWriterPromptSettings(root, { kind: 'writer-persona', enabled: false })
    await updateWriterPromptSettings(root, { kind: 'agent-persona', id: 'world-curator-persona', enabled: false })
    expect(await readWriterPromptSettings(root)).toMatchObject({ writerPersonaEnabled: false, disabledProseBlockIds: ['world-curator-persona'] })
    await updateWriterPromptSettings(root, { kind: 'agent-persona', id: 'world-curator-persona', enabled: true })
    expect(await readWriterPromptSettings(root)).toMatchObject({ writerPersonaEnabled: false, disabledProseBlockIds: [] })
    await updateWriterPromptSettings(root, { kind: 'agent-persona', id: 'writer-persona', enabled: true })
    expect((await readWriterPromptSettings(root)).writerPersonaEnabled).toBe(true)
  })

  test('selected agent previews use the same filtered sources as runtime assembly', async () => {
    const root = await workspace()
    const userData = await workspace()
    const engine = await workspace()
    await mkdir(join(engine, 'agents'))
    await writeFile(join(engine, 'agents/world-curator.md'), '---\ndescription: Curator\ntools: Read, Write\n---\n<!-- narracat:prose id="world-curator-persona" title="Curator persona" -->\nOfficial curator persona\n<!-- /narracat:prose -->\nKeep world rules')
    await writeFile(join(userData, 'prose-overrides.json'), JSON.stringify({ version: 1, overrides: { 'world-curator-persona': { text: 'Custom curator persona', baseText: 'Official curator persona' } } }))
    await writeFile(join(userData, 'author-requests.json'), JSON.stringify({ requests: [
      { id: 'a', agentId: 'world-curator', text: 'Keep curator request' },
      { id: 'b', agentId: 'world-curator', text: 'Disable curator request' },
      { id: 'c', agentId: 'chapter-writer', text: 'Writer request' },
    ] }))
    await updateWriterPromptSettings(root, { kind: 'agent-persona', id: 'world-curator-persona', enabled: false })
    await updateWriterPromptSettings(root, { kind: 'author-request', id: 'b', enabled: false })
    const result = await resolveAgentPrompt({ projectPath: root, userDataPath: userData, agentCorePath: engine, agentId: 'world-curator' })
    expect(result.agentId).toBe('world-curator')
    expect(result.proseBlocks[0]).toMatchObject({ id: 'world-curator-persona', text: 'Custom curator persona', enabled: false })
    expect(result.definition.prompt).toContain('Keep world rules')
    expect(result.definition.prompt).toContain('Keep curator request')
    for (const text of ['Custom curator persona', 'Official curator persona', 'Disable curator request', 'Writer request']) expect(result.definition.prompt).not.toContain(text)
    await expect(resolveAgentPrompt({ projectPath: root, agentCorePath: engine, agentId: '../world-curator' })).rejects.toThrow()
  })

  test('missing settings preserve all current sources', async () => {
    expect(await readWriterPromptSettings(await workspace())).toEqual(defaultWriterPromptSettings())
  })

  test('book style has an independent durable switch and a brief invalidation time', async () => {
    const root = await workspace()
    await updateWriterPromptSettings(root, { kind: 'book-style', enabled: false })
    const settings = await readWriterPromptSettings(root)
    expect(settings.bookStyleEnabled).toBe(false)
    expect(settings.bookPersonaEnabled).toBe(true)
    expect(settings.bookStyleChangedAt).not.toBeNull()
    await updateWriterPromptSettings(root, { kind: 'book-style', enabled: true })
    expect((await readWriterPromptSettings(root)).bookStyleEnabled).toBe(true)
  })

  test('previous settings keep their choices and enable book style by default', async () => {
    const root = await workspace()
    await mkdir(join(root, '.narracat'))
    await writeFile(join(root, '.narracat/writer-prompts.json'), JSON.stringify({ version: 1, writerPersonaEnabled: false, bookPersonaEnabled: false, disabledAuthorRequestIds: ['a'], bookPersonaChangedAt: null }))
    expect(await readWriterPromptSettings(root)).toMatchObject({ writerPersonaEnabled: false, bookPersonaEnabled: false, disabledAuthorRequestIds: ['a'], bookStyleEnabled: true, bookStyleChangedAt: null })
  })

  test('switches persist per book and retain disabled requirement ids', async () => {
    const first = await workspace()
    const second = await workspace()
    await updateWriterPromptSettings(first, { kind: 'writer-persona', enabled: false })
    await updateWriterPromptSettings(first, { kind: 'author-request', id: 'one', enabled: false })
    expect(await readWriterPromptSettings(first)).toMatchObject({ writerPersonaEnabled: false, disabledAuthorRequestIds: ['one'] })
    expect(await readWriterPromptSettings(second)).toEqual(defaultWriterPromptSettings())
  })

  test('concurrent source changes do not erase each other', async () => {
    const root = await workspace()
    await Promise.all([
      updateWriterPromptSettings(root, { kind: 'author-request', id: 'a', enabled: false }),
      updateWriterPromptSettings(root, { kind: 'author-request', id: 'b', enabled: false }),
    ])
    expect((await readWriterPromptSettings(root)).disabledAuthorRequestIds).toEqual(['a', 'b'])
  })

  test('invalid settings fail closed and are never overwritten', async () => {
    const root = await workspace()
    await mkdir(join(root, '.narracat'))
    const file = join(root, '.narracat/writer-prompts.json')
    await writeFile(file, '{bad')
    await expect(readWriterPromptSettings(root)).rejects.toThrow()
    await expect(updateWriterPromptSettings(root, { kind: 'book-persona', enabled: false })).rejects.toThrow()
    expect(await readFile(file, 'utf8')).toBe('{bad')
  })

  test('runtime and preview remove disabled persona and only the selected requirements', async () => {
    const root = await workspace()
    const userData = await workspace()
    const engine = await workspace()
    await mkdir(join(engine, 'agents'))
    await writeFile(join(engine, 'agents/chapter-writer.md'), '---\ndescription: Writer\ntools: Read, Write\n---\n<!-- narracat:prose id="writer-persona" -->\nOfficial persona\n<!-- /narracat:prose -->\nCore file rules')
    await writeFile(join(userData, 'prose-overrides.json'), JSON.stringify({ version: 1, overrides: { 'writer-persona': { text: 'Custom persona', baseText: 'Official persona' } } }))
    await writeFile(join(userData, 'author-requests.json'), JSON.stringify({ requests: [
      { id: 'a', agentId: 'chapter-writer', text: 'Keep this requirement' },
      { id: 'b', agentId: 'chapter-writer', text: 'Disable this requirement' },
      { id: 'c', agentId: 'continuity-editor', text: 'Editor requirement' },
    ] }))
    await updateWriterPromptSettings(root, { kind: 'writer-persona', enabled: false })
    await updateWriterPromptSettings(root, { kind: 'author-request', id: 'b', enabled: false })
    const result = await resolveWriterPrompt({ projectPath: root, userDataPath: userData, agentCorePath: engine })
    expect(result.definition.prompt).toContain('Core file rules')
    expect(result.definition.prompt).toContain('Keep this requirement')
    expect(result.definition.prompt).not.toContain('Custom persona')
    expect(result.definition.prompt).not.toContain('Official persona')
    expect(result.definition.prompt).not.toContain('Disable this requirement')
    expect(result.definition.prompt).not.toContain('Editor requirement')
    expect(result.writerPersona).toBe('Custom persona')
    expect(result.authorRequests).toHaveLength(2)
  })
})
