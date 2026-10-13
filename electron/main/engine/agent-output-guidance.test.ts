import { afterEach, describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseAgentFile, assembleAgentSkills } from './assemble-agent-skills'
import { resolveEngineAgentDefinitions } from './engine-agent-registry'
import { NARRACAT_ENGINE_AGENT_IDS } from './agent-core-contract'

const roots: string[] = []
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))) })

describe('shared agent output guidance', () => {
  test('writer self-check survives custom and disabled personas in runtime definitions', async () => {
    const core = join(process.cwd(), 'agent-core/narracat')
    for (const text of ['Use a dry narrator.', '']) {
      const overrides = { 'writer-persona': { text, baseText: '', baseEngineVersion: '', updatedAt: '' } }
      const assembled = await assembleAgentSkills({ agentCorePath: core, agentIds: ['chapter-writer'], proseOverrides: overrides })
      const definitions = await resolveEngineAgentDefinitions({ agentCorePath: core, overrides: assembled })
      const prompt = definitions['chapter-writer'].prompt
      expect(prompt).toContain('## 叙述自检（热写与冷改都执行）')
      expect(prompt).toContain('删除后不影响理解，也不减少新的顾虑、决定或后果')
      expect(prompt).toContain('不要为了替换总结，补造动作、对白或身体反应')
      expect(prompt).toContain('简写还原成谁做了什么、结果怎样')
      expect(prompt).toContain('不能为凑对照句补出未经确认的另一半')
      expect(prompt).toContain('有效的概述、幽默、短句和直接心理描写可以保留')
    }
  })

  test('reviewer reports redundant conclusions and unclear shorthand as concrete notes', async () => {
    const parsed = await parseAgentFile(join(process.cwd(), 'agent-core/narracat'), 'continuity-editor')
    expect(parsed?.prompt).toContain('删去后不影响理解的重复结论')
    expect(parsed?.prompt).toContain('记录、对白和心理中的简写也要检查')
    expect(parsed?.prompt).toContain('不能把“对照很有力”当成证据')
    expect(parsed?.prompt).toContain('表达问题用 readability note')
    expect(parsed?.prompt).toContain('没有发现客观错误或表达问题时，才提交空 issues')
    expect(parsed?.prompt).not.toContain('没有发现错误就提交空 issues')
  })

  test('all default agents receive plain planning language with a fiction boundary', async () => {
    for (const agentId of NARRACAT_ENGINE_AGENT_IDS) {
      const parsed = await parseAgentFile(join(process.cwd(), 'agent-core/narracat'), agentId)
      expect(parsed?.prompt).toContain('## 通用输出规范')
      expect(parsed?.prompt).toContain('章节定位写本章发生的变化')
      expect(parsed?.prompt).toContain('小说正文、人物对白和标明的拟写片段')
    }
  })

  test('custom and disabled personas retain the shared guidance without duplicates', async () => {
    const core = join(process.cwd(), 'agent-core/narracat')
    const overrides = { 'writer-persona': { text: '', baseText: '', baseEngineVersion: '', updatedAt: '' } }
    const assembled = await assembleAgentSkills({ agentCorePath: core, agentIds: ['chapter-writer'], proseOverrides: overrides, authorRequestsByAgent: { 'chapter-writer': ['Use first person.'] } })
    const writer = assembled['chapter-writer']
    expect(writer.prompt).toContain('## 通用输出规范')
    expect(writer.prompt).toContain('Use first person.')
    const definitions = await resolveEngineAgentDefinitions({ agentCorePath: core, overrides: assembled })
    expect(definitions['chapter-writer'].prompt.match(/## 通用输出规范/g)).toHaveLength(1)
    const custom = await resolveEngineAgentDefinitions({ agentCorePath: core, overrides: { 'outline-architect': { description: 'Custom planner', prompt: 'Keep my planning approach.', tools: ['Read'] } } })
    expect(custom['outline-architect'].prompt).toContain('Keep my planning approach.')
    expect(custom['outline-architect'].prompt).toContain('## 通用输出规范')
  })

  test('fresh source edits appear on the next agent assembly', async () => {
    const root = await mkdtemp(join(tmpdir(), 'output-guidance-'))
    roots.push(root)
    await mkdir(join(root, 'agents'))
    await mkdir(join(root, 'docs/contracts'), { recursive: true })
    await writeFile(join(root, 'agents/chapter-writer.md'), '---\nname: chapter-writer\ndescription: Writer\n---\nWrite chapters.')
    const path = join(root, 'docs/contracts/agent-output-guidance.md')
    await writeFile(path, '## 通用输出规范\n\nFirst requirement.')
    expect((await parseAgentFile(root, 'chapter-writer'))?.prompt).toContain('First requirement.')
    await writeFile(path, '## 通用输出规范\n\nUpdated requirement.')
    expect((await parseAgentFile(root, 'chapter-writer'))?.prompt).toContain('Updated requirement.')
  })

  test('shared guidance does not make an empty agent definition valid', async () => {
    const root = await mkdtemp(join(tmpdir(), 'empty-output-guidance-'))
    roots.push(root)
    await mkdir(join(root, 'agents'))
    await mkdir(join(root, 'docs/contracts'), { recursive: true })
    await writeFile(join(root, 'agents/chapter-writer.md'), '---\ndescription: Writer\n---\n')
    await writeFile(join(root, 'docs/contracts/agent-output-guidance.md'), '## 通用输出规范\n\nUse plain language.')
    expect(await parseAgentFile(root, 'chapter-writer')).toBeNull()
  })
})
