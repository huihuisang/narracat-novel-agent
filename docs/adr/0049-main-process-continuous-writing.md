# ADR 0049: Main Process Continuous Writing

## Status

Accepted

## Context

Chapter writing requires the previous chapter's final text and committed story memory. Authors need to schedule a range without starting each chapter by hand. Parallel chapter generation would break this input boundary.

## Decision

The App main process owns one continuous writing plan per canonical project path. It runs existing `write-next` operations through the runtime coordinator and its project lock. The Agent Core still writes one chapter per run.

- Authors select an end chapter. A matching active write can become the first run in the plan.
- Advance only after the run ends successfully and the project reports that chapter complete with a formal manuscript. Conversation completion alone is insufficient.
- Check outlines, pending memory changes and editor recovery drafts before starting new chapters. Failures pause the plan. Questions keep the current run waiting for the author.
- Pause stops future dispatch. It does not cancel the current chapter. Resume reads current project progress before selecting a chapter.
- Store plans atomically under App user data. Restored plans are paused; app restart never starts paid work without an explicit resume.
- A batch can skip the chapter opening question. This is a run-scoped prompt instruction; it does not change project configuration, author requests, conflict questions or recovery choices.
- Renderer windows observe the plan through IPC. Navigation and renderer reload do not own the queue lifecycle.

## Consequences

Continuous writing reduces manual starts, not model generation time. The App remains open while writing. The queue never marks chapters complete or writes story memory itself. Existing run history, cancellation, notifications and recovery remain in use.

No new Agent Core command or resource contract is required. Real model output quality remains outside the scheduler's verification boundary.
