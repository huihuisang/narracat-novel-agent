import { useEffect, useState } from 'react'
import { ListVideo, Pause, Play } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DIALOG_BODY_CLASS, DIALOG_CONTENT_FORM_CLASS, DIALOG_FOOTER_SECTIONED_CLASS,
  DIALOG_HEADER_SECTIONED_CLASS, DIALOG_SCROLL_SHELL_CLASS } from '@/design-system'
import { getContinuousWriting, updateContinuousWriting } from '@/lib/ipc'
import { getAgentThreadIdForProject, useAgentStore } from '@/lib/agent-store'
import { confirmLeaveManuscriptEditor } from '@/lib/manuscript-editor-guard'
import type { NovelProjectDetail } from '@shared/types/novel'
import type { ContinuousWritingInput, ContinuousWritingPlan } from '@shared/types/continuous-writing'

export function continuousWritingLabel(plan: ContinuousWritingPlan | null, waiting: boolean): string {
  if (!plan) return '连续写作'
  if (plan.status === 'complete') return `已写到第 ${plan.endChapter} 章`
  if (plan.status === 'paused') return '连续写作已暂停'
  if (waiting) return '连续写作 · 等待你的回答'
  return `正在写第 ${plan.nextChapter} 章 · 至第 ${plan.endChapter} 章`
}

export function ContinuousWritingControl({ project }: { project: NovelProjectDetail }) {
  const [plan, setPlan] = useState<ContinuousWritingPlan | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [endChapter, setEndChapter] = useState('')
  const [skipConfirmation, setSkipConfirmation] = useState(true)
  const threadId = getAgentThreadIdForProject(project)
  const activeRun = useAgentStore((state) => state.threadsById[threadId]?.activeRun)
  const chapters = project.tocItems.filter((item) => item.kind === 'chapter').sort((a, b) => a.chapterNumber! - b.chapterNumber!)
  const nextChapter = chapters.find((item) => item.status !== 'completed')?.chapterNumber
  const lastChapter = chapters.at(-1)?.chapterNumber ?? 0

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    async function refresh() {
      try {
        const value = await getContinuousWriting(project.path)
        if (!cancelled) { setPlan(value); setError(null) }
      } catch (failure) {
        if (!cancelled) setError(failure instanceof Error ? failure.message : '读取连续写作计划失败')
      } finally {
        if (!cancelled) timer = setTimeout(() => void refresh(), 2000)
      }
    }
    setPlan(null)
    void refresh()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [project.path])

  async function mutate(action: ContinuousWritingInput['action']) {
    if (busy) return
    if (action !== 'pause' && !(await confirmLeaveManuscriptEditor())) return
    setBusy(true)
    try {
      const value = await updateContinuousWriting({
        projectPath: project.path, action,
        ...(action === 'start' ? { endChapter: Number(endChapter), skipChapterConfirmation: skipConfirmation } : {}),
      })
      setPlan(value)
      setError(null)
      setOpen(false)
      if (value.status === 'paused' && action !== 'pause') toast.error(value.reason ?? '连续写作已暂停')
    } catch (failure) {
      toast.error(failure instanceof Error ? failure.message : '更新连续写作失败')
    } finally { setBusy(false) }
  }

  if (project.problem || !['ready', 'in-progress'].includes(project.status)) return null
  if (!nextChapter && !plan) return null
  const running = plan?.status === 'running'
  const validEnd = Number.isSafeInteger(Number(endChapter)) && Number(endChapter) >= (nextChapter ?? 1) && Number(endChapter) <= lastChapter
  const label = continuousWritingLabel(plan, activeRun?.status === 'waiting-user')

  return (
    <div className="mb-4 space-y-1" data-continuous-writing="true">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="min-w-0 flex-1 justify-start" disabled={busy || running || !nextChapter}
          onClick={() => {
            setEndChapter(String(Math.min(lastChapter, (nextChapter ?? 1) + 4)))
            setOpen(true)
          }}>
          <ListVideo className="size-4 shrink-0" />
          <span className="truncate" title={label}>{label}</span>
        </Button>
        {running || plan?.status === 'paused' ? (
          <Button variant="ghost" size="icon-sm" disabled={busy}
            aria-label={running ? '暂停连续写作' : '继续写作'} title={running ? '当前章完成后暂停' : '继续写作'}
            onClick={() => void mutate(running ? 'pause' : 'resume')}>
            {running ? <Pause className="size-4" /> : <Play className="size-4" />}
          </Button>
        ) : null}
      </div>
      {error || plan?.reason ? <p className="px-2 text-xs text-muted-foreground">{error ?? plan?.reason}</p> : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={`${DIALOG_SCROLL_SHELL_CLASS} ${DIALOG_CONTENT_FORM_CLASS}`}>
          <DialogHeader className={DIALOG_HEADER_SECTIONED_CLASS}>
            <DialogTitle>连续写作</DialogTitle>
            <DialogDescription className="sr-only">选择结束章并安排连续写作。</DialogDescription>
          </DialogHeader>
          <div className={`${DIALOG_BODY_CLASS} space-y-5`}>
            <p className="text-sm text-muted-foreground">从第 {nextChapter} 章开始，逐章写作、审校并记录进展。当前正在写的章节会先完成。</p>
            <div className="space-y-2">
              <label htmlFor="continuous-writing-end" className="text-sm font-medium">写到第几章</label>
              <Input id="continuous-writing-end" type="number" min={nextChapter} max={lastChapter} step={1}
                value={endChapter} onChange={(event) => setEndChapter(event.target.value)} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <label htmlFor="continuous-writing-confirmation" className="text-sm">本次不再逐章询问开写</label>
              <Switch id="continuous-writing-confirmation" checked={skipConfirmation} onCheckedChange={setSkipConfirmation} />
            </div>
            <p className="text-sm text-muted-foreground">需要你决定的问题仍会停下来询问。暂停会保留当前章；关闭应用后，下次可继续。</p>
          </div>
          <DialogFooter className={DIALOG_FOOTER_SECTIONED_CLASS}>
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button disabled={busy || !validEnd} onClick={() => void mutate('start')}>开始连续写作</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
