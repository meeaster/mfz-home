# Pages and how a doc grows

A design doc is one HTML file per design, made of pages and built from the design's records. The reader sees one page at a time and switches with the page list at the top of the rail. Every E, Q, D and R number is unique across the whole doc, so a marker on any page opens the same card.

The doc records where the design stands. It doesn't say what to do next: who to chase, what to ask at the next meeting, or which question to settle first. Nothing records that; an agent proposes it from the records when someone asks.

## Page types

| Group | Page | Holds |
| --- | --- | --- |
| `overview` | Overview | The problem, the goals, the whole system, and every record's current state: requirements, how the design measures up, cost, risks, the plan, decisions and open questions, grouped by the area each lives on with the ones that span areas first. Progress sits under its header. |
| `plan` | Plan, once the design has deliverables | Goals, the plan as a map of deliverables (each in a column by what must come first, so those in one column can run in parallel, in its group's colour, with its Jira items), and the deliverables table. Each deliverable opens in a modal with its scope, exit criteria, the goals it serves, what it follows and unblocks, and its Jira items as last read. Copy `assets/pages/plan.md`. |
| `area` | One per part of the design that has records of its own | That part in detail: its own requirements, design diagram and parts, how it measures up, risks, decisions and questions, then the ones from elsewhere that reach it. |
| `brief` | One per decision that needs its options weighed side by side | The question, a decision map, the options with diagrams, comparison and cost, and the open questions that block it. See [writing](writing.md). |
| `shared` | Evidence, Meetings, Links | Every finding, every meeting, and the Confluence pages, Jira items and other links around the design. A new design has no Meetings page until its first meeting is recorded, and no Links page until it has links: leave their includes out of doc.html until then. Copy `assets/pages/links.md`. |

## Scope

The skill is for designing something that will be built or changed. A vendor or tool choice is usually one decision: a doc that is mostly one brief. An investigation (why is something slow?) is mostly questions and evidence until the cause is known; keep it small (an overview with its questions, and a brief once there are options) rather than filling sections that have nothing to say yet.

## Starting and growing

- **One question to take to a meeting:** a doc with a brief page and the shared pages. The brief shows the requirements, decisions and questions itself.
- **What we're building:** start with an overview, briefs as decisions need them, and the shared pages. No areas yet: every record lives on the overview.
- **When to split off an area:** when a part has requirements, decisions and questions of its own, and most of them would live on it alone. Give it a page, set `Page: <area id>` on the records that belong to it, and its parts move with them. Records don't have to be re-entered; only where they live changes. Areas can come later: a design is often only clear about its parts once the first decisions are made.
- **How to split:** choose areas so most records live in one of them. Pipeline stages, layers (UI, API, infrastructure), capabilities (sign-up, billing), migration phases, or systems all work when they keep records apart. If most records would reach two areas, the split is wrong; try another.
- **A brief that grows into a design:** add an overview, and delete the brief's Requirements and Decisions sections, and move its `context`, if any, to the overview. The records don't move; only where they're shown does.
- **When to write a brief:** when a decision has at least two real options that need comparing in a meeting, with diagrams. Many decisions don't: one settled in a meeting, or with an obvious answer and a finding behind it, is a row in the decisions table and nothing more. In between, an area page can weigh a small decision about its own part in a comparison table or compact option cards.
- The plan is the design's delivery units: deliverables with scope, exit criteria, status, what each follows, a group, the goals they serve and their Jira items, in design.json's `plan`, the overview's Plan table and the Plan page. Leave implementation plans and task lists out; how an effort builds a deliverable goes in its local `design.json`, and its stories in Jira.

## Where each record lives

Every requirement, decision, option, part, risk, question, finding and meeting is a record in `design.json` (see [records](records.md)). A record lives on one page, and is worked on there:

| Record | Lives on |
| --- | --- |
| Requirement, decision, part, risk | Its `Page`, or the overview when it has none. Put a record on the overview only when it's about the whole design (how it's divided, what runs it, a rule every area follows); otherwise it lives with whoever owns it, and `Applies to` names the other areas it reaches. |
| Question | Wherever the things it blocks live: an area when they all live on it, the overview when they span pages. It isn't set by hand. |
| Evidence, meeting | The shared pages. |

