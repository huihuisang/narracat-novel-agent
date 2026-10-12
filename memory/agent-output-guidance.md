# Shared agent output guidance

Installed output review found that both the write command and reviewer explicitly
limited re-review to earlier findings. Engine 4.0.194 removes this restriction:
review the final whole chapter and use prior findings as a focus list. New issues
remain reportable, and the single targeted-repair limit still applies. The source
contract is covered by a regression test; 3921 App tests and OPS checks pass.
Packaging and installation remain pending. The chapter 4 revision running in
4.0.193 has the same full-review requirement in its author request.

The next brief changed an author-specified date, and the writer retained several
sentences explicitly marked for repair. Author requests must be saved verbatim
and passed by path to both writer and reviewer tasks, including repair passes.
The brief remains the translated plot input but cannot replace original author
requirements. Tests cover direct request delivery and whole-chapter re-review
in both write and rewrite commands. Report compliance from the final text, not
from the writer's self-report or the presence of a requirement in the brief.

The final 4.0.194 package passes signing, resource boundaries, packaged memory,
and offline embedding checks. Its four writing and review sources match the
checkout; 3922 App tests and OPS checks pass. Installation is still pending.
The 4.0.193 targeted draft and cold pass use staging and measure 1966 words.
Direct reading still found the water dialogue, date, and concentrated medication
facts. A full review is running. All 166 author files still match the latest
backup, so the formal manuscript has not been replaced. Mac locked again;
desktop completion requires the author to unlock. Keep the model and settings.

The 4.0.192 continuation read the craft source and rebuilt its brief, but the
builder returned the existing formal manuscript as its output path. The writer
dispatch followed that path despite the runtime staging instruction. Engine
4.0.193 adds `draft_path` to the builder response. Write and rewrite commands
use it for generation; `manuscript_path` retains its existing read semantics.
Tests cover a new chapter and a chapter with a formal manuscript. The current
run finished with the formal contract gate; its original manuscript is backed
up. Do not replace a running App mid-generation.

The 4.0.192 draft measured 1869 words and 1872 after the cold revision. Formal
preflight now checks its real count. Review returned a continuity blocker for
the Friday server joke and a readability note for an incorrect character count.
The parent combined both in a targeted writer task; the revised file is 1861
words and re-review passed before memory completion. Direct reading still found the premature rumor
forwarding request, implausible water dialogue, and medication fields in one
speech. The reviewer incorrectly claimed the forwarding request was not sent.
Keep these for one combined follow-up revision, not repeated single-sentence
review cycles. The signed 4.0.193 App is now installed, and all 3214 entries match
the package. The backup is `20261012-141622-revision-193`. A combined chapter 4
revision has started in the installed App; final prose and full review remain
pending. The existing model, author switches, outlines, and other chapters are
outside this revision.

The first installed 4.0.191 rewrite reached brief assembly, but the main agent
mistook disabled selected references for a disabled craft library. The library
was enabled in the saved settings. It did not read the craft source and copied
unclear wording from the rejected manuscript into the brief. The run was stopped
before it wrote a new manuscript. Chapter 4 memory is rolled back and its rewrite
checkpoint remains at step 2. Engine 4.0.192 adds an explicit enabled-library
policy to main and dispatched sessions and separates both sources in brief
assembly. The four source combinations are covered by regression tests.

The signed 4.0.192 App is installed and all 3214 entries match the package.
Its chapter 4 continuation read the installed craft library. The run uses the
existing model and author switches; final prose and memory completion remain
pending. The backup is `20261012-133252-craft-policy-192` in the install backup
directory; the previous App is retained there.

Engine 4.0.191 fixes the formal-path contract bypass for active write and rewrite
checkpoints. Explicit preflight checks both paths and returns the measured count;
missing files fail. Author sync outside generation remains unaffected. App write
hints now share the contract's text count and 80%-120% range and recognize staging.
Subagent output checks prefer staging over an older formal file. The runtime
path guard now directs generation to staging instead of early formal overwrite.

