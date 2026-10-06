# Records: design.json, evidence.json, meetings.json and changes.md

`design.json` holds what the design has established: terms, facts, requirements, parts, decisions with their options, risks, costs, data flows and open questions. `evidence.json` holds the evidence and `meetings.json` the meetings, in the same format; the build reads all three as one. It is the design's single source of truth. The pages write prose around it and draw its pictures; its tables, option cards, decision maps, cost bars and flow tables are rendered from it at build time, and diagrams bind their parts to it, so a fact is edited in one place and every page that shows it follows.

A session that picks the design up reads `design.json` in full (and the other two when the task needs them), so write each record so it stands on its own: the question and what it means, the answer or leaning, why, and where it came from. `assets/example/design.json` is a complete one; `assets/template/design.json` is the starting point.

## Layout

The records are JSON, in three files. `design.json` holds the design; `evidence.json` holds `{"evidence": [...]}` and `meetings.json` holds `{"meetings": [...]}`. The build reads all three as one.

```json
{
  "format": 3,
  "title": "Log ingestion in our cloud",
  "summary": "One sentence on what the system does.",
  "problem": "Prose. Cite evidence by ID (E2).",
  "goals": "- Each goal as an outcome, one per line\n\nNot in scope: …",
  "howItWorks": "Prose, a few paragraphs.",
  "terms": [{"term": "OPW", "pages": ["overview"], "definition": "…"}],
  "facts": {"sites": {"value": "14", "source": "E1"}},
  "requirements": [{"id": "R1", "title": "Receive syslog from all sites.", "Priority": "Must", "Why": "…", "Source": "…"}],
  "parts": [{"title": "OPW workers", "Does": "…"}],
  "plan": [{"id": "P1", "title": "AWS foundation", "Scope": "…", "Exit criteria": "…", "Status": "Planned", "Group": "Firewall logs through OPW",
            "Serves": "1", "Jira": ["https://example.atlassian.net/browse/OBS-210"]}],
  "decisions": [{"id": "D1", "title": "Where do the workers run?", "Status": "Leaning B", "Explanation": "…",
                 "options": [{"id": "A", "title": "Workers in Shared Tooling", "Status": "Set aside Sep 22", "Why not": "…"}]}],
  "risks": [{"title": "…", "Likelihood": "Medium"}],
  "costs": {"Assumes": "…", "Leaves out": "…", "lines": [{"title": "OPW workers", "Monthly": "$36"}]},
  "flows": [{"id": "B-F1", "title": "Syslog server → OPW workers", "Data": "…", "Crosses": "No · …", "Assessment": "Yes · …"}],
  "questions": [{"id": "Q1", "title": "Can the site VPNs carry a new route?", "Explanation": "…", "Needed by": "Choosing the design"}],
  "links": [{"title": "OPW security review", "URL": "https://…/wiki/…", "Role": "Published", "Why": "…"}],
  "jira": [{"id": "OBS-220", "title": "Run the OPW workers", "URL": "https://…/browse/OBS-220", "Type": "Epic", "Status": "In Progress", "Read": "2026-10-11 09:20"}]
}
```

