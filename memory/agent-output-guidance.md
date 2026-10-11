# Shared agent output guidance

The engine contract `docs/contracts/agent-output-guidance.md` defines plain
language for author dialogue, outline fields, setting documents, briefs, reviews,
and reports. It also defines the boundary for fiction and marked draft excerpts.
Outline text must identify actions, causes, choices, and consequences instead of
using decorative metaphors or abstract commentary.

`parseAgentFile` appends the current contract outside editable persona blocks.
`resolveEngineAgentDefinitions` also applies it to whole-definition overrides.
`withAgentOutputGuidance` avoids duplicate copies. The main novel runtime appends
the same source to its system prompt appendix. Prompt previews use the same
assembler, and disabled personas retain the guidance. Source text is read on
each assembly, without changing author overrides or existing outline files.

Tests cover all five agents, default and custom definitions, disabled personas,
main and dispatched sessions, duplicate prevention, fresh source edits, and
rejection of empty agent definitions before shared guidance is appended.
Prompt-delivery tests establish that models receive the guidance; they do not
establish a guarantee about future generated prose.
