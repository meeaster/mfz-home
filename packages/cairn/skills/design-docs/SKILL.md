---
name: design-docs
description: Create, continue, and publish designs, the stable, agreed record of what is being built or changed and why. A design is a folder of records (design.md, with the problem, goals, how it works, requirements, phases, decisions and their options, parts, evidence, open questions and meetings) and the self-contained HTML design doc built from them, with an overview that gathers every record's status, area pages that go deeper on each part, decision briefs for meetings, and shared evidence and meeting pages. Use whenever the user wants to write up or pick up the design of something that will be built or changed (a system, a feature, a migration), record a decision or finding about a system, prepare a decision for a meeting, compare options for a team or a manager, go through a meeting's outcomes for a design, show a security or compliance team how data flows and where it crosses a boundary (GovCloud, FIPS, CUI), or publish a design doc, even if they call it an architecture doc, design page, options paper, decision record, or "something to walk the team through". Not for implementation plans or task lists.
---

# Design docs

A design is the lasting, agreed record of a body of work: what is being built or changed, why it's worth doing, how it works, its phases, and what has been decided. It sits in its own folder while the efforts on it come and go, and it is what others review and approve. Its `design.md` holds all of it: the problem, goals and how it works in prose, then requirements, phases, decisions and their options, parts, risks, open questions, evidence, and meetings. It is the single source of truth, read in full by whoever picks the design up next, so its prose carries the connected understanding and its records carry the facts. The doc is how the design is shown to people who don't all know the system: pages of prose and pictures, with every table, option card and decision map rendered from the records and every reference opening a card. Pages are short Markdown files; the skill renders their structure, and what's particular to a design (its pictures, and any part better built for it than reused) is a component in its folder, bound to the records so it follows their status. It records where the design stands, never what to do next; an agent proposes that from the records when someone asks. The published doc is one HTML file that goes anywhere.

## Kit

| File | Use |
| --- | --- |
| `assets/template/` | Starting point, copied whole: `design.md`, `changes.md`, `doc.html` (the shell and rail), the overview and evidence pages, and `components/` |
| `assets/pages/` | Pages to copy in when the design needs them: `brief.md`, `area.md`, and `meetings.md` with the first meeting |
| `assets/example/` | A complete design (log ingestion in GovCloud): its records, an overview, four area pages, a brief with two options, the shared pages, and its own components. Build it and read it before making a doc; copy structure from it, never its content. |
| `assets/components/` | The skill's components: design cards, option cards, comparison, cost, decision map, flows, keys, goals, callouts |
| `assets/doc.css`, `assets/doc.js` | Shared styles (light and dark) and behaviour: pages, reference cards, rail tracking, views, theme toggle. Inlined at build time. |
| `scripts/doc.py` | `check` a design folder, `build` the publishable single file (optionally with only some pages), and `migrate` a folder written for an older version of the skill. Rendering uses Node. |
| `scripts/shot.mjs` | Screenshot the built doc in headless Chrome: a page, one element, a card open, the security view, or dark mode |
| [references/records.md](references/records.md) | The format of design.md and changes.md, and the placeholders that render records into pages. Read before writing or changing any record. |
| [references/lifecycle.md](references/lifecycle.md) | Where designs live, linking them to efforts, picking one up, working on it, meeting intake, checking, building, previewing, and publishing. Read at the start of every session on a design. |
| [references/pages.md](references/pages.md) | Page types, when to split off an area, where each record lives, and how the overview gathers them. Read before starting or restructuring a doc. |
| [references/writing.md](references/writing.md) | What goes in each section and how to write it. Read for every new doc and substantial revision. |
| [references/components.md](references/components.md) | The page format, the skill's components, a design's own components, bindings, and the markup they build from. Read before writing or editing any page or component. |
| [references/diagrams.md](references/diagrams.md) | Diagram conventions and how to place boxes and connectors. Read before drawing any diagram. |
| [references/security.md](references/security.md) | Security view: compliance boundaries, numbered data flows, protection, and where data rests. Read whenever the design touches data handling, network paths, identity, or a regulated environment. |

## Start a design

