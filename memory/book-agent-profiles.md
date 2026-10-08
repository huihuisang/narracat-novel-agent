# Book Agent Profiles

2026-10-08: the project Writer Prompts page becomes Agents Profiles. `AgentProfileInspector` provides the shared Settings layout; `renderInstructions` supplies book-specific sources. Settings retains global persona and requirement editing.

All five agents support per-book persona and individual author requirement switches. `.narracat/writer-prompts.json` retains its v1 schema and legacy writer choice. The reader defaults `disabledProseBlockIds` to an empty list when it is missing. Existing writer choices survive the extension. Book voice and style remain writer controls.

`resolveAgentPrompt` supplies the source preview and runtime definition. `resolveBookAgentOverrides` applies disabled sources to all dispatched agents. IPC validates agent ids and source ownership. Saving invalidates cached sessions; active runs retain their captured settings. Mandatory rules and official skills remain present.

Verification: 3,879 App tests, typecheck, design checks, and build passed. Development and signed packaged Electron checks cover all five profiles, source filtering, legacy settings, book isolation, persistence, global Settings editing, source ownership, and source dialogs at 1440 by 1000 and 1024 by 640. No provider write request was sent during these checks. The package resource audit, memory smoke, and signature verification passed.

The package source snapshot is `aad8aab63ee7c8049923c503b833480ba036fc76`. Delivery artifacts and UI evidence are under `~/Library/Application Support/NarraCat-install-backups/20261008-193533-agent-profiles/`. The first replacement attempt was deferred for an active author run. After the run ended and the author requested replacement again, the signed 0.4.3 App was installed at `/Applications/NarraCat.app`. All 136 novel and settings files retained their content; 2,928 installed files and links match the build. The old App is retained as `previous-installed-NarraCat.app` in the backup folder. Installed Electron source controls and dialogs passed the same isolated checks. This is a local signed package, without notarization. The author selected `main` on `huihuisang/narracat-novel-agent` for source delivery.

Check active runs from the current installed process startup, rather than the latest shared-log startup marker; package smoke processes can append another marker.
