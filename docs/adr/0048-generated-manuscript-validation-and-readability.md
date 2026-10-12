# ADR-0048: Validate generated manuscripts and report readability findings

Status: Accepted
Date: 2026-10-12

## Context

A packaged writing run saved a draft to its formal path. The manuscript check
treated the absence of staging as success, and a short draft entered memory and
completion progress. Continuity review passed because its instructions excluded
sentence meaning and readability. The final report overstated both results.

## Decision

- Explicit manuscript preflight checks the working file, including formal paths.
  It rejects missing files and returns the measured count and target range.
- Memory and completion gates also check formal files when the chapter has an
  active write or rewrite checkpoint. Author memory sync outside generation
  retains its existing contract behavior. Preflight does not normalize formal
  files or invalidate their review fingerprints.
- Rewrite builds a fresh brief from current sources and writes to staging. It
  reuses write's single cold revision and checks the final file before review.
- Context assembly returns `draft_path` for generation and `manuscript_path`
  for reading the working or existing manuscript. The presence of a formal
  manuscript must not change the generation target. Review and author sync keep
  the existing read-path behavior.
- Review issues can carry an optional `continuity` or `readability` category.
  Confirmed factual or semantic errors remain blockers. Readability advice is
  a note and triggers at most one targeted revision in a writing workflow.
  The final review follows all edits and checks the whole chapter. Earlier
  findings guide attention but do not limit review to repaired sentences.
  Remaining notes are reported to the author; the single-revision limit remains.
- Briefs describe facts and scene priorities without prewriting decorative
  narration or forcing several required facts into one speech.
- Chapter request files preserve the author's original words. Writer and reviewer
  tasks read them directly when present. A compressed brief must not replace or
  change those requirements, and completion claims must match the final text.

## Consequences

Existing review records remain valid without a category. No database migration
or new agent role is required. Mechanical checks, continuity verdicts, and
readability advice have distinct meanings. None guarantees prose quality;
installed-App output still requires reading and author feedback.
