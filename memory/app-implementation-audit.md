# App implementation audit

Date: 2026-10-09
Source baseline: `a444f70934c908a695ee6824772e8ba046e865bc`.

## Scope and evidence

The review covered project identity and routing, project mutation and backup
coordination, manuscript editing and revisions, chapter outline editing, Agent
completion and cancellation, memory synchronization, writer-source delivery,
polish configuration and result delivery, model settings, character chat,
archive restore, window setup, and update lifecycle. This is a review of the
main paths, not an exhaustive audit of every file or a security certification.

The findings below describe the review baseline. The review itself did not
change business implementation. Two stale tests from the preceding prompt edits were corrected:
the writer input contract includes explicitly supplied rewrite context, and
the craft delivery test now compares the actual source text instead of a
removed slogan. The full App suite then passed: 3,884 tests in 363 files.
Type checks, architecture checks, design checks, and prose-block checks passed.

Nine isolated probes reproduced the behaviors below. They used temporary
projects, fake model streams, controlled delays, and injected dependencies.
The connection probe reproduces the handler's config read/write sequence;
the page-exit probe reproduces subscription cleanup. These are not live
provider or installed Electron tests. No author project or credential was
read or changed. Probe source and output are local audit evidence:

- `/Users/huisang/Documents/Codex/2026-10-08/1-v3-17-v3-17-17-2/work/app-audit-probes.test.ts`
- `/tmp/narracat-app-audit-probes.log`
- `/tmp/narracat-app-audit-tests-final.log`

## Repair status (2026-10-09)

F1–F8 are repaired in source. These are separate from the baseline observations below.

- F1: project mutations run in one queue per canonical project. Saves and
  Agent runs exclude each other; stale queued edits fail the manuscript baseline check.
- F2: a normal Agent ending cannot clear a pending marker. A completed
  `novel_checkpoint` for sync step 1 or 3 supplies a manuscript SHA-256 only
  when the chapter is the latest completed chapter and has a stored summary.
  The App compares current bytes and pending-marker generation before clearing.
  Progress restoration after failed extraction supplies no receipt. Older
  manual edits record divergence and do not offer the unsupported sync route.
- F3: config mutations read and merge under one queue and write atomically.
  Connection verification checks current endpoint, protocol, and key generation;
  other settings are preserved. Secret updates and the tested config/key snapshot
  use the same queue.
- F4: deterministic checks describe only name, number, and paragraph differences.
  A separate model check compares events and relations before clean adoption.
  Automatic polish retains the original if either check fails or is uncertain.
  Manual adoption of unverified changes records pending synchronization or,
  after confirmation for an old chapter, divergence. The model check is a
  precaution, not a guarantee of factual equivalence or writing quality.
- F5–F7: App owns the polish event subscription across routes. Completion
  delivers sanitized full text. Starting a run waits for selected recipes to
  save; a failed save blocks generation and pending inputs are disabled.
- F8: render both outline outputs before writing. Save Markdown then JSON
  atomically per file. If JSON replacement fails, restore the previous Markdown;
  handle failures reported after rename and report failed compensation explicitly.
  This handles write failures, not a process crash between the two replacements.

Regression evidence uses temporary projects, fake model streams, and injected
write failures. Real Electron UI smoke uses real preload/IPC and a controlled
polish handler: delayed saves block start, failed saves block generation, route
changes retain late results, and completed text replaces raw streaming fences.
It does not contact a provider or use author credentials. Source:
`/tmp/narracat-fixes-smoke.mjs`; final result: `/tmp/narracat-electron-fixes-final.log`.

The final smoke also saves an older chapter through real IPC and checks that
the divergence notice replaces the unsupported synchronization action.
Screenshot: `/var/folders/ts/hzd8hfd51dxcv464vhbgs9_80000gn/T/narracat-fixes-ui-aj9RWA/polish-result-after-navigation.png`.

Verification: 3,904 App tests and 70 engine state-sync tests pass. Type,
architecture, prose-block, and design checks pass; the development build
succeeds. Real Electron memory smoke passes utility-process RPC, core runtime
loading, SQLite vector support, and the offline embedding self-test. Logs are
`/tmp/narracat-all-fixes.log`, `/tmp/narracat-core-fixes.log`, and
`/tmp/narracat-memory-fixes.log`. `ops:check` still reports the same eight
pre-existing documentation issues in ADR-0036, ADR-0037, and historical progress.

The installed App has not been replaced. No live-provider writing evaluation,
release package, or deployment is part of this repair.

## Findings

### F1 — P1: concurrent manuscript saves can lose an edit

`electron/main/agent/runs/agent-runtime-coordinator.ts:331` counts mutations
to exclude backups. It does not serialize mutations or exclude an Agent run.
`electron/main/novel/manuscript-edit.ts:126` checks the visible-text baseline
before awaiting revision capture and writing the file. Two operations can
both pass this check, return success, and replace each other's manuscript.
The probe sent two edits through the coordinator with a barrier in revision
capture. Both returned `ok: true`; the final file contained only one edit.

