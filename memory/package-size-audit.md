# Package Size Audit

Date: 2026-10-08

## Scope

The first pass was a read-only audit of the installed macOS arm64 app.
The cleanup below changes packaging only. No migration decision was made.

## Measured Baseline

`du` reports about 780 MiB of allocated disk space for
`/Applications/NarraCat.app`. This is installed size, not download size.

| Component | Approximate size |
| --- | ---: |
| Electron and other frameworks | 216 MiB |
| app.asar | 271 MiB |
| app.asar.unpacked | 85 MiB |
| NarraCat Agent Core | 108 MiB |
| Local embedding model | 99 MiB |

The ASAR header reports these file payload sizes:

- Dependency source maps: 101.27 MiB.
- Type declarations: 9.24 MiB.
- Selected renderer packages and their dependency packages: 84.58 MiB.
- better-sqlite3 non-macOS prebuilds: 12.38 MiB.
- better-sqlite3 dependency source files: 9.78 MiB.

These categories overlap. Do not sum them as independent savings.
The union of source maps, type declarations, the selected renderer packages,
SQLite dependency source files, and non-macOS SQLite prebuilds is 176.9 MiB
of file payload. This is a candidate exclusion set, not verified savings.
The renderer package group includes React, Lucide, Three.js, graph packages,
Framer Motion, routing, and Markdown packages. Confirm each runtime import
before excluding a package. The built renderer itself is about 21 MiB.

## Current Constraints

- `package.json` ships production dependencies with electron-builder. Its
  source-map exclusion covers `out`, not all dependency packages.
- The embedding model is already q8. It supports local semantic memory;
  moving it to an on-demand download changes first-use behavior and does not
  reduce disk use after download.
- The Pi runtime uses Node.js. NovelMemory uses Electron utilityProcess,
  `process.parentPort`, and an injected SQLite driver. A shell migration must
  replace those host interfaces and validate native dependencies.

## Recommendation

Audit and trim runtime packaging before changing the desktop framework.
If a shell migration is selected, evaluate Tauri 2 with the existing React
renderer and a bundled Node.js sidecar for the Agent runtime. Validate real
writing, cancellation, memory retrieval, native modules, system credentials,
updates, and macOS WebKit rendering before a full migration.

## Migration Size Estimate

For macOS arm64, retain the current model and features. Budget about
80-120 MiB for a standalone Node.js runtime and 5-15 MiB for the Tauri host.
These are planning allowances, not measurements of a built migration.
The local Homebrew Node executable is a dynamic loader and cannot establish
the size of a self-contained distributable runtime.

- Shell replacement with unchanged dependency payload: about 650-700 MiB.
- Shell replacement and verified packaging cleanup: target 450-550 MiB.
- Additional dependency consolidation may approach 400 MiB, but this requires
  a real packaged prototype and runtime verification.

The shell replacement saves about 80-130 MiB after adding the Node runtime.
Moving the 99 MiB model to an on-demand download reduces initial package size
only. It does not reduce total disk use once the model has been downloaded.

References:

- https://v2.tauri.app/learn/sidecar-nodejs/
- https://v2.tauri.app/reference/webview-versions/
- https://blackboard.sh/electrobun/

## Verified Cleanup

Tracking issue: https://github.com/yannikzz/narracat-novel-agent/issues/126

Renderer-only dependencies moved to `devDependencies`. Package filters exclude
source maps, declarations, build caches, SQLite build sources, foreign SQLite
prebuilds, foreign Koffi binaries, and Koffi link artifacts. The Agent Core stage
uses the same native target rules. The archive audit checks the new boundaries.
The bundled embedding model remains included.

The baseline is the existing generated artifact measured immediately before
the cleanup. Use this baseline for the comparison, rather than the older
installed app. The app measurement uses `du -sk` allocated disk space; archive
measurements use file bytes. All values below are MiB.

| Artifact | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| macOS arm64 app | 795.91 | 580.87 | 27.02% |
| DMG | 295.83 | 246.17 | 16.79% |
| ZIP | 287.91 | 240.72 | 16.39% |

The final app.asar is 101.50 MiB. Its unpacked file payload is 35.77 MiB.
The archive contains no source maps or type declarations. SQLite and Koffi
prebuilds each retain only the macOS arm64 binary. Sampled renderer packages
are absent as standalone runtime packages.

Verification:

- Full suite: 3874 passing tests, no failures.
- Type checks, design checks, architecture checks, and bundle build passed.
- Signed macOS packaging, boundary audit, and deep strict signature check passed.
- Packaged memory smoke passed: model load, 768-dimensional embedding,
  SQLite vector extension, retrieval, and worker RPC.
- An isolated user profile verified the actual packaged renderer, PDF and EPUB
  reading, scanned-PDF rejection, and Pi session creation. No model request was
  made. No renderer errors were observed.
- Windows file selection was tested with electron-builder's real matchers.
  A Windows artifact was not built or run on this Mac.
- `ops:check` still reports eight existing document issues. The affected files
  matched the parent before the progress update.

The new local package is Developer ID signed, not notarized. It has not replaced
`/Applications/NarraCat.app`. Nothing was pushed or released.

Maintenance details:

- Platform-specific `files` arrays replace the main app selection. Retain
  `out/**` in each array. Negative-only arrays make electron-builder fall back
  to copying the repository. The boundary audit caught this during packaging.
- Run electron-builder matcher checks in a Node subprocess. Importing its
  implementation into the Bun test process installs a global source-map stack
  handler that interferes with PDF.js error construction.

Local evidence: `/tmp/narracat-size-before.json`,
`/tmp/narracat-size-after.json`, `/tmp/narracat-size-package.log`,
`/tmp/narracat-size-tests.log`, and `/tmp/narracat-size-smoke.json`.
