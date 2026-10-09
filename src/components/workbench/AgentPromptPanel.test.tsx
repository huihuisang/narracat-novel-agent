import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { TooltipProvider } from '@/components/ui/tooltip'
import { defaultWriterPromptSettings, type WriterPromptPreview } from '@shared/types/writer-prompts'
import { AgentPromptPanelView } from './AgentPromptPanel'

const preview: WriterPromptPreview = {
  agentId: 'chapter-writer',
  proseBlocks: [{ id: 'writer-persona', title: '写手的人设', text: 'Custom writer persona', origin: 'user', enabled: false }],
  settings: { ...defaultWriterPromptSettings(), writerPersonaEnabled: false, disabledAuthorRequestIds: ['b'] },
  writerPersona: 'Custom writer persona',
  writerPersonaOrigin: 'user',
  systemPrompt: 'Effective system prompt',
  craftLibrary: 'Craft library principles',
  bookContext: { chapter: 3, persona: 'Book narrator card', styleDirective: 'Book style direction', craftReferences: ['Negotiation dialogue'] },
  authorRequests: [{ id: 'a', text: 'First requirement', enabled: true }, { id: 'b', text: 'Second requirement', enabled: false }],
}

describe('AgentPromptPanel', () => {
  test('a missing voice source leaves the switch available and shows its error', () => {
    const html = renderToStaticMarkup(<TooltipProvider><AgentPromptPanelView preview={{ ...preview, bookContext: { ...preview.bookContext!, persona: '', personaError: '声音卡源文件无法读取' } }} /></TooltipProvider>)
    expect(html).toContain('声音卡源文件无法读取')
    expect(html).toContain('aria-label="启用书级声音卡"')
    expect(html).not.toContain('disabled=""')
  })

  test('shows each source with an accessible independent switch', () => {
    const html = renderToStaticMarkup(<TooltipProvider><AgentPromptPanelView preview={preview} /></TooltipProvider>)
    expect(html).toContain('Agents 档案')
    expect(html).toContain('data-agent-profile-inspector="true"')
    expect(html).toContain('data-agent-profile-portrait="true"')
    expect(html.match(/role="tab"/g)).toHaveLength(5)
    expect(html).toContain('Custom writer persona')
    expect(html).toContain('Book narrator card')
    expect(html).toContain('第 3 章')
    expect(html).toContain('First requirement')
    expect(html).toContain('Second requirement')
    expect(html.match(/role="switch"/g)).toHaveLength(7)
    expect(html).toContain('aria-label="启用网文写作手艺"')
    expect(html).toContain('aria-label="启用选中的写法参考"')
    expect(html).toContain('aria-label="启用书级文风"')
    expect(html).toContain('aria-label="启用要求 2"')
    expect(html).toContain('下次运行生效')
    expect(html).toContain('查看完整提示词')
  })

  test('empty context is explicit and loading keeps source controls unavailable', () => {
    const html = renderToStaticMarkup(<TooltipProvider><AgentPromptPanelView preview={{ ...preview, bookContext: null, authorRequests: [] }} busy /></TooltipProvider>)
    expect(html).toContain('首次生成上下文后可查看内容')
    expect(html).toContain('还没有给它添加要求')
    expect(html).toContain('disabled=""')
  })

  test('other profiles show their own sources without writer book controls', () => {
    const editor = { ...preview, agentId: 'continuity-editor', proseBlocks: [{ id: 'continuity-editor-persona', title: '审校的人设', text: 'Editor persona', origin: 'official' as const, enabled: true }], bookContext: null }
    const html = renderToStaticMarkup(<TooltipProvider><AgentPromptPanelView preview={editor} /></TooltipProvider>)
    expect(html).toContain('data-agent-profile-panel="continuity-editor"')
    expect(html).toContain('Editor persona')
    expect(html).toContain('aria-label="启用审校的人设"')
    expect(html).not.toContain('Custom writer persona')
    expect(html).not.toContain('启用书级声音卡')
    expect(html).not.toContain('启用书级文风')
  })
})