1. **Pin down what's needed.** Is it one question to settle in a meeting (a brief), a picture of what's being built (an overview), or more detail on one part of an existing design (an area page)? A new design starts with an overview and no areas; split one off when a part has requirements, decisions and questions of its own. Check whether a design for this system already exists; extend it rather than starting another. Establish the audience and any meeting it's for. Ask when that's unclear; otherwise proceed and state assumptions. See [pages](references/pages.md).
2. **Get the folder** as described in [lifecycle](references/lifecycle.md), copy the template into it, and link the design to the current effort.
3. **Gather what's known** from the conversation, knowledge articles on the systems involved, the effort's files, infrastructure-as-code repositories, read-only cloud and vendor sources, and documentation. Anything unknown becomes an open question with someone who can answer it, not a guess.
4. **Write design.md**, per [records](references/records.md): the problem, goals and how it works in prose, then requirements, phases, decisions with their options, parts, risks, questions and evidence, each record with `Recorded from` and each open decision and question with an `Explanation` of what it asks and where it fits. Check that every claim and every part has a finding or a question behind it.
5. **Write the pages** from the templates, following [writing](references/writing.md), [components](references/components.md), and [diagrams](references/diagrams.md): the prose in each page's Markdown, and for everything else whatever shows it best: a skill component where one fits as it is, or a component of the design's own (every picture, and any section built for this problem), with the parts that wait on a decision bound to it. The skill's components are for what repeats, not a shape to force a design into; when one is close but not right, see [components](references/components.md#reuse-or-build). Draw "What we're after" without naming any product. Add sections a page needs and drop ones with nothing real to say.
6. **Add security views** when the design changes where data lives or travels, or the environment is regulated, per [security](references/security.md). Put compliance obligations in Requirements.
7. **Log the change** in changes.md, then **check and build** with `scripts/doc.py`. Fix all errors and read the warnings.
8. **Look at the built doc** in a browser, or with `scripts/shot.mjs` when no browser tool is available. Visit every page you changed. Fix clipped text, crossing labels, and misaligned arrows. Click a few markers to see their cards, including ones whose item lives on another page, and switch to the security view.
9. **Report back** with the design folder and built doc, the pages, the decisions and their status, the open questions and who can answer them, and anything unverified.

## Continue a design

- **Pick it up** the way [lifecycle](references/lifecycle.md) describes: read design.md in full and changes.md since the effort's last session, and run `check` to see whether the published doc is behind. When it says the folder is in an older format, run `migrate` and review the result first.
- **Record findings as you establish them.** Change a decision's status, the requirements, or a phase only on the user's word or a meeting's accepted outcome, and log each accepted change in changes.md. Record each fact once, where it lands, and refer to it by ID everywhere else, following [lifecycle](references/lifecycle.md#designs-and-efforts).
- **After a meeting or an email** that bears on the design, go through its candidates with the user, apply what they accept, record a meeting on the Meetings page, and log the changes, following the meeting and email steps in [lifecycle](references/lifecycle.md).
- **When a question is answered**, the answer becomes evidence and the question gets Answer and Answered by; update what it blocked, per [writing](references/writing.md#open-questions).
- **When a decision is made**, set its status in design.md with a Why (what tipped it, citing evidence), mark its options Chosen or Not chosen with why, and add Reasoning or Also considered where they help a later reader. Then bring the pages in line: bound parts and rendered cards follow on their own; redraw a picture only where what was chosen differs from what it shows, and make "In short" say what changed.
- Keep every E, Q, D, and R number stable. Rebuild and re-check after every update, and refresh the "Updated" date on each page that changed.

## Boundaries

- Don't claim FIPS validation, an authorization, encryption, or privacy without evidence. Unconfirmed security claims are questions.
- Only mark a decision Decided when the team decided it. Use "Leaning" for a direction the team is taking that isn't settled. Record the reason given; don't invent alternatives that nobody weighed.
- Keep local paths, machine names, and private links in `Recorded from`, the one field that is never published. `check` blocks the obvious cases, but judgement covers the rest.
- Gather evidence read-only. Changing infrastructure or accounts is outside this skill.
- Publish, commit, or push only when the user asks, and only the built file.
