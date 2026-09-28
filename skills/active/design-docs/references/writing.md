# Writing the doc

A design doc is read together on a shared screen, and someone who doesn't know the system (often a manager) should be able to follow any page of it. The overview says what's being built and what it still depends on. A brief lays out one question so the team can decide; it doesn't have to recommend anything. Area pages go deeper on one part. See [pages](pages.md) for which pages a doc needs.

## Headers

Every page starts with a header: the title (about ten words at most), a one-sentence dek, a context line, and the last-updated date. A brief's title is its question ("Where should the log pipeline workers run?"). The overview's names what's being built ("Log ingestion in our cloud"). On pages other than the overview, the context line starts with a link back to it. Leave out parts that don't exist rather than inventing names. No owner, audience, or status fields. The rail's short title is two or three words.

## Overview sections

| Section | Purpose |
| --- | --- |
| In short | Three short paragraphs in plain language: what's being built, how it fits together, and which decisions are still open and where each is being worked out. Beside it, the terms a newcomer would trip over, each defined in a sentence. |
| Requirements | What the whole system must satisfy, with a reason and a source for each. Priority is Must or Should. |
| Solution | The design as it stands, in one diagram with architecture and security views, and a parts table under it. See below. |
| Decisions | Every decision the design depends on, open or made, with its status and where it's worked out. See [pages](pages.md). |
| How it measures up | Each requirement, whether the design meets it (yes, partly, no), how, and the evidence, questions or decisions it rests on. |
| Cost | One line per cost, what drives it, the monthly figure, and its pricing evidence. When volumes aren't known yet, add a Rate column, write "unknown" with the question that would settle it in Monthly, and give no invented total. Add a decision marker to lines that would change if that decision went another way. Group lines that grow over time separately, and show a total. |
| Risks | What could go wrong once it's running: likelihood, what happens, what we'd do, and what it's linked to. |

## The solution and its parts

