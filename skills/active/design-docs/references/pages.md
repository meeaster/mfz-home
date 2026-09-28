# Pages and how a doc grows

A design doc is one HTML file per effort, made of pages. The reader sees one page at a time and switches with the page list at the top of the rail. Every E, Q, D and R number is unique across the whole doc, so a marker on any page opens the same card.

## Page types

| Group | Page | Holds |
| --- | --- | --- |
| `overview` | Overview | What we're building, end to end: in short and terms, the requirements that span the system, the solution diagram (architecture and security views) with its parts table, the decisions table, how the design measures up against the requirements, cost, and risks. |
| `area` | One per area that needs its own design | A part of the system in more detail than the overview can hold (an archive's bucket layout, a pipeline's routing rules, a network's segmentation). In short and terms, its own requirements plus the overview requirements that apply, a design diagram with a parts table, and how it measures up. Add cost or risks when they're specific to it. |
| `brief` | One per decision that needs a meeting to settle it | The question, a decision map, and the options with diagrams, comparison, and cost. See [writing](writing.md). |
| `shared` | Evidence, Open questions, Meetings | Every finding, every open question, and every meeting, for the whole doc. |

## Starting and growing

- **One question to take to a meeting:** a doc with a brief page and the three shared pages. The brief defines its own requirements and decisions.
- **What we're building:** a doc with an overview and the shared pages. Add briefs and area pages as they're needed.
- **A brief that grows into a design:** add an overview, then move the brief's requirements and its decision definitions into the overview (see below). The brief keeps its options.
- **When to give an area its own page:** when it has a diagram at a finer level than the overview's, decisions of its own, and different reviewers or a different pace. Until then it's a row in the overview's parts table and a box in its diagram.
- **When to write a brief:** when a decision has at least two real options that need comparing in a meeting, with diagrams. Many decisions don't: one settled in a meeting, or with an obvious answer and a finding behind it, is a row in the decisions table and nothing more. In between, an area page can weigh a small decision about its own part in a comparison table or compact option cards; once the options need their own diagrams or a meeting of their own, give it a brief.
- Leave implementation plans and task lists out. Link to where the work is tracked, if anywhere. A short Rollout section on the overview is fine when the order of change is itself a design question, such as a migration where old and new run side by side.

## Where each item is defined

Each item is written once, in one place, and everything else points at it:

| Item | Defined on | Elsewhere |
| --- | --- | --- |
| Requirements | The overview for the whole system; an area page for its own. A brief without an overview defines its own. | Other pages list a requirement with an `R` marker, not a second definition. |
| Decisions | The overview's decisions table. A brief without an overview defines its decisions in its decision sections, and the ones it shows only for context in a short "Other decisions" table. | Markers on diagrams and in tables. A brief's decision section is a plain section with the marker in its title, so its status is only ever set in the table. |
| Evidence, questions | The shared pages. | Markers and mentions on any page. |
| Meetings | The Meetings page. | Links from the decisions table ("Aug 14 · Platform sync"). |

`check` warns when evidence or a question is defined outside the shared pages, and fails on a duplicate id anywhere.

## The decisions table

One row per decision, grouped into "Still open", "Decided", and "Given" (premises the plan or requester fixed, with the request as their source) when there are any. Each row is the decision's definition:

- the question as `data-ref-text`, with what it shapes as a `.sub` line
- a status (`open`, `leaning`, `decided`, or plain for Later). Decision markers across the doc take their colour from it.
- the answer, the current leaning, or what's assumed meanwhile, as a `data-ref-detail`, plus a `.marks` group of what it's waiting on (`data-ref-detail="Waiting on"`)
- where it's worked out: a `page-link` to its brief or area page with `data-ref-link="Open the brief"` so the card links there; a meeting link for a decision made in a meeting; or "No brief yet" / "Not started"

A decision with no brief is normal. It stays a row, with its evidence and the meeting that settled it.

## Page files

- Each page is a file in `pages/`, pulled into `doc.html` with `<!-- include pages/<id>.html -->`, in reading order. `build` puts them together into one file.
- A page is an `<article class="page">` with `id`, `data-page-title`, `data-page-group`, and optionally `data-page-icon` (a symbol id such as `i-database`) and `data-page-meta` (a short note shown beside it in the page list, such as "D6").
- The page's own rail content is a `<nav class="page-rail">` as the article's first child: its "On this page" links, decisions, and notes. `build` moves it into the rail and writes the page list.
- Section ids are shared by the whole doc; prefix them with the page id (`s3-design`).
- Link to a page with `href="#<page id>"` and to anything on it by its id. The script switches pages. Use `?page=<id>` in a URL to open the doc on that page.
- Shared pages fill their "Cited on" column (`<td data-cited-on></td>`) and their rail filter (`<div class="rail-group cite-filter">`) from the markers on other pages, so neither needs maintaining.
