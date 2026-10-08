import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { TooltipProvider } from '@/components/ui/tooltip'
import { defaultWriterPromptSettings, type WriterPromptPreview } from '@shared/types/writer-prompts'
import { WriterPromptPanelView } from './WriterPromptPanel'

const preview: WriterPromptPreview = {
  settings: { ...defaultWriterPromptSettings(), writerPersonaEnabled: false, disabledAuthorRequestIds: ['b'] },
  writerPersona: 'Custom writer persona',
  writerPersonaOrigin: 'user',
  systemPrompt: 'Effective system prompt',
  bookContext: { chapter: 3, persona: 'Book narrator card', styleDirective: 'Book style direction' },
  authorRequests: [{ id: 'a', text: 'First requirement', enabled: true }, { id: 'b', text: 'Second requirement', enabled: false }],
}

describe('WriterPromptPanel', () => {
  test('shows each source with an accessible independent switch', () => {
    const html = renderToStaticMarkup(<TooltipProvider><WriterPromptPanelView preview={preview} /></TooltipProvider>)
    expect(html).toContain('写手提示词')
    expect(html).toContain('Custom writer persona')
    expect(html).toContain('Book narrator card')
    expect(html).toContain('第 3 章')
    expect(html).toContain('First requirement')
    expect(html).toContain('Second requirement')
    expect(html.match(/role="switch"/g)).toHaveLength(5)
    expect(html).toContain('aria-label="启用书级文风"')
    expect(html).toContain('aria-label="启用要求 2"')
    expect(html).toContain('下次写作生效')
    expect(html).toContain('查看完整提示词')
  })

  test('empty context is explicit and loading keeps source controls unavailable', () => {
    const html = renderToStaticMarkup(<TooltipProvider><WriterPromptPanelView preview={{ ...preview, bookContext: null, authorRequests: [] }} busy /></TooltipProvider>)
    expect(html).toContain('首次生成上下文后可查看内容')
    expect(html).toContain('还没有给写手添加要求')
    expect(html).toContain('disabled=""')
  })
})