A record is an object. Its identity is `id` and `title` (requirements, deliverables, decisions, questions, evidence, flows, and Jira items, whose `id` is the item's key), `date` and `title` (meetings), or `title` alone (parts, risks, cost lines, links). Every other key is a field, named exactly as this reference names it ("Status", "Why", "Recorded from"): a string; a list of strings when the field is a list (Summary, Gathered from, Reasoning, Outcomes); or `{"value": "…", "items": ["…"]}` when it has both. A decision's options are in `options`, each with `id` (A, B, …), `title` and fields. Notes for whoever works on the design next, never rendered, go in `notes`, a list of strings.

The rest of this reference describes each field as `Field: value`; in JSON that is the key `"Field"` with that value. `assets/example/` has the complete JSON for a real design and `assets/template/` the starting point. Sections can be empty or missing. A small design can be `design.json` alone, with no pages yet.

## Prose

Problem, Goals and How it works are prose, the connected understanding an agent reads before the records, and the overview shows them through components, so the words agree everywhere.

- **Problem:** the problem today, who it affects and what it costs, and the value of solving it. Cite evidence by ID.
- **Goals:** each goal as an outcome, one bullet each, then a line `Not in scope: …` for what a reader might assume is included. The overview's `::: goals` and `::: scope-note` show them.
- **How it works:** the shape of the solution in a few paragraphs: how the parts connect and why that shape, naming the decisions that shape it (D1). Add a diagram in text in a fenced block for agents; the pages draw their own pictures, and `::: design-section section=how-it-works` shows the paragraphs without it.

## Items

Text in record fields and terms takes `code`, links to sections (`[text](#id)`), and ID mentions. Page prose takes **bold** and *emphasis* too. A requirement or deliverable an agent proposes from research stays proposed until the user accepts it: a requirement's Source says `Proposed from research`, and a deliverable's Status is Proposed.

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
| Today | The system as it stands, for the whole requirement: `Meets`, `Doesn't meet`, `Unknown` or `Nothing today`, then `·` and what it does now, then the IDs it rests on in brackets: `Doesn't meet · The syslog server is one instance in one zone. [E5]` |
| Design | How this design meets it: `Covers`, `Partly covers` or `Not covered` · how [IDs]. Never "not built yet": that goes in Still to show. |
| Still to show | What has to be demonstrated before it holds: `Demonstrated` (cite the evidence), `Intended` (a control the design adds, not yet tested), `Unconfirmed` (rests on something not known) or `Nothing left` · what [IDs] |
| Design on s3-archive, Still to show on s3-archive | The same, for one area page. Today has no per-page form. |
| Met, Met on s3-archive | The older single verdict (`Yes`, `Partly`, `No` · how [IDs]). It renders as Design, with Today and Still to show "Not assessed"; replace it with the three when you next change the requirement. |

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
| Explanation | What the decision asks and how it fits into the design, for a reader who doesn't follow the question: what's being decided in plain words, any term it relies on, which part of the design it's about, and how it connects to the goals and the decisions and questions around it. A few sentences that make sense without the options or the evidence. `check` warns when an Open, Leaning or Later decision has none; keep it once decided. It opens the decision's modal; tables and cards leave it out. |
| Answer, Leaning, For now, Assuming, or So far | One of these: the answer, the team's leaning, or what the design assumes meanwhile. The field name becomes the label. |
| Why | What tipped it, in one sentence, citing the evidence or requirement by ID. Required once a decision is Leaning or Decided. It shows on the decision's card. |
| Reasoning | A list: what else weighed in, the tradeoffs accepted, what it depends on. Adds to the Why rather than repeating it. Skip it when the Why says it all. |
| Revisit if | What would reopen it |
| Also considered | A list of `Name: why not` for alternatives that were plainly worse and never got a full option |
| Source | For a Given decision, who or what set it (required). A Given decision needs no options or Worked out in; the decision map shows its source under it. |
| Note | A sentence more, such as what it's waiting for |
| Recommendation | The AI's recommendation, while it's still to decide: advice for the people deciding, shown apart from the team's leaning and labelled as AI, in the decision's modal, its row, its brief section and on the option card it names. The value is the option's ID (`B`), or the answer in a few words when there are no options; then a list of parts: `Because:` why, citing IDs; `Would change if:` what would change it; `Confidence:` High, Medium or Low; `Model:` the model that made it, by name and version, shown wherever the recommendation is, since different models recommend differently; `Made:` the date (YYYY-MM-DD); `Seen:` the newest evidence it was made from (`E9`). `check` warns when the decision has come to rest on newer evidence, and the doc hides it once the decision is settled. Written and refreshed with [the recommend playbook](../playbooks/recommend.md); the team's own view stays in the status and Leaning. |
| Shapes | What the decision settles, in a few words, shown under the question. What it waits on stays out, in Follows: while a Later decision follows an unsettled one, the build writes "Needs where the workers run (D1) first." in its place, from the other decision's Rail, and Shapes returns once D1 is settled. |
| Page | The area page it lives on, when it isn't the overview. A decision about the whole design has none. |
| Applies to | Other areas it shapes; they show it under "Decided elsewhere, shapes this area" |
| Rail | A short title for its section link in a brief's rail ("Where the workers run") |
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

`Short` names the option in comparison and cost headers. Each `Evidence` item says what that finding shows for this option; a bare `E2, E6` uses each finding's own title. `Meets R2` is the option's verdict on a requirement, `Yes`, `Partly` or `No` · how [IDs], for the comparison table.

Option statuses:

| Status | When | Card class |
| --- | --- | --- |
| Current leaning | The option a Leaning decision names | `leaning` |
| Chosen | The option a Decided decision took | `chosen` |
| Not chosen `<date>` | Lost when the decision was made; give `Why not` | `not-chosen` |
| Set aside `<date>` | Dropped before the decision, shown as a one-line note; give `Why not` | none (a `.set-aside` note) |
| Found in research, Not designed yet, or none | Still in the running | none |

When a decision is made, mark the winner Chosen and each other option Not chosen or Set aside, each with its `Why not`. `check` warns when a Decided decision's options aren't all settled that way, when a Leaning decision names an option that isn't marked Current leaning, and when a brief's option cards don't match these options: letter, title, or class.

**Risks** (`### The syslog relay fails or restarts.`): Likelihood (High, Medium, Low, Unknown), If it happens, What we'd do, Linked, Page when it lives on an area, Applies to for the other areas it affects, and an Explanation when it's consequential or easy to misread (written as for a question; the risk then opens in a modal).

**Costs** (`### Transit Gateway attachment`): one per line item. Before the first line, the section says what every figure assumes and leaves out:

```markdown
## Costs

- Assumes: us-gov-west-1 list prices, 1.2 TB of firewall logs a month, and the first three customers.
- Leaves out: The Datadog licence, priced on the Datadog contract; staff time.
```

| Field | Holds |
| --- | --- |
| Category | One of a small set used across the design (Compute, Network, Storage, Licences…); totals break down by it |
| Monthly | `$36`; `$3 → $39` for a cost that grows; `unknown (Q8)` or `per use` when it can't be priced yet, which shows as Unknown and stays out of the total. When it varies with a decision, each option's figure: `A $0 · B $36`. |
| Applies when | When the line applies at all, in a few words ("While firewall logs go through the relay"); shown as a tag on the line |
| Varies with | The decision whose options change it. The overview counts the chosen or leaned-towards option's figure; the brief's cost comparison shows each. |
| Drives | What drives it, with the rate when volumes aren't known |
| Affected by | Other decisions that would change it |
| Evidence | Its pricing evidence |
| Page | The area it's grouped under on the overview |

**Flows** (`### B-F2 · Syslog server → OPW workers`): one per data flow in a security view, with Path, Data, In transit, Auth, Crosses (`Yes · Partition boundary` when it crosses the compliance boundary) and Assessment (`No · Add TLS on the relay [D2]`). See [security](security.md).

**The plan** (`### P1 · AWS foundation`, in design.json's `plan`): how the work breaks into deliverables, each a piece that can be delivered and checked on its own. Not a task list, and not a copy of Jira: how a deliverable gets built stays with whoever builds it, and Jira's stories come and go under its epic.

| Field | Holds |
| --- | --- |
| Scope | What it delivers |
| Exit criteria | How everyone knows it's done |
| Status | Proposed until the user accepts it, then Planned, In progress, Done. A deliverable's status lives only here. |
| Follows | The deliverables that must be done first (`P1, P5`). The Plan page draws them as a map, those in one column free to run in parallel. `check` fails on a loop. |
| Group | A few words naming a stream of the work ("Firewall logs through OPW"); deliverables in a group share a colour |
| Serves | The goals it serves, by their number in the Goals list (`1, 2`) |
| Jira | The URLs of the Jira items tracking it, usually its epic; any number, or none |

A deliverable never names an effort: the doc is published, and efforts are local to whoever keeps them. Which deliverables an effort works on follows from the Jira items the effort includes.

**Links** (`### OPW security review`, in `links`): the Confluence pages, pull requests and other pages around the design. URL, Role (`Published` for what the design or its work produced, `Referenced` for someone else's page it relies on), Why (one sentence on why it's here), and for a Confluence page optionally Space and Updated. The Links page lists them by kind. A page whose content changes the design goes through intake like any source; a link just says where it is.

**Jira items** (`### OBS-220 · Run the OPW workers`, in `jira`): the epics and stories tracking the plan, as an agent last read them through the Atlassian MCP server. URL, Type (Epic, Story, Task, Bug), Status as Jira words it, Category when the status words don't say (To do, In progress, Done), Parent (the epic's key), Blocks (keys), and Read (`YYYY-MM-DD HH:MM`, when it was read). Refresh them all at once when asked; the doc shows them as read, never as the design's own state.

**Questions** (`### Q1 · Can the site VPNs carry a route to a new VPC?`)

| Field | Holds |
| --- | --- |
| Needed by | When the answer is needed: `Choosing the design`, `Before building`, `Later phase`, or a deliverable (`P3`, or its title) |
| Answer from | How the answer can be got: `Research · where to look` when an agent could find it in documentation, a repository or a read-only account (`Research · Datadog's OPW syslog source docs`); `Person` when someone has to tell us; `Approval` when someone has to sign it off. The questions table shows it with where to look, or with Ask. `check` warns when an open question has none. |
| Ask | Who to ask, only when a person or a meeting named them: `Network team`. Left out otherwise. |
| Short | A few words for the decision map ("Who owns a new VPC?"), up to about 40 characters; its box grows to fit |
| Blocks | The decisions, requirements and flows it blocks. It decides where the question lives: with them, or on the overview when they're on different pages or it blocks only flows. |
| So far | A partial answer and the evidence it rests on, while it's still open; the question reads "Partly answered" |
| Deferred | Why it can wait, on the user's word or a meeting's outcome. Nothing waits on a deferred question. |
| Could reopen | For a deferred question, what its answer could still change: `customer data separation (D6), if the count passes about 50` |
| Answer | Once answered: the answer in a few words |
| Answered by | Once answered: the evidence it became |
| Recommendation | The AI's suggested answer while the question is open, in a few words, with the same parts as a decision's: `Because:`, `Would change if:`, `Confidence:`, `Model:`, `Made:`, `Seen:`. It shows in the question's modal and row, labelled as AI, and goes once the question is answered or deferred. |
| Explanation | What the question asks and how it fits into the design, as for a decision: what we're trying to find out in plain words, and what it feeds and why that needs it. For a consequential one, a list of parts: `Means here:`, `Matters because:`, `Answer changes:`, `Settled by:` (see [writing](writing.md#explanations)). `check` warns when an open question has none. It opens the question's modal; tables and cards leave it out. |

A question has no status field: it's open, partly answered (`So far`), deferred (`Deferred`), or answered (`Answer` and `Answered by`). The doc doesn't track when or how a question was put to anyone; what to ask next is proposed when someone asks for a plan. `check` warns about `Status`, `Latest` or `Page` on a question. An older design's `Who` still shows as Ask (without its `(other team)` kind, and never `(me)`), and its `Asked` isn't shown; when you next change such a question, drop `Asked`, and leave `Who` as it is unless you know how it was set: rename it `Ask` when the user or a meeting named them, drop it when you know it was a guess. Don't turn it into `Ask` on your own, as though someone had named them.

**Evidence** (`### E1 · Firewall logs from all 14 sites reach the syslog server over site VPNs.`): Found (a date), How we know, and Gathered from as a list of `Kind: portable description` items, such as `AWS account: prod-network · Transit Gateway route tables` or `Email: Security GRC, Oct 3`.

**Facts** are an object of `"key": {"value": "…", "source": "E2"}`, with a lowercase key. Any number, cost, count or date stated in more than one place is a fact, and everywhere else (records, pages, components) writes `{fact:key}`; the build puts the value in. Change a figure by changing its fact.

**Meetings** (`### 2026-09-22 · Network working session`, in meetings.json): Status (Awaiting review while it has proposals to settle, then Summarised), Who, Proposals, Worth a look (a list: what the meeting's outcomes imply for things nobody discussed, for the user to look at; never applied on its own), Outcomes, and Summary as a list. Proposals are what the meeting could change in the design, each settled with the user before anything changes; their format and how to write them are in [the update playbook](../playbooks/update.md#2-propose-dont-apply). The Meetings page shows each meeting's proposal count, and clicking it opens them, in the published doc too. Outcomes is a list with one string for each thing the meeting settled: `<Kind> · <what> → <record IDs, fact:key or deliverable title>`, with Kind one of Decided, Leaning, Later, Answer, So far, Deferred, New question, Requirement, Deliverable, Fact, Evidence, Scope, Risk (Phase still reads, for meetings recorded before the plan). Every decision, leaning or deferral a meeting states gets a decision record with that status, created when none exists. `check` fails when an outcome points at nothing, and when the latest meeting's Decided, Leaning or Later doesn't match the decision's status, or its Answer or So far doesn't match the question. Only meetings that happened are recorded; a planned one and its agenda aren't. The meeting's "Changed in this doc" chips come from changes.md.

## Where a record came from

Every record can carry `- Recorded from:` naming its sources: `session claude-code:221a…`, `meeting 2026-09-22`, `email 2026-10-03 · SEC-12 and customer ingress (Alex, Oct 3)` for a captured thread and the message in it, a local file path, a ticket, a private URL. It is the one private field. It is never rendered, so local paths, machine names and private links belong there and nowhere else; `check` fails when one appears in any other field.

## Writing values

- Mention another item by its ID in any text: "blocked by Q2". It renders as a link that opens the item's card. Write `\Q4` for text that only looks like an ID, such as a quarter.
- Brackets are for what a verdict rests on: `Today`, `Design`, `Still to show`, `Meets R#` and a flow's `Assessment` end with `[E4, Q2, D2]`, drawn as markers after the verdict. In any other field, write the ID bare; brackets there stay as text.
- In prose fields, name the thing and cite the ID after it ("the firewall log path (D2)"); an ID isn't the subject of a sentence. See [writing](writing.md#identifiers).
- Link to a page or section with `[their brief](#workers)`.
- Keep IDs stable. An answered question keeps its record, with Answer and Answered by. A dropped decision keeps its record too.

## changes.md

Every accepted change to `design.json` gets a line here, grouped under the date and where it came from. Oldest first; add at the bottom.

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

- Sources: `meeting <date>` (it must match a meeting in design.json), `email <date> · <sender or subject>` (the date of the message that carried the change), `session <catalog id>` (or `session <date>` without a catalog), `request`, or a few words.
- What follows from a change goes under that change's source: a risk dropped because a meeting answered its question, or a settled decision taken off a question's Blocks, is logged under the meeting.
- A first sitting usually mixes both: what the user stated (their requirements, decisions and the options they named) goes under `request`, and what the session found (evidence, questions, options from research) under `session <catalog id>`.
- A meeting's lines become its "Changed in this doc" chips on the Meetings page.
- `build` stamps the published doc with how many entries it includes. `check` then says when the published doc is behind and from which entry, so a later session knows what the readers haven't seen yet.

## Record tables on pages

A page's standard sections render these on their own (see [components](components.md)); `::: <kind>` or `<!-- records <kind> -->` places one anywhere else. Each record is defined once: on the overview, or on the first page when the doc has none. An answered question is defined in the Answered list of the page it lived on. Other pages refer to it.

| Placeholder | On the overview | On an area page |
| --- | --- | --- |
| `<!-- records requirements -->` | Every requirement, grouped by where it lives | Its own, then "Applies here, lives elsewhere" |
| `<!-- records measure -->` | Every requirement: Today, Design and Still to show | Its requirements and those that apply, with the page's own Design and Still to show where it has them |
| `<!-- records decisions -->` | Every decision, grouped by where it lives, unsettled first. A row with a Why, Reasoning, options or alternatives opens to show them. | Its own, then "Decided elsewhere, shapes this area" |
| `<!-- records risks -->` | Every risk, grouped | Its own, then "Owned elsewhere, affects this area" |
| `<!-- records cost -->` | The basis, every cost line grouped by area with subtotals, the known total and the totals by category | Its own lines and their total |
| `<!-- records questions -->` | Every open question, grouped, then the overview's own answered ones | Its own, those from elsewhere that reach it, then its answered ones |
| `<!-- records progress -->` | A tile per area with its decisions and open questions; one line when there are no areas | One line: its decisions and questions, and what reaches it from elsewhere |
| `<!-- records parts -->` | The page's parts table | The page's parts table |
| `<!-- records terms -->` | The terms listed for the page | The same |

| Anywhere | Renders |
| --- | --- |
| `<!-- records reasoning ids=D1 -->` | A decision's Why, Reasoning and Revisit if. A `## D1` section adds it. |
| `<!-- records questions blocks=D1,D2 -->` | The questions blocking those decisions, for a brief, each saying where it lives |
| `<!-- records evidence -->` | The Evidence page's table |
| `<!-- records meetings -->` | The Meetings page's list |

A placeholder renders for the page it sits on; add `page=<id>` to render another page's records, or `ids=` to pick records. Groups appear only once the doc has area pages.
