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

For author-requested outline polishing, edit only the named outline files and
preserve their schema, identifiers, plot order, and qualified decisions. Keep a
backup and compare unchanged metadata after editing. Explain fear through the
specific danger and resulting choice. Keep speaker attribution and experiment
recipients clear. A failed search does not prove that no other witness exists;
a missing payment record does not prove that money has no source. The author
requested this treatment for chapter outlines 1-3 on 2026-10-11. Their prose
fields were revised directly, without changing the manuscript or App resources.

A chapter 4 review on 2026-10-11 found that plain wording alone did not resolve
unsupported conclusions inherited from its outline. Keep group membership,
message readership, and belief counts separate. An unverified recording is a
possible anomaly, not a confirmed rule activation. A report timestamp measures
reporting time unless activation time is independently known. Check future
predictions against the update window and the next chapter's event schedule.
Review action motives and speaker attribution before adding stylistic rules.
The review did not modify the author's chapter or outline.

At the author's request, these findings now inform `novel-web-craft/SKILL.md`.
Existing dialogue, action, and recap entries were updated; four optional entries
cover sentence meaning, evidence and counts, time and rules, and a clear question
for each investigation. The compressor still selects 2-3 relevant entries and
converts them to chapter-specific guidance. That update used engine 4.0.189;
the installed App remains 4.0.188. Reading and delivery checks do not establish
the quality of a generated chapter.

The author then supplied a longer general revision guide. Its overlapping
principles were merged into existing entries rather than copied as a checklist.
New entries cover cross-chapter plan changes, reasons for waiting or stopping,
and the full consequences of compound statements. Revision guidance fixes
continuity and motives before sentence rhythm, and prefers deletion or relocation
over filler. Failed tests require checking their preconditions before drawing a
general conclusion. Source version is now 4.0.190; the installed manifest was
read back as 4.0.188. No App replacement or chapter generation was performed.

On 2026-10-11, the author reported that output remained difficult to read.
The selected chapter 3 outline was unchanged: a request to revise it had led
to the generic planning button and then to new chapter outlines 44-64.
Normal author chat also omitted shared guidance because delivery depended on
the novel workflow flag. It now receives guidance without novel tools;
isolated sandbox prompts remain separate. Direct chat receives the selected
chapter and directs existing-outline revisions to the Adjust Content action.
The plan command has a targeted chapter revision branch before missing-chapter
planning. Submission updates structured JSON; existing Markdown remains
protected by the existing tool behavior. The App displays structured JSON first.
Common guidance now uses concrete examples and separates source facts from
source phrasing. Planning reports state actual change scope and progress.
An installed 4.0.187 direct-chat sample used the configured GLM model. Its report
was plain, but its outline added unsupported motives and turned a qualified
decision into an absolute rule. Version 4.0.188 removes the instruction to fill
each beat with obstacles and choices. Existing-content revisions preserve
source facts and qualifiers. New plot design remains allowed within its scope.
Generation quality still requires output review. Direct-chat samples do not
establish batch planner quality. Do not treat delivery tests or installation
checks as prose-quality evidence.

After the author unlocked the Mac, the final signed App with engine 4.0.188
replaced `/Applications/NarraCat.app`. All 3214 installed entries match the
package, and the three planning sources match the checkout. The old App was
removed. The workbench restored chapter 3, showed the agent ready, and retained
the configured model. The installation backed up 1853 novel and profile entries
to `~/Library/Application Support/NarraCat-install-backups/20261011-112012-plain-output/`.
After launch, all 204 novel entries and author settings remained unchanged.
The report is `/tmp/narracat-plain-output-install.json`.
The last guidance edit required a new root signature after packaging. Earlier
installer archives remain in `/tmp/narracat-before-final-policy-artifacts`.
No generation sample was run on 4.0.188. This was a local signed installation,
not a notarized or published release.

The source revision `1fc32615` was packaged and installed on 2026-10-11 at
`/Applications/NarraCat.app` with engine version 4.0.186. Package hashes and
symlink targets matched all 3214 installed entries. The existing rewrite run
was waiting for outline confirmation and was interrupted through normal app
exit. The restarted workbench showed the agent ready. Novel files and author
settings remained unchanged; existing outlines were not rewritten.
