# Voice card context snapshots

The book voice card shown in Agents profiles comes from the latest modified
`.narracat/context-packs/ch-*.json`, through `readLatestBookContext` in
`electron/main/engine/writer-prompt.ts`. The preview reads the saved `persona`
text. Refresh reloads that context file; it does not select the card again.

`bookPersonaEnabled` controls delivery on the next run. It does not select a
card or update its text. The runtime read filter removes disabled card text
from delivered context. App resource updates do not rewrite existing packs.

On 2026-10-09, two context files in the reported book still contained the old
official `storyteller-witty` body. Both matched the official card before the
craft prose revision. The current repository and installed App card matched.
After a local backup, only those two `persona` values were replaced with the
current installed card. The context without a persona was left unchanged.
The other 152 project files had unchanged content hashes. The installed App
then showed the new card, with its switch still off.

That repair did not add automatic synchronization or change App code.

## Current source loading

The follow-up implementation resolves current text through the engine's
`context-persona` module. Preview and main/child runtime Read tools use the same
App adapter, `readBookPersona`. Card identity comes from `persona_source` in new
packs or the existing chapter capability receipt in older packs. Official cards
follow the installed engine. Imported cards keep their version lock. The engine
refreshes pack discovery on each resolution; it does not cache card bodies.

Inline cards without provenance remain intact. A changed snapshot body hash
marks an explicit inline edit, which also remains intact. Chapter-omitted cards
are not restored. A missing known source appears as a preview error and stops
enabled runtime delivery. Disabled delivery skips resolution and removes voice
text and provenance. Provenance is not delivered to the model.

Brief reads reject source changes since context generation or source timestamps
newer than the brief. The main workflow must rebuild context and brief before
dispatch. Dynamic reads leave saved context and manuscripts unchanged. Both
source preview and runtime delivery require verification; a current source file
alone does not prove either path.