Pages show records through their standard sections and components, and point at them with markers and mentions; they never define one. Each record is defined once, on the overview (or the first page when a doc has none): its row there is what every card opens. An answered question is defined in the Answered list on the page it lived on. So a status changes in one place, and every table, card and decision marker on every page follows.

## The overview gathers everything

The overview's requirements, measures, risks, decisions and open questions tables list every record, grouped under "Across all areas" and then one group per area with a link to its page. Reading the overview alone shows the state of the whole design; an area adds the detail. The cost table follows the same grouping, with each area's subtotal.

An area page shows its own records under "This area", then the ones from elsewhere that reach it, each saying where it lives:

| Table | From elsewhere |
| --- | --- |
| Requirements | "Applies here, lives elsewhere": requirements whose `Applies to` names the area |
| Decisions | "Decided elsewhere, shapes this area": decisions whose `Applies to` names it |
| Risks | "Owned elsewhere, affects this area": risks whose `Applies to` names it |
| Open questions | "Owned elsewhere, affects this area": questions that block something living on the area, or a requirement that applies to it. A decision's own questions stay with the decision. |

## Progress

The progress line under an overview's or area's header shows how much is settled; the build adds it. On an overview with areas: a tile per area with its decision markers (coloured by status), how many are decided, and its open questions. On an area page, or an overview without areas: one line with the decisions decided out of the total and the open, deferred and answered questions, naming the records from elsewhere that still shape it. It counts only the page's own records, so the areas add up to the overview, and leaves out Given decisions, which were never the design's to make.

## The decisions table

One row per decision, laid out like a question's row so the table reads down one column rather than across several full ones. Each row comes from the decision's record:

- the question, and under it its status (open, leaning, decided, or plain for Later and Given; decision markers across the doc take their colour from it) with the answer, the current leaning or what's assumed meanwhile, or, with none of those, what it shapes; then the AI's recommendation while it's open
- what it's waiting on
- where it's worked out (its brief or area page, the meeting that settled it, or "No brief yet" / "Not started") and the other areas it shapes
- clicked, on the overview or an area page, the decision opens in a modal: the AI's recommendation first while it's open, then its Explanation, its answer, Why, Reasoning and Revisit if, and its options or alternatives each with a status and reason; beside them, the questions it waits on, where it's worked out, the other areas it shapes, and its evidence. The decision's card shows the Why under the answer, with "Open details" opening the same modal.

Within each group, unsettled decisions come first. A decision with no brief is normal. It stays a row, with its evidence and the meeting that settled it.

Question rows open the same way: the AI's recommendation first while the question is open, then its Explanation, then So far, its Answer, or why it was deferred and what it could reopen; beside them when its answer is needed, who to ask (only when someone was named), what it blocks, its evidence, and where it lives. Each row says how far the question has got (open, partly answered, deferred) apart from when its answer is needed. A risk with an Explanation opens the same kind of modal; the rest stay one line. On a brief's decision map, a question's box, or a decision without a section on the brief, opens its modal too; the Explanation lives only in the modals, so the tables stay one line a record.

## Page files

- A design folder holds `design.json`, `changes.md`, `doc.html`, a Markdown file per page in `pages/`, and the doc's own components in `components/`. The format of pages and components is in [components](components.md).
- `doc.html` is the shell: `<!-- include pages/<id>.md -->` lines in reading order, the shared SVG definitions (arrowheads and icons), the rail with its `<!-- pages-nav -->` and `<!-- page-rails -->` markers, and the top bar. Drop the top bar's diagrams switch when nothing in the doc has a security view. `build` puts it all together into one file.
- Section ids are shared by the whole doc, so each page's sections start with its prefix (`s3-design`). Link to a page with `href="#<page id>"` and to anything on it by its id; `?page=<id>` in a URL opens the doc on that page.
- The Evidence page fills its "Cited on" column from the markers on other pages, so it needs no maintaining.

## Format and migrations

`design.json`'s `"format"` key (3) is the format its folder is written in. When the skill's format moves on, `check` stops and says so; `doc.py migrate <folder>` copies the folder's files to `.migrate-backup/`, brings pages and records up to date, and records the new format. Review what it changed before building. Format 1 folders (pages written in HTML) migrate to Markdown pages that keep any hand-written HTML as raw blocks; move those into components or records when you next work on that part. Format 2 folders (records in design.md) migrate to design.json, evidence.json and meetings.json with the same records; their older meetings have no Outcomes, and none are invented for them.
