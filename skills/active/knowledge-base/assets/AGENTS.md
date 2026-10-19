---
knowledge-base-format: 1
---

# {{name}} knowledge base

{{what this knowledge base covers, and who reads it}}

This folder is a knowledge base kept with the `knowledge-base` skill. Load that skill before changing anything here.

## Looking something up

1. From this folder, run `grep -r "^description:" articles/` to list every article's one-line description.
2. Read the articles whose descriptions match, and any article they link to that bears on the question.
3. Answer from the articles. Each ends with a References list saying what each section rests on and when it was observed; cite those lines. Open a file in `sources/` or `evidence/` only when the articles don't answer the question or you're asked to check a claim.

## Rules that always hold

- Never change what is already written in `sources/` or `evidence/`. A thread may grow at its end; a later look at a system is new evidence.
- Every claim in an article is backed by its References list, and cites only files in this folder or origins listed in `origins.md`.
- After any change, run the skill's `check` on this folder.

## Local rules

{{rules particular to this knowledge base, or "None."}}
