import { afterEach, describe, expect, test } from 'bun:test'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getWriterPromptPreview } from './writer-prompt'
import { createPersonaFixture } from './test-persona-fixture'

const roots: string[] = []
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))) })

describe('live voice preview', () => {
  test('refresh reads the source even while delivery is disabled', async () => {
    const fixture = await createPersonaFixture()
    roots.push(fixture.root)
    for (const dir of ['agents', 'skills/novel-web-craft']) await mkdir(join(fixture.core, dir), { recursive: true })
    await writeFile(join(fixture.core, 'agents/chapter-writer.md'), '---\nname: chapter-writer\ndescription: Writer\n---\n<!-- narracat:prose id="writer-persona" title="写手的人设" -->\nWrite chapters.\n<!-- /narracat:prose -->')
    await writeFile(join(fixture.core, 'skills/novel-web-craft/SKILL.md'), '# Craft\n\nWrite clearly.')
    await writeFile(join(fixture.project, '.narracat/writer-prompts.json'), JSON.stringify({ version: 1, writerPersonaEnabled: true, bookPersonaEnabled: false, disabledAuthorRequestIds: [], bookPersonaChangedAt: null }))
    const baseline = await readFile(fixture.pack, 'utf8')
    const input = { projectPath: fixture.project, agentCorePath: fixture.core, userDataPath: fixture.userData }
    const first = await getWriterPromptPreview(input)
    expect(first.bookContext?.persona).toBe('Live book voice')
    expect(first.settings.bookPersonaEnabled).toBe(false)
    await writeFile(fixture.source, 'Edited book voice')
    expect((await getWriterPromptPreview(input)).bookContext?.persona).toBe('Edited book voice')
    expect(await readFile(fixture.pack, 'utf8')).toBe(baseline)
    await rm(fixture.source)
    const unavailable = await getWriterPromptPreview(input)
    expect(unavailable.bookContext?.persona).toBe('')
    expect(unavailable.bookContext?.personaError).toContain('声音卡源文件')
    expect(unavailable.settings.bookPersonaEnabled).toBe(false)
  })
})
