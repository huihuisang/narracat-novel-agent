import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronRight, RefreshCw } from 'lucide-react'
import { AgentProfileInspector, NARRACAT_AGENT_PROFILES } from '@/components/settings/AgentProfileInspector'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { IconTooltip } from '@/components/ui/icon-tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { DIALOG_CONTENT_FORM_CLASS, DIALOG_SCROLL_SHELL_CLASS, MUTED_PILL_CLASS } from '@/design-system'
import { cn } from '@/lib/cn'
import type { WriterPromptChange, WriterPromptPreview } from '@shared/types/writer-prompts'

type PromptTarget = 'system' | 'book-persona' | 'book-style' | `prose:${string}` | `request:${string}`

function PromptSourceRow({ title, text, enabled, disabled, onOpen, onToggle, badge }: {
  title: string
  text: string
  enabled: boolean
  disabled: boolean
  onOpen: () => void
  onToggle: (enabled: boolean) => void
  badge?: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-row border border-border bg-surface px-3 py-2.5">
      <button type="button" className="min-w-0 flex-1 text-left" onClick={onOpen} aria-label={`查看${title}`}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{title}</span>
          {badge ? <span className={MUTED_PILL_CLASS}>{badge}</span> : null}
        </div>
        <p className="mt-0.5 truncate text-xs leading-5 text-muted-foreground">{text || '暂无内容'}</p>
      </button>
      <Switch aria-label={`启用${title}`} checked={enabled} disabled={disabled} onCheckedChange={onToggle} />
      <IconTooltip label={`查看${title}`}>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={`查看${title}全文`} onClick={onOpen}>
          <ChevronRight className="size-4" />
        </Button>
      </IconTooltip>
    </div>
  )
}

function PromptText({ children }: { children: string }) {
  return <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-body-foreground">{children || '暂无内容'}</pre>
}

function AgentPromptSources({ preview, busy, onChange, onOpen }: {
  preview: WriterPromptPreview
  busy: boolean
  onChange?: (change: WriterPromptChange) => void
  onOpen: (target: PromptTarget) => void
}) {
  const bookContext = preview.bookContext
  return (
    <>
      <section aria-label="它是谁" className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">它是谁</h3>
        {preview.proseBlocks.map((block) => (
          <PromptSourceRow key={block.id} title={block.title} text={block.text} badge={block.origin === 'user' ? '已调整' : '官方'} enabled={block.enabled} disabled={busy} onOpen={() => onOpen(`prose:${block.id}`)} onToggle={(enabled) => onChange?.({ kind: 'agent-persona', id: block.id, enabled })} />
        ))}
      </section>
      <section aria-label="我对它的要求" className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">我对它的要求</h3>
        {preview.authorRequests.map((item, index) => (
          <PromptSourceRow key={item.id} title={`要求 ${index + 1}`} text={item.text} enabled={item.enabled} disabled={busy} onOpen={() => onOpen(`request:${item.id}`)} onToggle={(enabled) => onChange?.({ kind: 'author-request', id: item.id, enabled })} />
        ))}
        {preview.authorRequests.length === 0 ? <p className="rounded-row border border-dashed border-border px-3 py-4 text-sm leading-6 text-muted-foreground">还没有给它添加要求，可在设置中的 Agent 档案添加。</p> : null}
      </section>
      {preview.agentId === 'chapter-writer' ? (
        <section aria-label="本书声音" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">本书声音</h3>
            <span className="text-xs text-muted-foreground">{bookContext ? `最近上下文 · 第 ${bookContext.chapter} 章` : '首次生成上下文后可查看内容'}</span>
          </div>
          <PromptSourceRow title="书级声音卡" text={bookContext?.persona ?? ''} enabled={preview.settings.bookPersonaEnabled} disabled={busy} onOpen={() => onOpen('book-persona')} onToggle={(enabled) => onChange?.({ kind: 'book-persona', enabled })} />
          <PromptSourceRow title="书级文风" text={bookContext?.styleDirective ?? ''} enabled={preview.settings.bookStyleEnabled} disabled={busy} onOpen={() => onOpen('book-style')} onToggle={(enabled) => onChange?.({ kind: 'book-style', enabled })} />
        </section>
      ) : null}
    </>
  )
}

