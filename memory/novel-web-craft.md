# Craft reference maintenance

The source is `agent-core/narracat/skills/novel-web-craft/`. The chapter brief
compressor selects relevant advice and writes chapter-specific instructions.
The source library is not a checklist for the chapter writer.

## Editing boundaries

- Preserve pack ids, reference paths, triggers, tags, priorities, persona ids,
  names, files, authors, and keywords. The official pack manifest shares them.
- Preserve existing excerpts as quotations. Edit their commentary, not the
  quoted prose. A local review does not verify the excerpts' authorship.
- Keep the `[runtime]` and `[evidence]` markers and the sections required by
  `agent-core/narracat/scripts/craft-pack-lint.mjs`.
- Voice cards guide tone and attention. They do not require a fixed emotional
  sequence, sentence length, misunderstanding, or chapter ending.
- Check logic during brief preparation. Keep only the explanation the reader
  needs. Paragraphs follow connected action, observation, or thought.

## Verification boundary

Resource validation and loader tests check structure and selection. They do not
prove prose quality. Rebuild existing chapter briefs to use revised advice;
packaged installations require a new build to contain these source changes.
