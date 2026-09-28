---
name: design-docs
description: Create, update, and publish design docs and decision briefs as portable HTML. A design doc is one self-contained file per effort, made of pages. An overview shows what's being built end to end (architecture and security diagrams, the parts, every decision it depends on and its status, how it meets the requirements, cost, risks). Area pages hold detailed designs of one part. Decision briefs bring one open question to a team meeting with options, diagrams and comparisons. Shared pages hold cited evidence, open questions with who can answer them, and meeting summaries. Use whenever the user wants to write up an architecture or infrastructure design, lay out what a system will look like while decisions are still open, prepare a decision for a meeting, compare options for a team or a manager, add detail on one area of a design, update a doc or brief from a meeting transcript, show a security or compliance team how data flows and where it crosses a boundary (GovCloud, FIPS, CUI), or publish one (for example to GitHub Pages), even if they call it an architecture doc, design page, options paper, decision record, or "something to walk the team through". Not for implementation plans, task lists, or general documentation.
---

# Design docs

A design doc is one HTML file for an effort, read on a shared screen by people who don't all know the system. It starts small and grows: a single brief for one question, or an overview of what's being built, then area pages and more briefs as the work needs them. Evidence, open questions and meetings live on shared pages, and every reference opens a card, so any page can point at anything. The published file carries its styles and behaviour inline and goes anywhere.

## Kit

| File | Use |
| --- | --- |
| `assets/template/` | Starting point: `doc.html` (the shell and rail) and one file per page type in `pages/` |
| `assets/example/` | A complete doc (log ingestion in GovCloud): overview, an S3 archive area page, a brief with two options, and the shared pages. Build it and read it before making a doc; copy markup from it, never its content. |
| `assets/doc.css`, `assets/doc.js` | Shared styles (shadcn neutral theme, light and dark) and behaviour: pages, reference cards, rail tracking, views, theme toggle. Inlined at build time. |
| `scripts/doc.py` | `check` a doc, then `build` the publishable single file, optionally with only some pages |
| `scripts/shot.mjs` | Screenshot the built doc in headless Chrome: a page, a card open, the security view, or dark mode |
| [references/pages.md](references/pages.md) | Page types, when to add one, and where each item is defined. Read before starting or restructuring a doc. |
| [references/writing.md](references/writing.md) | What goes in each section and how to write it. Read for every new doc and substantial revision. |
| [references/components.md](references/components.md) | HTML for each part, including how references open cards. Read when building or editing markup. |
| [references/diagrams.md](references/diagrams.md) | Diagram conventions and how to place boxes and connectors. Read before drawing any diagram. |
| [references/security.md](references/security.md) | Security view: compliance boundaries, numbered data flows, protection, and where data rests. Read whenever the design touches data handling, network paths, identity, or a regulated environment. |
| [references/lifecycle.md](references/lifecycle.md) | Working folder, private links file, updating after meetings, checking, building, previewing, and publishing |

## Create or extend a doc

1. **Pin down what's needed.** Is it one question to settle in a meeting (a brief), a picture of what's being built (an overview), or more detail on one part of an existing design (an area page)? Establish the effort, the audience, and any meeting it's for. Ask when that's unclear; otherwise proceed and state assumptions. See [pages](references/pages.md).
2. **Gather what's known.** Collect it from the conversation, the effort's files, infrastructure-as-code repositories, read-only cloud and vendor sources, and documentation. Record each finding with how it was established. Anything unknown becomes an open question with someone who can answer it, not a guess.
3. **Get a working folder** as described in [lifecycle](references/lifecycle.md), or use the doc's existing folder.
4. **Outline before writing HTML:** the pages, the requirements, the decisions and where each is worked out, each brief's options, the evidence list, and the open questions. Check that every claim and every diagram element has a finding or a question behind it.
5. **Build the pages** from the templates, following [writing](references/writing.md), [components](references/components.md), and [diagrams](references/diagrams.md). Add sections a page needs and drop ones with nothing real to say.
6. **Add security views** when the design changes where data lives or travels, or the environment is regulated, per [security](references/security.md). Put compliance obligations in Requirements.
7. **Check and build** with `scripts/doc.py`. Fix all errors and read the warnings.
8. **Look at the built doc** in a browser, or with `scripts/shot.mjs` when no browser tool is available. Visit every page you changed. Fix clipped text, crossing labels, and misaligned arrows. Click a few markers to see their cards, including ones whose item lives on another page, and switch to the security view.
9. **Write the private links file** for anything that came from local files, private URLs, tickets, or sessions.
10. **Report back** with the source and built paths, the pages, the decisions and their status, the open questions and who can answer them, and anything unverified.

## Update a doc

- **After a meeting**, follow the meeting steps in [lifecycle](references/lifecycle.md): summarise it on the Meetings page, apply its changes to every page it affects, list them under "Changed in this doc", and add the next meeting.
- **When a decision is made**, change its status in the decisions table, then bring the diagrams in line: a dashed part becomes solid, or is redrawn to match what was chosen.
- **For new evidence or answers**, add or update items in place. Keep every E, Q, D, and R number stable.
- Rebuild and re-check after every update, and refresh the "Updated" date on each page that changed.

## Boundaries

- Don't claim FIPS validation, an authorization, encryption, or privacy without evidence. Unconfirmed security claims are questions.
- Only mark a decision Decided when the team decided it. Use "Leaning" for a direction that isn't settled.
- Keep local paths, machine names, and private links out of the doc; they belong in the links file. `check` blocks the obvious cases, but judgement covers the rest.
- Gather evidence read-only. Changing infrastructure or accounts is outside this skill.
- Publish, commit, or push only when the user asks, and only the built file.