export function AgentPromptPanelView({ preview, agentId = preview?.agentId ?? 'chapter-writer', busy = false, error = null, onChange, onRefresh, onAgentChange }: {
  preview: WriterPromptPreview | null
  agentId?: string
  busy?: boolean
  error?: string | null
  onChange?: (change: WriterPromptChange) => void
  onRefresh?: () => void
  onAgentChange?: (agentId: string) => void
}) {
  const [target, setTarget] = useState<PromptTarget | null>(null)
  const active = preview?.agentId === agentId ? preview : null
  const agent = NARRACAT_AGENT_PROFILES.find((item) => item.id === agentId)
  const bookContext = active?.bookContext
  const block = active?.proseBlocks.find((item) => target === `prose:${item.id}`)
  const request = active?.authorRequests.find((item) => target === `request:${item.id}`)
  const title = target === 'system' ? `${agent?.name ?? 'Agent'}当前提示词`
    : target === 'book-persona' ? '书级声音卡' : target === 'book-style' ? '书级文风' : block?.title ?? '作者要求'
  const text = target === 'system' ? active?.systemPrompt
    : target === 'book-persona' ? bookContext?.persona : target === 'book-style' ? bookContext?.styleDirective : block?.text ?? request?.text

  return (
    <div className="flex h-full min-h-0 flex-col" data-agent-prompt-panel="true">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-workspace px-5 [-webkit-app-region:drag]">
        <h2 className="text-sm font-semibold text-foreground">Agents 档案</h2>
        <div className="flex items-center gap-2 [-webkit-app-region:no-drag]">
          <IconTooltip label="刷新提示词">
            <Button type="button" variant="ghost" size="icon-sm" aria-label="刷新提示词" disabled={busy} onClick={onRefresh}><RefreshCw className="size-4" /></Button>
          </IconTooltip>
          <Button type="button" variant="outline" size="sm" disabled={!active || busy} onClick={() => setTarget('system')}>查看完整提示词</Button>
        </div>
      </header>
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto max-w-4xl space-y-4 p-5">
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <AgentProfileInspector initialAgentId={agentId} selectionDisabled={busy} onAgentChange={(id) => { setTarget(null); onAgentChange?.(id) }} renderInstructions={(selected) => (
            <>
              <p className="text-xs leading-6 text-muted-foreground">只影响当前这本书，下次运行生效。</p>
              {active && active.agentId === selected.id ? <AgentPromptSources preview={active} busy={busy} onChange={onChange} onOpen={setTarget} /> : <p className="text-sm text-muted-foreground">{busy ? '正在读取提示词…' : '提示词尚未加载。'}</p>}
            </>
          )} />
        </div>
      </ScrollArea>
      <Dialog open={target !== null} onOpenChange={(open) => { if (!open) setTarget(null) }}>
        <DialogContent className={cn(DIALOG_CONTENT_FORM_CLASS, DIALOG_SCROLL_SHELL_CLASS)}>
          <DialogHeader className="shrink-0 border-b border-border px-6 pb-5 pt-6 text-left">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{target === 'system' ? '按当前开关组装，供下一次运行使用。' : '查看来源全文；开关不会修改原文。'}</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5" data-agent-prompt-detail="true">
            <PromptText>{text ?? ''}</PromptText>
            {target === 'system' && bookContext ? (
              <>
                {active?.settings.bookPersonaEnabled && bookContext.persona ? <section className="space-y-2"><h3 className="text-sm font-semibold">书级声音卡 · 上下文</h3><PromptText>{bookContext.persona}</PromptText></section> : null}
                {active?.settings.bookStyleEnabled ? <section className="space-y-2"><h3 className="text-sm font-semibold">书级文风 · 上下文</h3><PromptText>{bookContext.styleDirective}</PromptText></section> : null}
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function AgentPromptPanel({ projectPath }: { projectPath: string }) {
  const [agentId, setAgentId] = useState('chapter-writer')
  const [preview, setPreview] = useState<WriterPromptPreview | null>(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const generation = useRef(0)
  const pending = useRef(false)
  const load = useCallback(async () => {
    if (pending.current) return
    const current = ++generation.current
    setBusy(true)
    setError(null)
    try {
      const next = await window.electron.getWriterPrompts({ projectPath, agentId })
      if (generation.current === current) setPreview(next)
    } catch (cause) {
      if (generation.current === current) setError(cause instanceof Error ? cause.message : '读取提示词失败，请重试。')
    } finally {
      if (generation.current === current) setBusy(false)
    }
  }, [projectPath, agentId])
  useEffect(() => {
    setPreview(null)
    void load()
    return () => { generation.current += 1 }
  }, [load])
  const change = async (value: WriterPromptChange) => {
    if (pending.current) return
    pending.current = true
    const current = ++generation.current
    setBusy(true)
    setError(null)
    try {
      const next = await window.electron.setWriterPromptSource({ projectPath, agentId, change: value })
      if (generation.current === current) setPreview(next)
    } catch (cause) {
      if (generation.current === current) {
        setError(cause instanceof Error ? cause.message : '保存提示词开关失败，请重试。')
        const next = await window.electron.getWriterPrompts({ projectPath, agentId }).catch(() => null)
        if (generation.current === current && next) setPreview(next)
      }
    } finally {
      pending.current = false
      if (generation.current === current) setBusy(false)
    }
  }
  return <AgentPromptPanelView agentId={agentId} preview={preview} busy={busy} error={error} onAgentChange={setAgentId} onChange={(value) => void change(value)} onRefresh={() => void load()} />
}
