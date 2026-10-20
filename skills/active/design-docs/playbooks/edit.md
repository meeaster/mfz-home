# Playbook: an editing pass

An editing pass rewrites what a design already says so it reads better: easier to take in, said once, named in words, with its references disclosed rather than inline. The meaning stays; nothing is decided, answered or added. The user asks for one ("tighten the overview", "cut the duplication in D9", "bring this design up to the current standard"), and reviews every rewrite side by side before any reaches the design.

Changes that come from a meeting, an email, an answer or the user's notes change what the design says; they go through [the update playbook](update.md), never this one.

## 1. Read and find the rewrites

- `design.json` in full, and every page in scope.
- Run `check`: its warnings name the status narration and the IDs still in brackets.
- Read [writing](../references/writing.md#less-on-the-page) for the rules the pass applies. Look for what `check` can't see: a paragraph that restates another (an overview's In short against its whole-system text, a decision's Explanation against its option cards); text that retells a finding instead of citing it, or a diagram instead of letting it show; and walls of text, which the rewrite breaks into pieces rather than cuts for length.

## 2. Draft the changes

Write each rewrite to `<design>/.review/changes.json`. The folder ignores itself in Git; nothing in it is published.

```json
{"changes": [
  {"id": "C1", "where": "D9 · Explanation", "why": "One long paragraph that retells the option cards and Security's reply",
   "target": {"file": "design.json", "record": "D9", "field": "Explanation"},
   "was": "<the field's current value, exactly>", "proposed": ["Means here: …", "Matters because: …"]},
  {"id": "C2", "where": "Overview › In short, third paragraph", "why": "Repeats The whole system's second paragraph",
   "target": {"file": "pages/overview.md"},
   "was": "<the paragraph's Markdown, exactly>", "proposed": "<the new Markdown>"}
]}
```

- A record field's target is `record` and `field`, with `option` for an option's field; `file` is `evidence.json` for a finding. `was` is the value as it is now, string or list.
- A page's target is its file; `was` is a passage that occurs once in it, usually one paragraph.
- One change per field or paragraph, so each can be judged alone. `why` says what the rewrite fixes in a line.
- A rewrite may cut references and turn bracketed IDs into linked phrases; it can't cite anything the current text doesn't, and `apply-changes` refuses one that does.

## 3. Show them

Run `node <skill>/scripts/doc.mjs review <folder>` and open `<folder>/.review/<slug>.review.html`. Each changed passage has a flag that opens the current and changed text side by side; "N changes" in the top bar lists them all and goes to each, and Current / Changed switches the whole doc. Tell the user it's ready and what the pass covered.

## 4. Revise with the user

The user reads the changes and says what they think. Rework the drafts they want different, drop the ones they don't want, rebuild the review copy, and repeat until they say which to apply.

## 5. Apply, log, check

- `node <skill>/scripts/doc.mjs apply-changes <folder> C1 C3` (or `all`) writes them into the design and drops them from the draft. It skips any whose text has changed since it was drafted; redraft those.
- Log one entry in `changes.md` under the session, naming each change by what it touched ("Editing pass: D9 Explanation in parts; overview In short cut to three paragraphs").
- Run `check` and `build`, read the warnings that remain, and look at each page you changed.

## 6. Report

What was applied, by what it touched; what the user dropped; the warnings left and why.