Serialize each chapter's read/check/capture/write operation. Coordinate Agent
promotion and restore against the same boundary. An atomic file replacement
alone does not make the earlier comparison atomic.

### F2 — P1: an Agent ending is treated as successful memory synchronization

`electron/main/agent/events/agent-main-side-effects.ts:279` clears the pending
marker when a `sync-chapter-memory` run completes. It requires no memory-tool
success receipt or matching manuscript hash. The command can end normally
after explaining that an old chapter is unsupported; its step 0 explicitly
allows that exit. The probe emitted a normal ending without any memory tool
call, and chapter 1's marker was cleared.

This also interacts with manual editing: `manuscript-edit.ts` marks old
chapters pending, while `commands/sync-chapter-memory.md` only supports the
latest completed chapter. A second probe saved a chapter 1 edit with chapter 2
already complete and confirmed the pending marker. The current author-facing
write warning directs the user to an operation that cannot handle that chapter.

Require a chapter-specific synchronization receipt before clearing the marker.
Bind it to the manuscript version that was synchronized. Give older chapter
edits an explicit supported route or a divergence state.

### F3 — P1: connection testing can restore stale app settings

`electron/main/ipc/app.ts:247` reads the entire config before the network test.
Line 266 writes that snapshot back with verification added. Any setting saved
during the test can be lost, including model slots, endpoints, project root,
and API-key generation metadata. The probe changed the project root and key
generation between the two writes; both reverted to their earlier values.
The key itself remains in the credential store, so restored verification
metadata can also describe a different key from the one currently stored.

Use a serialized config mutation. After the test, compare the tested endpoint,
protocol, and key generation with current values, then merge only the valid
verification result into the current config. Do not restore the old document.

### F4 — P1: the polish check certifies facts it does not inspect

`shared/lib/prose-polish-drift.ts:267` checks known-name presence, number
multisets, and paragraph count. Line 304 labels a negative result `事实未变`.
The probe changed `陈默杀死了老刘。` to `陈默救活了老刘。`; the result was
`drifted: false` and `事实未变`. `polish/standing-polish.ts` accepts a result
that passes these checks and can replace the manuscript while memory keeps
the original events.

The deterministic check has useful limited scope. It is not a semantic fact
check. State that scope in the UI, and do not use it as sole evidence that
automatic adoption preserves events. A stronger adoption policy needs a
separate product decision and tests for event, relation, and negation changes.

### F5 — P2: leaving the manuscript page loses polish events

`src/components/workbench/artifacts/ChapterManuscriptView.tsx:101` owns the
polish subscription and unsubscribes on unmount. `src/lib/polish-store.ts`
retains results across pages, but the main process provides no replay or
completed-text query for those missed events. Leaving for the outline or
library during generation can drop text and completion permanently. The
probe unsubscribed after the first delta; re-entry retained only the first
half and still reported `running: true` after the backend completed.

Keep the subscription at App/store lifetime, or persist backend results and
rehydrate them on re-entry. A persistent state store cannot recover events it
never received.

### F6 — P2: experiment adoption uses raw text instead of cleaned output

`electron/main/polish/polish-runner.ts:223` cleans the completed text. Line
320 emits `version-done` without that text. The store keeps the raw streamed
deltas; `ChapterPolishVersions.tsx` submits `version.text` for adoption. The
probe returned fenced prose. The experiment retained the code fences, while
the headless path returned clean prose. The displayed drift result was also
computed against a different text from the text selected for adoption.

Include the final cleaned text in `version-done` and replace the provisional
buffer. Adoption and comparison should use that same completed version.

### F7 — P2: starting immediately after editing can use the old polish recipe

`PolishSetupDialog.tsx:147` saves without awaiting completion. Line 190 starts
the run without flushing those saves. The main process reloads the recipe
from disk. The probe held the recipe-write queue, started polish, and captured
the old requirement in the model request while the new requirement was still
pending. This can also start despite a save failure or find a new slot empty.

Flush the selected recipes and await successful saves before starting. Capture
the saved recipe version in the run so later edits cannot change its meaning.

### F8 — P2: outline edit failures can leave JSON and Markdown out of sync

`electron/main/novel/chapter-outline-edit.ts:159` writes JSON before computing
and writing the Markdown at line 169. A later failure returns `ok: false`
without rollback or a durable repair record. The probe made the Markdown
target unwritable as a file; the save reported failure, but JSON contained the
new title. A retry with the original expected value then conflicts.

Render and validate before committing. Treat JSON as the authoritative atomic
commit, with a recoverable derived-file repair path, or use a transaction
record for both files. Return a result that describes what actually persisted.

## Recommended order

1. Fix F1 and F2 to protect manuscripts and memory consistency.
2. Fix F3 so settings and verification cannot be rolled back by late results.
3. Decide the semantic safety and wording boundary in F4.
4. Fix F5-F7 together as one polish result-delivery flow, then F8.

The review did not run paid model generation, replace the installed App,
package a release, or test Windows behavior. Existing passing tests do not
establish writing quality or eliminate these concurrency and lifecycle gaps.
