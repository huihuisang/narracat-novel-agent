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

For similar repairs, verify the exact historical official body before any
replacement. Preserve custom cards and absent cards. Older packs do not record
card provenance, so a general automatic replacement is not safe. This repair
did not add automatic synchronization or change App code.
