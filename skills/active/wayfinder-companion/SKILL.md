---
name: wayfinder-companion
description: Keep a human-owned vision, source research, experiment readouts, and a working model alongside a Wayfinder map. User-invoked.
disable-model-invocation: true
argument-hint: "An idea, map, or ticket to orient and preserve"
---

# Wayfinder Companion

Wayfinder owns the route: its map is the low-resolution planning index, and its tickets hold authoritative decision detail. This companion keeps optional durable context around that effort: a human-owned **vision**, source research, experiment readouts, and a changing **working model**.

Use it when starting or continuing a Wayfinder effort that needs durable intent or evidence beyond its decision tickets. Do not use it for a one-session task or an effort whose map needs neither.

## 1. Join A Wayfinder Effort

This companion has a manual handshake with Wayfinder:

- **Start:** invoke Wayfinder first to name the destination and chart the map. Then invoke this companion with that map to establish its durable vision and evidence context.
- **Continue:** load the map and any linked companion artifacts relevant to the question; invoke Wayfinder again before claiming, resolving, or otherwise advancing a ticket.

If no map exists, direct the user to invoke Wayfinder and stop. Do not create companion artifacts before a map exists.

When Wayfinder is active, follow its current instructions for the destination, map, tickets, frontier, claims, blocking, fog, resolutions, and scope. This companion may orient or update vision and evidence on its own, but never advances the ticket lifecycle.

Done when the vision is the source of durable human direction, Wayfinder owns the route and ticket lifecycle, and their boundaries are unambiguous.

## 2. Create Or Locate Companion Artifacts

Use an existing, authorized durable location. Keep companion artifacts adjacent to the map only when the tracker or local-map convention already supplies that location; otherwise ask the user before creating a separate store. Add concise context pointers to the map's `## Notes` section so future sessions can find active artifacts without turning the map into a catalog.

Locate an existing human-owned vision before creating one. When the effort has durable product or feature direction that is broader than the map's planning destination, create the smallest vision artifact that preserves the accepted north star, desired outcome, principles, authority boundaries, evolution direction, and non-goals. Resolve consequential ambiguity with the human. Keep implementation plans, ticket state, framework inventory, and current status in their owning artifacts rather than the vision.

The vision and map have different jobs: the vision describes the future worth reaching; the map describes how the effort is finding a clear route to its destination. Link them rather than copying either into the other.

For a local Markdown tracker, use the tracker convention. A companion-capable initiative layout keeps these artifacts beside the map and Wayfinder decision records:

```text
<initiative>/
  map.md
  decisions/
    open/
    closed/
  decision-briefs/   # optional: first reader-ready forum brief
  vision.md          # optional: first durable direction need
  working-model.md   # optional: first synthesis need
  research/          # optional: first source-research record
  experiments/       # optional: first prototype or experiment readout
```

Create companion artifacts only when their first record is needed. The adjacent companion artifacts provide durable context without an additional wrapper directory, initiative README, or status board.

Each artifact has a distinct job:

- A decision brief is a standalone, reader-ready synthesis for one user-designated forum. It supports the ticket but never replaces its decision detail or lifecycle.
- The working model is the current synthesis of established facts, constraints, candidate shape, meaningful alternatives, uncertainty, and implications. It is neither a target-state document nor a status board.
- Research records capture what existing source code, documentation, systems, or other sources establish: their question or scope, source locators, observations, interpretation, uncertainty, and related map or ticket links.
- Experiment readouts capture what a bounded prototype or test established: its hypothesis, linked ticket and artifact, method, observations, limits, and changes to the working model. The prototype source stays in its owning repository or worktree.

Do not copy the destination, frontier, ticket status, decision answers, or scope boundaries into companion artifacts. Link to the Wayfinder artifact that owns each of them.

Done when a fresh session can load the map and relevant companion artifacts, then selectively open evidence without reopening every source.

## 3. Work A Ticket With Evidence

At the start of a ticket session, load the map, any linked vision, working model, and decision brief, and only the relevant research or experiment records. Claim and resolve the ticket exactly as Wayfinder directs.

As evidence changes:

- preserve the source and its confidence boundary in a research record;
- create an experiment readout when a prototype produces reusable learning, then update the working model if that learning changes the current explanation;
- update the working model when the evidence changes the current explanation;
- surface evidence or decisions that challenge the vision, and revise the vision only when the human accepts a change in direction;
- explain meaningful alternatives and how each would change the model before asking the human to choose;
- surface newly precise decisions through Wayfinder's tickets or fog, not through a checklist in companion context.

When a question needs a concrete artifact, let Wayfinder designate a prototype ticket and use the appropriate prototype behavior. Follow the active effort's isolation guidance; if none exists, ask the user before creating mutable code. Link the artifact from the ticket and relevant experiment readout or working model, and record what it taught the model.

When the user asks to prepare a design fork for shared input, keep it in an existing Wayfinder `grilling` ticket. Treat the **decision forum** as a user-designated discussion around that ticket, not as a new ticket type or planning system:

- when the user asks for a read-ahead, presentation, or in-depth shared discussion, create and link `decision-briefs/<ticket-slug>.md`; use [the decision-brief reference](references/decision-brief.md) to make it reader-ready and traceable;
- keep the ticket concise and authoritative while the brief synthesizes relevant vision, working-model context, prior decisions, research, experiments, options, impacts, trade-offs, and any clearly labeled recommendation;
- leave participants, scheduling, and buy-off to the user rather than recording or managing them in companion artifacts;
- leave the ticket open until the user-led discussion resolves its question.

At an undesignated design fork, preserve the options and their evidence in the ticket, research, experiments, or working model as appropriate. Leave the choice to convene a forum or create a brief to the user.

Done when the ticket's answer has the needed evidence behind it, the model reflects the answer's consequences, and any required decision forum has a clear human outcome.

## 4. Close The Loop

Before Wayfinder records a resolution, make changed research, experiment readouts, model, vision, decision brief, and asset links durable. Revise the vision only when the resolution intentionally changes accepted direction. If a decision brief exists, link its concise outcome to the authoritative ticket resolution. Then let Wayfinder post the resolution, close the ticket, update the map, and graduate or rule out follow-on work.

Every closed in-scope ticket, including research and prototype tickets, receives one linked gist in the map's `## Decisions so far`. An out-of-scope ticket follows Wayfinder's `## Out of scope` treatment instead.

Leave the effort orientation-ready: the map points to its active companion context, the vision remains durable intent rather than status, and the model distinguishes evidence, hypotheses, and unresolved alternatives. Use a separate handoff only when the user needs a narrative beyond that durable context.

Done when the next Wayfinder session can resume from the map and relevant companion artifacts without reconstructing prior intent or exploration.