- **Draw the current best picture.** Where a decision is still open, draw what's leaned towards or assumed, dash the parts that depend on it (`pending`), and put that decision's marker on them. Don't draw the alternatives; they belong in the decision's brief.
- **When a decision is made,** the dashed parts become solid, or are redrawn to match what was chosen.
- **The parts table** has one row per box in the diagram: what it does, the decisions that shaped it (including settled ones, so each part links back to why it's that way), and its evidence. When an area page designs a part, say so in the row and link to it.

## Area page sections

In short with terms, Requirements (its own, numbered on from the overview's, plus the overview requirements that apply, listed by marker), Design (a diagram at this area's level of detail and its parts table), and How it measures up. Add Cost or Risks only when they're specific to the area. Show neighbouring parts as plain boxes that say they're on the overview.

## Brief sections

A brief answers one question. Keep one question per brief, and put its own decisions (D1, D2, …) in scope. Show related decisions as context on its decision map: ones already made that this depends on, and ones that must wait for this. When a sub-decision grows its own options, evidence and questions, give it its own brief.

| Section | Purpose |
| --- | --- |
| In short | Three short paragraphs: what's being done, why this question comes up, why it has to be settled now. Terms beside it. |
| Requirements | Only when the doc has no overview. Inside a design doc, the brief is measured against the overview's requirements. |
| Decision map | The decisions and how they depend on each other, with the open questions that block them. See [diagrams](diagrams.md). |
| Other decisions | Only when the doc has no overview: a short decisions table (the overview's markup) defining the decisions the map shows for context, such as ones already made or ones that must wait. In a design doc they're rows in the overview's table. |
| One section per decision | Framing, relations, options, set-aside options, a comparison against requirements, a security view when the question touches data or compliance (see [security](security.md)), and any extra part the decision needs. |

There's no "outcome" or "decision record" section. Decisions show up as status changes, and meeting summaries record what changed.

### Decision sections

- **In a doc with an overview,** the section title carries the decision's marker (`<span class="num">03</span><a class="ref ref-d" href="#D1">D1</a><h2>…</h2>`, marker before the heading) instead of a status: the status lives in the overview's decisions table, and the marker shows it.
- **Framing:** two or three sentences on what is being chosen and what stays the same whichever option wins.
- **Relations:** what it follows, what it unblocks, and which questions it's waiting on.
- **Options:** at least two, each with a letter (A, B, C) and its own colour. Give each a one-line summary, a diagram when the options differ in structure, and three lists: works well, costs and risks, and the evidence behind them.
- **Set aside:** options already ruled out stay visible in one line with the date and reason, so nobody re-proposes them without knowing why they were dropped.
- **Comparison:** a table of requirements against options, with a verdict (meets, partly, doesn't) and a few words per cell.
- **Extra parts as needed:** add what the decision actually hinges on, especially anything the requester asked about by name. Cost, failover and recovery, migration effort, timeline, and operational load are common. For cost, show where the money goes: a bar per option splitting the shared part from the difference, then a line-item table grouped into "differs between options" and "same in both", each line citing its pricing evidence. When the options share no common base, draw each bar in one colour and add today's cost as a first, grey bar for reference. For failover, a table of what fails, what happens, how long it takes, and what's lost, per option.
- **What would settle it:** when a decision is waiting on questions, say which answers lead to which choice.
- **Status:** Open, Leaning (name the option), Decided, or Later. Leaning records the team's direction; research alone doesn't make an option Leaning, though the page can say what the evidence favours. Mark a leaning with "Current leaning" on that option rather than a recommendation section. A premise the requester states as fixed ("we do rolling deploys") is a context decision with status Given.
- **Options found in research:** when research turns up a viable option nobody proposed, add it and say so in its summary ("Found in research"). The team decides whether it stays. Set aside is only for options the team has ruled out.
- **Options nobody has designed yet:** keep the option, say "not designed yet" in its summary, and draw its new parts as sketches (`node sketch`) so they don't look settled.

Smaller decisions can show their options side by side in compact cards instead of full-width ones.

## Requirements versus things to understand

A requirement is something someone actually needs, with a source. Don't turn "we should know the cost" into an invented limit like "under $150 a month". If nobody set a limit, show cost as its own section or part instead.

When a requirement is implied by how the question was asked but nobody stated it, you can still list it. Give its source as "Implied by the request" and add an open question to confirm it.

## Evidence

- Everything a page states about the current world, the design, or an option needs a source: a finding (E1) or, if nobody knows yet, an open question (Q1). This includes each box and connection in a diagram.
- Don't fill gaps with plausible numbers or assumptions. An unknown becomes an open question with someone who can answer it.
- Write the finding as a plain statement. In "How we know", say how it was established (read the route tables, priced from the published rates, confirmed with the network team). In "Gathered from", describe each source portably: the kind of source and a name a colleague would recognise ("AWS account · prod-network", "infra-network repo · VPN module", "Network team, Sep 24").
- Don't put local file paths, machine names, or private URLs in the doc. Record those in the private links file instead (see [lifecycle](lifecycle.md)).
- Add a finding's date. The Evidence page lists where each finding is cited on its own.
- Facts the requester states are evidence too. Write "Stated in the request, not independently checked" in How we know and "Request · <date>" in Gathered from. When a requirement or decision rests on one, add a question to confirm it.
- A finding can be an absence ("the vendor's docs describe no rotation feature"). Say what was searched, and pair it with a question to whoever could confirm when it matters.
- Public documentation can be linked from Gathered from; it's portable. Private sources can't.

## Open questions

- Phrase each as a question someone could answer with a fact.
- Who can answer: name a person, team, or vendor, and say whether that's me, our team, another team, or a vendor. A question nobody can answer isn't ready to be listed; say what would find the answer instead.
- Say which decisions or requirements it blocks, its status, and the latest note (when asked, ticket number, "in this meeting").
- Statuses: Not asked, To check (fact-finding our team does itself), Asked, Ticket open, Answer here (to settle in the meeting), Later, and Answered (keep the row and point to the evidence it became).

## Identifiers

- E (evidence), Q (question), D (decision) and R (requirement) numbers are unique across the doc and stable. Never renumber: meeting notes and conversations refer to them.
- When something is answered, superseded, or dropped, update it in place and say so rather than reusing its number.
- When a brief joins a design doc, keep its numbers if they're free; otherwise renumber once, at that moment, and note it in the next meeting summary.

## Language

- Write for someone smart who doesn't know the system. Define every acronym in the terms list or on first use.
- Prefer short, concrete sentences. Put numbers where they matter: counts, costs, sizes, dates.
- Use tables for anything compared across options or items; use prose for framing and reasons.
- Leave out how the doc was made, who researched what, and approval states.
