# Writing the doc

A design doc is read together on a shared screen, and someone who doesn't know the system (often a manager) should be able to follow any page of it. It records where the design stands, not what to do next. The overview says what problem is being solved, what's being built, and the state of everything in it. A brief lays out one question so the team can decide; it doesn't have to recommend anything. Area pages go deeper on one part. See [pages](pages.md) for which pages a doc needs.

## Headers

Every page starts with a header: the title (about ten words at most), a one-sentence dek, a context line, and the last-updated date. The dek says what the title can't: the page's answer or where it stands, never a list of what the page covers. The overview's says what the system does, more concretely than its title. A brief's says where the decision stands and what it turns on. An area's says what the part guarantees and what's still open in it. On shared pages, Meetings says what the meetings so far settled, and Evidence says when and where the findings came from. A brief's title is its question ("Where should the log pipeline workers run?"). The overview's names what's being built ("Log ingestion in our cloud"). On pages other than the overview, the context line starts with a link back to it ("Overview / area", "Overview / brief"). Under an overview's or area's header, the progress line shows how much is settled (see [pages](pages.md)). Leave out parts that don't exist rather than inventing names. No owner, audience, or status fields. The rail's short title is two or three words.

## Section intros

Most sections need only their heading. Add an intro under a heading only when it says something the heading and the content can't: the one or two sentences a diagram summarises, a decision's framing, the basis of the figures (monthly, at which prices), or a limit on scope that isn't visible in the content. An intro that describes what the section holds, or explains how to read it, repeats the heading; leave it out. The same test applies to a subtitle under any title, such as a card's.

## Overview sections

| Section | Purpose |
| --- | --- |
| In short | Three short paragraphs in plain language: the problem today, what's being built and how it changes that, and how the design is divided and what shapes all of it. Under it, the terms a newcomer would trip over, each defined in a sentence. |
| What we're after | The goals, with a picture of today and with the design that names no products or technologies. See below. |
| Requirements | Every requirement, with a reason and a source, grouped by where it lives. Priority is Must or Should. |
| How it fits together | Once there are areas: one box per area, each linking to its page, drawn the way the areas relate. See [diagrams](diagrams.md). |
| The whole system | The design as it stands, in one picture with architecture and security views. See below. |
| How it measures up | Each requirement, whether the design meets it (yes, partly, no), how, and the evidence, questions or decisions it rests on. |
| Cost | One line per cost, what drives it, the monthly figure, and its pricing evidence, grouped by area with each area's subtotal: Costs records, with the basis of the figures as the section's intro. When volumes aren't known yet, put the rate in What drives it and "unknown (Q8)" in Monthly, with the question that would settle it; the total then says how many lines aren't known rather than inventing one. A line that would change if a decision went another way names it in `Affected by`, or gives each option's figure with `Varies with`. A cost that grows over time is a range ("$3 → $39"), and says so in What drives it. |
| Risks | What could go wrong once it's running: likelihood, what happens, what we'd do, and what it's linked to. |
| Decisions | Every decision the design depends on, open or made, with its status and where it's worked out. Each row opens the decision in a modal with its reasoning and alternatives, all from design.md. See [pages](pages.md). |
| Open questions | Every open question, who can answer it and what it blocks. Answered ones collapse under their home page's list. |

Leave out a section with nothing real in it: cost for a process change, the security view when no data crosses a boundary, the map until there are areas.

## What we're after

- **The goals** are outcomes someone would recognise without knowing the design ("Every firewall log searchable within a minute"), numbered and one line each. A constraint someone set ("no new VPN tunnels before January") is a requirement, not a goal.
- **The picture** has two rows. "Today" shows what's wrong now; "With this design" shows what changes, with each goal's number where it's met. It's drawn to be understood by someone who'll never read the architecture: name what each thing does ("Search and alerts", "Archive", "Log pipeline"), never what product it is. If swapping one product for another, or choosing a different network, would change this picture, it's too specific.
- **Not part of this design:** one line for what's deliberately left out, when a reader might assume it's included.

## The whole system and its parts

