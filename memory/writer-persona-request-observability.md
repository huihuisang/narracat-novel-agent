# Writer Persona and Request Inspection

Verified on 2026-10-08 against the installed app and local settings.

- `prose-overrides.json` in Electron userData stores the `writer-persona` override. `resolveAgentSkillOverrides` and `assembleAgentSkills` apply it to the chapter writer system prompt. Author requests are appended to that prompt.
- The chapter context pack also carries a book persona and style directive. These are separate from the app-level writer persona. Inspect both when writing style does not match the author's intent.
- Settings > About > Log File opens `logs/main.log`. This log records run metadata, not full prompts or HTTP payloads.
- `pi-agent/sessions/*.jsonl` records the main session, including `Task` arguments. Writer child sessions use an in-memory session manager. Their full system prompt and HTTP requests are not retained.
- A reconstruction from current settings proves current prompt assembly. It does not prove the exact payload sent by a past run. Historical request verification needs a capture at the provider request boundary.

Implemented on 2026-10-08 for issue #125 (ADR-0047):

- The project sidebar has a separate Writer Prompts page. It shows source text and the effective system prompt, with per-book persona, book voice, book style, and individual author requirement switches.
- Preferences live in `.narracat/writer-prompts.json`. Runtime and preview reuse the existing agent prompt assembler. Book context previews show the most recently generated chapter context pack.
- A custom runtime Read tool removes disabled voice cards before pagination without changing the stored pack. Disabling book style removes both `style_directive` and `style_examples`; older settings default to enabled style. Briefs older than a changed voice or style choice are rejected and must be regenerated. Cached sessions are invalidated after saving; active runs keep their captured choices.

Installed on 2026-10-08:

- The signed local build replaced `/Applications/NarraCat.app`. The package boundary audit and packaged memory smoke passed. The installed signature and app archive matched the new artifact, and 115 novel and settings files retained identical content during replacement.
- The installed app opened the real project's Writer Prompts page. The custom writer persona, book voice card, independent book style switch, and individual author requirements were visible. Live rewrite verification followed as recorded below.

Live rewrite verification on 2026-10-08:

- Launching the signed app with `--user-data-dir=<isolated-profile>` isolates test settings while retaining the app's normal Keychain identity. Verify `app.isPackaged`, `app.getAppPath()`, and `app.getPath('userData')` before a live test. Copy the novel and use SQLite backup for a consistent memory snapshot.
- Two complete rewrite runs used `glm-5.3-flash` and the same baseline. A disabled book voice and style; B also disabled the writer persona. Both kept the same author requirements and completed writing, review, memory commit, and progress update.
- Actual writer HTTP bodies contained 6641 system characters for A and 2706 for B. B removed the full 3935-character persona. After normalizing the copied working directories, the remaining system text matched. Model, tool, and generation parameters matched. Both actual context bodies matched and omitted `persona`, `style_directive`, and `style_examples`, which remained in the stored packs.
- Both manuscripts passed review and remained identical to their first drafts. These single samples do not establish a general quality effect. Disabling the persona does not disable separately enabled author requirements, which can contain overlapping writing rules.
- Test artifacts are under `/Users/huisang/Documents/NarraCat-Tests/writer-prompts-20261008/signed-tests/`. Request bodies were captured by temporary test instrumentation without authentication headers; the product still does not retain historical child HTTP bodies. The original manuscript, book config, persona override, and author requirements matched the baseline after testing.

Third live rewrite on 2026-10-08:

- C disabled the writer persona and enabled book voice and style. It used the same baseline, model, and author requirements as A and B. Its system contained 2706 characters and matched B after working-directory normalization. The actual context included a 368-character voice card, a 225-character style directive, and an empty style-example list. The remaining plot context matched B.
- C completed writing, passing review, memory commit, and progress update. The test driver cancelled the original run at an unrecognized downstream repair question. A continuation in the same isolated thread selected deferred repair and completed without rewriting or repeating memory operations. The final manuscript matched its first draft; later chapters and the original book and settings remained unchanged.
- The third sample had more short sentences and paragraph breaks. C enabled voice and style together, so this test does not isolate their separate effects. The comparison report is `三组对比.md` in the test artifact directory. A live-test driver must handle deferred downstream repair after the chapter is complete without automatically rewriting later chapters.

Pushed and reinstalled on 2026-10-08:

- Feature commit `f514f5bc` is on `feat/writer-prompt-controls` in `huihuisang/narracat-novel-agent`. It is a new child of the existing remote ebook-import commit, with the same full source tree as the tested local snapshot. No published commit was rewritten.
- The repository's local package workflow produced version `0.4.3` with Developer ID signing and Hardened Runtime. Packaged resource, memory, embedding, and DMG checks passed. The installed archive matched the new artifact. The old installation and build artifacts were preserved, and 101 novel and settings files retained identical content.
- Functional tests launched `/Applications/NarraCat.app` with an isolated profile and verified the separate page, three persisted source switches, disabled-source preview filtering, and no renderer errors. Resolve macOS temporary paths before comparing userData paths: `/var` and `/private/var` can refer to the same profile. This was a local signed package without notarization.
