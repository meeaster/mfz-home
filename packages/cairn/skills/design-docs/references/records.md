# Records: design.md and changes.md

`design.md` holds everything the design has established: terms, requirements, parts, decisions with their options, risks, costs, data flows, open questions, evidence and meetings. It is the design's single source of truth. The pages write prose around it and draw its pictures; its tables, option cards, decision maps, cost bars and flow tables are rendered from it at build time, and diagrams bind their parts to it, so a fact is edited in one place and every page that shows it follows.

A session that picks the design up reads `design.md` in full, so write each record so it stands on its own: the question, the answer or leaning, why, and where it came from. `assets/example/design.md` is a complete one; `assets/template/design.md` is the starting point.

## Layout

```markdown
<!-- design-docs format 2 -->
# Log ingestion in our cloud

One sentence on what the system does.

## Problem
## Goals
## How it works
## Terms
## Requirements
## Parts
## Decisions
## Risks
## Phases
## Costs
## Flows
## Questions
## Evidence
## Meetings
```

The first line is the format the folder is written in (see [pages](pages.md#format-and-migrations)).

Each section holds items. An item is a `###` heading, then `- Field: value` lines. A field that holds a list puts its items on indented `  - ` lines. Anything else under an item (plain paragraphs) is notes for whoever works on the design next: reasoning, context, what was tried. Notes are never rendered.

Sections can be empty or missing. A small design can be `design.md` alone, with no pages yet.

## Prose

Problem, Goals and How it works are prose, the connected understanding an agent reads before the records, and the overview shows them through components, so the words agree everywhere.

- **Problem:** the problem today, who it affects and what it costs, and the value of solving it. Cite evidence by ID.
- **Goals:** each goal as an outcome, one bullet each, then a line `Not in scope: …` for what a reader might assume is included. The overview's `::: goals` and `::: scope-note` show them.
- **How it works:** the shape of the solution in a few paragraphs: how the parts connect and why that shape, naming the decisions that shape it (D1). Add a diagram in text in a fenced block for agents; the pages draw their own pictures, and `::: design-section section=how-it-works` shows the paragraphs without it.

## Items

Text in record fields and terms takes `code`, links to sections (`[text](#id)`), and ID mentions. Page prose takes **bold** and *emphasis* too. A requirement or phase an agent proposes from research stays proposed until the user accepts it: a requirement's Source says `Proposed from research`, and a phase's Status is Proposed.

**Terms** are one line each, with the pages they appear on:

```markdown
- **OPW** [overview, workers]: Observability Pipelines Workers. Datadog's log pipeline software, run on our own servers.
```

**Requirements** (`### R1 · Receive syslog from the firewalls at all 14 sites.`)

| Field | Holds |
| --- | --- |
| Short | A few words for tables that list requirements ("Firewall logs from all sites") |
| Priority | Must or Should |
| Why | Why it matters |
| Source | Who or what requires it (shown in the doc) |
| Page | The area page it lives on, when it isn't the overview |
| Applies to | Other areas it also applies to; they list it under "Applies here, lives elsewhere" |
| Met | `Yes`, `Partly` or `No`, then `·` and how, then the IDs it rests on in brackets: `Partly · Workers span three zones, but the relay is one instance. [E4, E5, D2]` |
| Met on s3-archive | The same, for how one area page meets it |

**Parts** (`### Syslog server`): one per box in a design diagram. A piece the design sets up that isn't a box of its own (IAM roles, a bucket policy) is a part too; draw it as a label on the box or edge it governs.

| Field | Holds |
| --- | --- |
| Page | The area page whose parts table lists it; the overview's until the design has areas |
| Does | What it does |
| Decided by | The decisions that shaped it (`D2`), or a few words ("Exists today") |
| Evidence | Evidence and questions behind it |
| Designed on | The area page that designs it in detail |

**Decisions** (`### D1 · Where do the workers run?`)

| Field | Holds |
| --- | --- |
| Status | Open, Leaning B (name the option), Decided, Later, or Given. A Later decision whose Follows are settled can open: propose it, and change it on the user's word. |
| Answer, Leaning, For now, Assuming, or So far | One of these: the answer, the team's leaning, or what the design assumes meanwhile. The field name becomes the label. |
| Why | What tipped it, in one sentence, citing the evidence or requirement by ID. Required once a decision is Leaning or Decided. It shows on the decision's card. |
| Reasoning | A list: what else weighed in, the tradeoffs accepted, what it depends on. Adds to the Why rather than repeating it. Skip it when the Why says it all. |
| Revisit if | What would reopen it |
| Also considered | A list of `Name: why not` for alternatives that were plainly worse and never got a full option |
| Source | For a Given decision, who or what set it (required). A Given decision needs no options or Worked out in; the decision map shows its source under it. |
| Note | A sentence more, such as what it's waiting for |
| Shapes | What the decision settles, in a few words, shown under the question. What it waits on stays out, in Follows: while a Later decision follows an unsettled one, the build writes "Needs D1 first." in its place, and Shapes returns once D1 is settled. |
| Page | The area page it lives on, when it isn't the overview. A decision about the whole design has none. |
| Applies to | Other areas it shapes; they show it under "Decided elsewhere, shapes this area" |
| Rail | A short title for the rail ("Where the workers run") |
| Follows | The decisions that must be made first. It draws the brief's relations ("Follows D0", and "Unblocks" on the other side) and the decision map's arrows. |
| Waiting on | The questions and decisions it waits for. Each question listed here names the decision in its Blocks; `check` warns when the two disagree. |
| Evidence | Findings it rests on beyond those the Why and Reasoning cite |
| Worked out in | A brief or area page (`workers`), a section on one (`workers-d2`), a meeting (`meeting-2026-09-22`), or words ("No brief yet", "Not started") |
| Decided in | Where a Decided decision was settled, when that isn't where it was worked out: usually the meeting that decided a briefed question (`meeting-2026-10-02`). Shown under Worked out in. |

```markdown
### D4 · How many workers, and what size?
- Status: Decided
- Answer: Three c7g.large, one per zone.
- Why: Three workers cover peak load even with one zone down (E4), which R4 requires.
- Reasoning:
  - Peak is 18,000 events a second. At 2 vCPU per 10,000 events, two c7g.large carry it alone (E4).
  - One worker per zone keeps the pipeline running through a zone outage.
- Revisit if: Peak passes 20,000 events a second, when two workers no longer carry it.
- Also considered:
  - Two c7g.xlarge: the same capacity, but a zone outage takes half of it away.
  - An autoscaling group: load is steady through the day, so scaling adds parts to run for little gain.
- Worked out in: meeting-2026-09-22
```

Alternatives come at two weights. Options that were really weighed, with tradeoffs worth showing, are `####` options (and usually a brief). Ones that were plainly worse get a line in Also considered, enough that nobody raises them again without knowing why. A decision with no real alternative needs neither; don't invent any.

Options sit under their decision as `####` items. Keep every option ever considered, so nobody proposes one again without knowing why it was dropped.

```markdown
#### B · Give the pipeline its own network
- Short: Own network
- Summary: A small new VPC for the workers and the customer endpoint.
- Status: Current leaning
- Works well:
  - Customer traffic stays out of the network that runs internal tools.
- Costs and risks:
  - About $60 a month more than A.
- Evidence:
  - E2: Transit Gateway fees for current firewall volume.
  - E6: A PrivateLink endpoint can live in any VPC.
- Meets R2: Yes · Endpoint sits in its own network.

#### C · Workers in every workload VPC
- Status: Set aside Sep 22
- Why not: Five worker groups to run and patch.
```

`Short` names the option in comparison and cost headers. Each `Evidence` item says what that finding shows for this option; a bare `E2, E6` uses each finding's own title. `Meets R2` is the option's verdict on a requirement, written like Met, for the comparison table.

Option statuses:

| Status | When | Card class |
| --- | --- | --- |
| Current leaning | The option a Leaning decision names | `leaning` |
| Chosen | The option a Decided decision took | `chosen` |
| Not chosen `<date>` | Lost when the decision was made; give `Why not` | `not-chosen` |
| Set aside `<date>` | Dropped before the decision, shown as a one-line note; give `Why not` | none (a `.set-aside` note) |
| Found in research, Not designed yet, or none | Still in the running | none |

When a decision is made, mark the winner Chosen and each other option Not chosen or Set aside, each with its `Why not`. `check` warns when a Decided decision's options aren't all settled that way, when a Leaning decision names an option that isn't marked Current leaning, and when a brief's option cards don't match these options: letter, title, or class.

**Risks** (`### The syslog relay fails or restarts.`): Likelihood (High, Medium, Low, Unknown), If it happens, What we'd do, Linked, Page when it lives on an area, and Applies to for the other areas it affects.

**Costs** (`### Transit Gateway attachment`): one per line item.

| Field | Holds |
| --- | --- |
| Monthly | `$36`; `$3 → $39` for a cost that grows; `unknown (Q8)` or `per use` when it can't be priced yet. When it varies with a decision, each option's figure: `A $0 · B $36`. |
| Varies with | The decision whose options change it. The overview counts the chosen or leaned-towards option's figure; the brief's cost comparison shows each. |
| Drives | What drives it, with the rate when volumes aren't known |
| Affected by | Other decisions that would change it |
| Evidence | Its pricing evidence |
| Page | The area it's grouped under on the overview |

**Flows** (`### B-F2 · Syslog server → OPW workers`): one per data flow in a security view, with Path, Data, In transit, Auth, Crosses (`Yes · Partition boundary` when it crosses the compliance boundary) and Assessment (`No · Add TLS on the relay [D2]`). See [security](security.md).

**Phases** (`### Firewall logs through OPW`): the design's delivery units, in order. Scope (what it delivers), Exit criteria (how everyone knows it's done), Status (Proposed until the user accepts it, then Planned, In progress, Done), and Effort (the slug of the effort doing it). The overview's Phases table shows them; a phase's status lives only here.

**Questions** (`### Q1 · Can the site VPNs carry a route to a new VPC?`)

| Field | Holds |
| --- | --- |
| Who | A person, team or vendor, with `(me)`, `(our team)`, `(other team)` or `(vendor)` last: `Security GRC (other team)`. Text after the tag drops it. |
| Short | A few words for the decision map ("Who owns a new VPC?"), up to about 40 characters; its box grows to fit |
| Blocks | The decisions, requirements and flows it blocks. It decides where the question lives: with them, or on the overview when they're on different pages or it blocks only flows. |
| So far | A partial answer and the evidence it rests on, while it's still open |
| Answer | Once answered: the answer in a few words |
| Answered by | Once answered: the evidence it became |
| Asked | Who it was put to, when, and through what, such as `Security GRC · 2026-10-03 · email`. Not shown in the doc. |

A question has no status: it's open until it has an Answer and Answered by. When and how it was asked goes in `Asked`; what to ask next is proposed when someone asks for a plan, and `check` warns about `Status`, `Latest` or `Page` on a question.

**Evidence** (`### E1 · Firewall logs from all 14 sites reach the syslog server over site VPNs.`): Found (a date), How we know, and Gathered from as a list of `Kind: portable description` items, such as `AWS account: prod-network · Transit Gateway route tables` or `Email: Security GRC, Oct 3`.

**Meetings** (`### 2026-09-22 · Network working session`): Status (Awaiting review, Summarised), Who, and Summary as a list. Only meetings that happened are recorded; a planned one and its agenda aren't. The meeting's "Changed in this doc" chips come from changes.md.

## Where a record came from

Every record can carry `- Recorded from:` naming its sources: `session claude-code:221a…`, `meeting 2026-09-22`, `email 2026-10-03 · SEC-12 and customer ingress (Alex, Oct 3)` for a captured thread and the message in it, a local file path, a ticket, a private URL. It is the one private field. It is never rendered, so local paths, machine names and private links belong there and nowhere else; `check` fails when one appears in any other field.

## Writing values

- Mention another item by its ID in any text: "blocked by Q2". It renders as a link that opens the item's card. Write `\Q4` for text that only looks like an ID, such as a quarter.
- Brackets are for what a verdict rests on: `Met`, `Meets R#` and a flow's `Assessment` end with `[E4, Q2, D2]`, drawn as markers after the verdict. In any other field, write the ID bare; brackets there stay as text.
- Link to a page or section with `[their brief](#workers)`.
- Keep IDs stable. An answered question keeps its record, with Answer and Answered by. A dropped decision keeps its record too.

## changes.md

Every accepted change to `design.md` gets a line here, grouped under the date and where it came from. Oldest first; add at the bottom.

```markdown
# Changes

## 2026-09-22 · meeting 2026-09-22
- D4 decided
- Brief: set aside C
- Added E1

## 2026-09-27 · session claude-code:7f3c2a91
- Added page: S3 archive
- D6 leaning: a prefix and key per customer
```

- Sources: `meeting <date>` (it must match a meeting in design.md), `email <date> · <sender or subject>` (the date of the message that carried the change), `session <catalog id>` (or `session <date>` without a catalog), `request`, or a few words.
- What follows from a change goes under that change's source: a risk dropped because a meeting answered its question, or a settled decision taken off a question's Blocks, is logged under the meeting.
- A first sitting usually mixes both: what the user stated (their requirements, decisions and the options they named) goes under `request`, and what the session found (evidence, questions, options from research) under `session <catalog id>`.
- A meeting's lines become its "Changed in this doc" chips on the Meetings page.
- `build` stamps the published doc with how many entries it includes. `check` then says when the published doc is behind and from which entry, so a later session knows what the readers haven't seen yet.

## Record tables on pages

A page's standard sections render these on their own (see [components](components.md)); `::: <kind>` or `<!-- records <kind> -->` places one anywhere else. Each record is defined once: on the overview, or on the first page when the doc has none. An answered question is defined in the Answered list of the page it lived on. Other pages refer to it.

| Placeholder | On the overview | On an area page |
| --- | --- | --- |
| `<!-- records requirements -->` | Every requirement, grouped by where it lives | Its own, then "Applies here, lives elsewhere" |
| `<!-- records measure -->` | How the design meets every requirement, from Met | Its requirements and those that apply, from Met on `<page>` or Met |
| `<!-- records decisions -->` | Every decision, grouped by where it lives, unsettled first. A row with a Why, Reasoning, options or alternatives opens to show them. | Its own, then "Decided elsewhere, shapes this area" |
| `<!-- records risks -->` | Every risk, grouped | Its own, then "Owned elsewhere, affects this area" |
| `<!-- records cost -->` | Every cost line, grouped by area with subtotals, and the total | Its own lines and their total |
| `<!-- records questions -->` | Every open question, grouped, then the overview's own answered ones | Its own, those from elsewhere that reach it, then its answered ones |
| `<!-- records progress -->` | A tile per area with its decisions and open questions; one line when there are no areas | One line: its decisions and questions, and what reaches it from elsewhere |
| `<!-- records parts -->` | The page's parts table | The page's parts table |
| `<!-- records decisions-rail -->` | Rail items for every open decision | The page's own open decisions; `ids=D6,D5` picks and orders them anywhere |
| `<!-- records terms -->` | The terms listed for the page | The same |

| Anywhere | Renders |
| --- | --- |
| `<!-- records reasoning ids=D1 -->` | A decision's Why, Reasoning and Revisit if. A `## D1` section adds it. |
| `<!-- records questions blocks=D1,D2 -->` | The questions blocking those decisions, for a brief, each saying where it lives |
| `<!-- records evidence -->` | The Evidence page's table |
| `<!-- records meetings -->`, `<!-- records meetings-rail -->` | The Meetings page and its rail |

A placeholder renders for the page it sits on; add `page=<id>` to render another page's records, or `ids=` to pick records. Groups appear only once the doc has area pages.