- **Draw the current best picture,** at the level where decisions that span areas are argued. Where a decision is still open, draw what's leaned towards or assumed, bind the parts that depend on it (`data-pending="D1"`, which dashes them until it's decided), and put that decision's marker on them. Don't draw the alternatives; they belong in the decision's brief.
- **Choose the picture the design needs:** components and networks for infrastructure, the phases side by side for a migration, the steps and hand-offs for a process. The security view applies whenever data crosses a boundary.
- **When a decision is made,** the bound parts turn solid on the next build. Redraw only when what was chosen differs from what was drawn; a part drawn for one option can carry `data-when="D1=B"` so it shows only while that option is chosen or leaned towards.
- **The parts table** has one row per box: what it does, the decisions that shaped it (including settled ones, so each part links back to why it's that way), and its evidence. It sits under this diagram until the design has areas; then each part lives on its area's page, under that area's diagram.

## Area page sections

In short with terms, Requirements (its own, then the ones that apply to it), Design (a diagram at this area's level of detail and its parts table), How it measures up, Risks, Decisions, and Open questions. Add Cost only when it's specific to the area. Show neighbouring areas as plain boxes that link to their pages. Leave out Risks when none reach the area.

## Brief sections

A brief answers one question. Keep one question per brief, and put its own decisions (D1, D2, …) in scope. Show related decisions as context on its decision map: ones already made that this depends on, and ones that must wait for this. When a sub-decision grows its own options, evidence and questions, give it its own brief.

| Section | Purpose |
| --- | --- |
| In short | Three short paragraphs: what's being done, why this question comes up, why it has to be settled now. Terms under it. |
| Requirements | Only when the doc has no overview. Inside a design, the brief is measured against the overview's requirements. |
| Decision map | The decisions and how they depend on each other, with the open questions that block them: `::: decision-map`, drawn from each decision's Follows and Waiting on. See [diagrams](diagrams.md). |
| Decisions | Only when the doc has no overview: every decision the map shows, including context ones already made or that must wait. |
| One section per decision | Framing, relations, the reasoning once there's a leaning, options, set-aside options, a comparison against requirements, a security view when the question touches data or compliance (see [security](security.md)), and any extra part the decision needs. |
| Open questions | The questions blocking the brief's decisions (its `meta`), each saying where it lives. |

There's no "outcome" or "decision record" section. Decisions show up as status changes, and meeting summaries record what changed.

### Decision sections

- **`## D1` makes the section:** its title is the decision's marker and question, with its status from design.md beside it ("Leaning B"), so a meeting sees where it stands in words.
- **Framing:** two or three sentences on what is being chosen and what stays the same whichever option wins.
- **Relations:** what it follows, what it unblocks, and which questions it's waiting on, drawn from the decision's `Follows` and `Waiting on` and from the decisions that follow it.
- **Reasoning:** once the decision has a Why, its Why, Reasoning and Revisit if show under the relations, above the options.
- **Options:** at least two, each with a letter (A, B, C) and its own colour. Record each under its decision in design.md (short name, summary, works well, costs and risks, evidence with what each finding shows for it), and `::: options D1` renders the cards. Draw a diagram per option when the options differ in structure, as a component, and name it on the block (`A=d1-a`).
- **Set aside:** options ruled out before the decision stay visible in one line with the date and reason, so nobody re-proposes them without knowing why they were dropped. The options block adds them.
- **When it's decided:** mark the winner Chosen and each other option Not chosen with its Why not; the winning card shows Chosen, and each losing card stays in full with its date and reason. Readers still want to compare them.
- **Comparison:** requirements against options, with a verdict (meets, partly, doesn't) and a few words per cell: a `Meets R1` field on each option, rendered by `::: comparison D1`.
- **Extra parts as needed:** add what the decision actually hinges on, especially anything the requester asked about by name. Cost, failover and recovery, migration effort, timeline, and operational load are common. For cost, show where the money goes with `::: cost-options D1`: a bar per option splitting the shared part from the difference, then the line items grouped into "differs between options" and "same in both", each citing its pricing evidence. The lines are Costs records; those that differ give each option's figure and `Varies with: D1`. When the options share no common base, draw each bar in one colour and add today's cost as a first, grey bar for reference. For failover, a table of what fails, what happens, how long it takes, and what's lost, per option.
- **What would settle it:** when a decision is waiting on questions, say which answers lead to which choice, in a `::: callout`.
- **Status:** Open, Leaning (name the option), Decided, or Later, set in design.md, with a Why once it's Leaning or Decided. Leaning records the team's direction; research alone doesn't make an option Leaning, though the page can say what the evidence favours. Mark a leaning with "Current leaning" on that option rather than a recommendation section. A premise the requester states as fixed ("we do rolling deploys") is a context decision with status Given.
- **Options found in research:** when research turns up a viable option nobody proposed, add it with `Status: Found in research`; its card and the decision modal show it. The team decides whether it stays. Set aside is only for options the team has ruled out.
- **Options nobody has designed yet:** keep the option with `Status: Not designed yet`, and draw its new parts as sketches (`node sketch`) so they don't look settled.

Smaller decisions can show their options side by side in compact cards instead of full-width ones.

## Requirements versus things to understand

A requirement is something someone actually needs, with a source. Don't turn "we should know the cost" into an invented limit like "under $150 a month". If nobody set a limit, show cost as its own section or part instead.

When a requirement is implied by how the question was asked but nobody stated it, you can still list it. Give its source as "Implied by the request" and add an open question to confirm it.

## Evidence

- Everything a page states about the current world, the design, or an option needs a source: a finding (E1) or, if nobody knows yet, an open question (Q1). This includes each box and connection in a diagram.
- Don't fill gaps with plausible numbers or assumptions. An unknown becomes an open question with someone who can answer it.
- Write the finding as a plain statement. In "How we know", say how it was established (read the route tables, priced from the published rates, confirmed with the network team). In "Gathered from", describe each source portably: the kind of source and a name a colleague would recognise ("AWS account · prod-network", "infra-network repo · VPN module", "Network team, Sep 24").
- Keep local file paths, machine names, and private URLs in the record's `Recorded from` field, which is never published (see [records](records.md)).
- Add a finding's date. The Evidence page lists where each finding is cited on its own.
- Write findings, questions and requirements as design.md records; the tables on every page are rendered from them.
- Facts the requester states are evidence too. Write "Stated in the request, not independently checked" in How we know and "Request · <date>" in Gathered from. When a requirement or decision rests on one, add a question to confirm it.
- A finding can be an absence ("the vendor's docs describe no rotation feature"). Say what was searched, and pair it with a question to whoever could confirm when it matters.
- Public documentation can be linked from Gathered from; it's portable. Private sources can't.

## Open questions

- Phrase each as a question someone could answer with a fact or a ruling. If it's really a choice between options with tradeoffs, it's a decision; a question is something we find out, a decision something we choose. A ruling someone else makes (what security allows) is a question for us; what we do within it is our decision.
- Who can answer: name a person, team, or vendor, and say whether that's me, our team, another team, or a vendor. A question nobody can answer isn't ready to be listed; say what would find the answer instead.
- Say which decisions, requirements or flows it blocks. A security unknown blocks the flow whose Assessment can't be settled without it (`Blocks: S-F5`), and that Assessment cites it. A question that blocks nothing is about the work, not the design: it goes in the effort's open questions. The decisions it blocks list it in `Waiting on`.
- Record who it was put to, when, and through what in `Asked`, and leave out what to ask next. A partial answer goes in `So far`, with the evidence it rests on.
- **When it's answered,** the answer becomes evidence (a new E#, with its source). Give the question `Answer` (a few words) and `Answered by` (the evidence); it moves to its page's collapsed Answered list. Then update what it blocked: take it off each decision's `Waiting on`, move the decision if the answer settles it or rules an option out (citing the evidence), update any requirement's `Met`, and bring the pages along. An answer that is really a rule someone set is a candidate requirement or Given decision, with them as its source: propose it, and add it on the user's word like any other requirement. An answer that raises new questions gets new Q numbers.
- **When a decision is settled without it,** take the decision off the question's `Blocks` and `Waiting on`. The question stays while it still blocks a requirement or another decision. If it now blocks nothing, `check` says so; ask the user whether it still matters to the design or moves to the effort's open questions. If its answer could still overturn the decision, say so in the decision's `Revisit if`.

## Identifiers

- E (evidence), Q (question), D (decision) and R (requirement) numbers are unique across the doc and stable. Never renumber: meeting notes and conversations refer to them.
- When something is answered, superseded, or dropped, update it in place and say so rather than reusing its number.
- When a brief joins a design doc, keep its numbers if they're free; otherwise renumber once, at that moment, and note it in the next meeting summary.

## Language

- Write for someone smart who doesn't know the system. Define every acronym in the terms list or on first use.
- Prefer short, concrete sentences. Put numbers where they matter: counts, costs, sizes, dates.
- Use tables for anything compared across options or items; use prose for framing and reasons.
- Leave out how the doc was made, who researched what, and approval states.
