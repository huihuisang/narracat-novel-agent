# ADR-0047: Per-book Writer Prompt Sources

Status: Accepted

Date: 2026-10-08

## Context

The chapter writer receives several independent sources: its agent persona, global author requirements, and a book voice card carried by a chapter context pack. Authors could edit the first two sources but could not inspect their combined prompt or choose which sources a book uses. A book voice card can also reach the writer indirectly through a compressed chapter brief.

## Decision

- Add a separate **Agents Profiles** page to the project sidebar, replacing the Writer Prompts label. Reuse the Settings `AgentProfileInspector` tabs, portraits, introductions, and official skill viewer. Book-specific source inspection and switches replace the global editing sections. Settings keeps its global editing behavior.
- Store source choices in the app-owned `.narracat/writer-prompts.json`. Defaults retain existing behavior. Each book has separate switches for the writer persona, book voice card, and book style, plus a switch for each global author requirement. New requirements are enabled by default. Older v1 files without style fields keep style enabled.
- Reuse `assembleAgentSkills` for both the source preview and runtime writer definition. Disabling the persona removes that prose block, including the official fallback. Execution and file rules remain enabled.
- Display the book voice card and style directive from the most recently generated context pack, with its chapter number. This is a source preview, not a historical HTTP capture or a promise about a future chapter's card selection.
- A book voice card in a generated context pack can be inspected regardless of its pack origin. This is a specific extension of ADR-0034's display boundary; it does not add a general pack card viewer.
- Filter disabled book sources through the runtime Read tool before pagination and before they reach either the main session or a child session. The voice switch removes the persona card. The style switch removes the style directive and style examples. Keep source files intact; retain plot data and independently enabled sources.
- When either book switch changes, record its timestamp. A chapter brief older than the latest timestamp must be regenerated from the current context before use. This also covers interrupted chapter recovery.
- Capture choices once when building the next run. Saving choices invalidates cached sessions without aborting a run already in progress.
- Apply per-book persona and author requirement choices to all five built-in agents. Extend the existing v1 file with `disabledProseBlockIds`, defaulting to an empty list. Keep the writer's existing persona choice and disabled requirement ids. Voice and style controls remain specific to the chapter writer.
- Use the same agent assembler for each profile's source preview and runtime definition. Validate the selected agent and source ownership before saving a switch. Mandatory workflow, file, and tool rules remain present.
- Invalid settings stop loading and writing. Do not silently restore enabled defaults or overwrite a file that cannot be read.

## Consequences

Authors can compare the exact writer system prompt with its optional context sources and disable a source without deleting it. Book choices do not alter global personas, global author requirements, capability-pack selection, or existing manuscript files.

The App owns the delivery controls. Agent Core file formats and card selection remain unchanged. Historical full HTTP requests are still not retained.
