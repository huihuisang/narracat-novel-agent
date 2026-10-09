# Writer Craft Sources

2026-10-09: book Agent Profiles adds two independent writer switches: `craftLibraryEnabled` for `novel-web-craft/SKILL.md` and `craftReferencesEnabled` for the selected `craft_pack_hints` reference files. Both default to enabled in older v1 settings. `craftSourcesChangedAt` invalidates chapter briefs that predate a switch, including re-enabling a source.

These sources enter the chapter through the main agent's brief compressor, rather than the writer system prompt. The Pi adapter captures choices once and applies source policy and Read filtering to main and child sessions. Disabled library and selected reference reads return a notice before pagination; disabled reference hints are removed from delivered context packs. Stored packs and card files retain their content. Canonical matching covers aliases; reading a rebuilt context pack refreshes cached reference paths.

The page retains the shared Settings layout. Settings remains global and read-only for official skill bodies. The book page shows the library body and the latest selected reference reasons, with source switches and an effective-source preview. Book voice, style, personas, plot data, and author requirements retain their independent controls.

Verification: four regression checks failed before implementation. All 3,884 App tests, typecheck, design and architecture checks, and build passed. Development Electron checks cover all four craft source combinations, source previews, book isolation, reload persistence, writer-only ownership, unchanged global Settings editing, and dialog scrolling at 1440 by 1000 and 1024 by 640. Dispatch tests exercise the actual main and child Read tools without provider requests. The existing eight OPS documentation failures remain unchanged.