Rewrite builds a fresh brief and reuses write's one cold revision before review.
Review issues can retain an optional readability category, and the retrieval
tool returns these notes for one targeted revision. Objective blockers and
subjective recommendations keep separate effects; final review follows all edits.
ADR-0048 records this contract. The new checks went red before implementation;
3920 App tests and 957 MCP tests pass. Installed generation verification is still
pending at this source checkpoint. Tests do not establish prose quality.

The signed 4.0.191 App is now installed. All 3214 installed entries match the
package, and four writer/reviewer source files match the checkout. Package memory
and offline embedding checks passed. A read-only call to the installed contract
handler returned `ok: false`, 1623 measured words, and a 1760-word minimum for
the existing formal chapter 4 manuscript. It did not change the file. The backup
is under `NarraCat-install-backups/20261012-111930-validation-191/`. Desktop text
input did not take effect, so the new rewrite has not started; the author was
asked to foreground the input. Do not present installation as generation success.

The author rejected the resulting chapter 4 prose as difficult to read. A
comparison with its local-revision brief found that the phrase about rumors
being close to the mother was already in the brief and was copied into the
manuscript. The brief also placed the medication date, clinic, quantity, and
remaining doses in one dialogue instruction; the output put them in one speech.
The brief's vague instruction to wait for police procedures also survived in
dialogue without a clear answer to the mother's question. Review the brief's
own language and scene priorities before adding more prohibited expressions.
Required facts need a credible source and a natural place in the scene; they
do not all need to appear in one character's speech.

On 2026-10-12, the installed 4.0.190 App revised chapter 4's structured outline
and rewrote its manuscript with the configured model. The actual main session
read the current craft source, and writer dispatches carried chapter-specific
instructions. Book voice and style switches remained disabled. The author file
comparison found changes only in chapter 4's JSON outline and manuscript;
existing outline Markdown remains protected and contains the old text.

The final local revision passed continuity review and updated its summary,
facts, receipt, and progress through NovelMemory tools. Progress reached chapter
4 and 7671 total words. The review and receipt count 1623 words, despite the
writer's estimate of 1936. The manuscript contract check skipped validation
because the writer had used the formal path rather than staging. This output
is below the requested range. Prose hygiene checks also passed while abstract
phrases and unsupported threshold language remained. These checks do not prove
readability or full compliance with the author's wording requirements.

Do not use this run as a claim that prompt changes remove all formulaic prose.
Future follow-up should validate the formal manuscript's actual length and
sentence meaning before committing completion. A pre-existing chapter 3 date
conflict remains outside this chapter-only task: its October 8 credit timestamp
does not match the October 7 update window. The backup is under
`~/Library/Application Support/NarraCat-install-backups/20261012-090253-rewrite-ch4/`.

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
the installed App at that stage was 4.0.188. Reading and delivery checks do not establish
the quality of a generated chapter.

The author then supplied a longer general revision guide. Its overlapping
principles were merged into existing entries rather than copied as a checklist.
New entries cover cross-chapter plan changes, reasons for waiting or stopping,
and the full consequences of compound statements. Revision guidance fixes
continuity and motives before sentence rhythm, and prefers deletion or relocation
over filler. Failed tests require checking their preconditions before drawing a
general conclusion. That source update used 4.0.190; the installed manifest was
then read back as 4.0.188. No chapter generation was performed.

On the author's replacement request, the signed 4.0.190 App was installed and
launched. All 3214 installed entries match the package. The craft library and
three planning sources match the checkout. The workbench loaded, the craft
switch stayed enabled, and the source preview displayed the new revision text.
The replacement backed up 2085 novel and profile entries to
`~/Library/Application Support/NarraCat-install-backups/20261011-233208-craft-190/`.
After launch, 212 novel entries were checked; only SQLite temporary files changed.
Author settings, including the custom writer persona, remained unchanged.
The old App was removed. The report is `/tmp/narracat-craft-190-install.json`.
All 3916 App tests, type and design checks, packaged memory and offline embedding
smoke, package boundary checks, and signature verification passed. This was a
local signed installation, not a notarized or published release.

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
