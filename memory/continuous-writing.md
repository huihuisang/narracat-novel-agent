# Continuous Writing

The main process schedules existing chapter runs in order. See ADR-0049 and `electron/main/agent/runs/continuous-writing.ts` for lifecycle rules. Renderer polling only reads state; closing a view does not stop a batch.

Plans use canonical project paths and atomic files under App user data in `continuous-writing/`. A new process restores a saved running plan as paused. Resume uses current chapter state, not the saved pointer alone. Pause does not cancel an active chapter.

Only a successful run plus a completed chapter with a formal manuscript permits automatic advancement. Pending memory changes and editor drafts stop new dispatch. Existing questions require author answers. Batch confirmation is scoped to the generated run prompt and never changes `chapter_gate` in the novel config.

Verification must separate scheduler fixtures, Electron IPC and UI smoke, and real model writing. Isolated smoke projects must not reuse author configuration or active novel files.
