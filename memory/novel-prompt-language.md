# Novel prompt language maintenance

The runtime sources are `agent-core/narracat/agents/` and
`agent-core/narracat/commands/`. Shared behavior is defined in
`agent-core/narracat/docs/contracts/`.

## Prose guidance

- Select two or three relevant craft suggestions for each chapter brief.
  This limit does not apply to explicit author requirements.
- Use connected paragraphs. Do not turn pace into sentence-length, dialogue,
  action, or hook quotas. Direct psychological narration and quiet scenes are
  valid when they clarify the character's concerns, choices, or changed view.
- A polish pass can reduce excessive reactions as well as develop weak scenes.
  Preserve events, established facts, character identity, and the planned ending.
- Describe actual results to authors. An unavailable read is not evidence that
  a plan is missing. A review pass means no issue was found within its scope.
- Keep internal identifiers for execution. Provide them when the author asks
  for technical diagnosis; do not hide useful error details.

## Runtime contracts

- Preserve frontmatter tool permissions, editable prose-block markers, chapter
  brief paths, checkpoint step meanings, retry limits, and submission order.
- The write loop keeps three extraction runs and a separate chapter finish
  task. The finish task must not call scaffold or staging tools.
- Rewrite can supply a WritingContextPack directly. The writer must accept the
  input provided by that task instead of requiring a missing chapter brief.
- The cold polish call retains `thinking="off"`. Its earlier A/B rationale
  reported 98.7% similarity, 54 differences, and about 87% output budget spent
  on thinking. These historical measurements were not repeated in this edit
  and do not establish a general rule for all models.

## Historical documents

Keep dates, decision states, recorded results, source links, and quotations.
Clarify obsolete execution steps instead of presenting them as current rules.
The v3-to-v4 migration guide concerns NarraCat 2.4.x to 2.5.0, not the current
Agent Core. Offline embedding does not make the writing LLM request offline.

## Verification and delivery

The 2026-10-09 edit checked 63 Markdown files and changed 51. Resource checks,
18 prompt permission and marker comparisons, 63 prompt/runtime contract tests,
and 81 card-loader tests passed. The repository operations check still reports
eight existing documentation issues outside this edit.

These checks validate contracts, not generated prose quality. Rebuild existing
chapter briefs to use the new instructions. Packaged installations need a new
build. Author persona overrides keep their own text. This edit did not replace
the installed app or run a live writing evaluation.
