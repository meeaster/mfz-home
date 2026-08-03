---
name: wayfinder-companion
description: Keep a human-owned vision, evidence pack, and working model alongside a Wayfinder map. User-invoked.
disable-model-invocation: true
argument-hint: "An idea, map, or ticket to orient and preserve"
---

# Wayfinder Companion

Wayfinder owns the route. This companion keeps the durable context around it: a human-owned **vision** for intended direction and an **evidence pack** containing source-grounded research, a changing working model, and links to experiments. The map remains the only planning index.

Use it when starting or continuing a Wayfinder effort that needs durable intent or evidence beyond its decision tickets. Do not use it for a one-session task or an effort whose map needs neither.

## 1. Join A Wayfinder Effort

This companion has a manual handshake with Wayfinder:

- **Start:** invoke Wayfinder first to name the destination and chart the map. Then invoke this companion with that map to establish its durable vision and evidence context.
- **Continue:** load the map, linked vision, and evidence pack here; invoke Wayfinder again before claiming, resolving, or otherwise advancing a ticket.

If no map exists, direct the user to invoke Wayfinder and stop. Do not create companion artifacts before a map exists.

When Wayfinder is active, follow its current instructions for the destination, map, tickets, frontier, claims, blocking, fog, resolutions, and scope. This companion may orient or update vision and evidence on its own, but never advances the ticket lifecycle.

Done when the vision is the source of durable human direction, the Wayfinder map is the source of truth for planning and decisions, and their boundaries are unambiguous.

## 2. Create Or Locate The Vision And Evidence Pack

Use an existing, authorized durable location. Keep companion artifacts adjacent to the map only when the tracker or local-map convention already supplies that location; otherwise ask the user before creating a separate store. Add concise context pointers to the map's `## Notes` section so future sessions can find the vision and pack.

Locate an existing human-owned vision before creating one. When the effort has durable product or feature direction that is broader than the map's planning destination, create the smallest vision artifact that preserves the accepted north star, desired outcome, principles, authority boundaries, evolution direction, and non-goals. Resolve consequential ambiguity with the human. Keep implementation plans, ticket state, framework inventory, and current status in their owning artifacts rather than the vision.

The vision and map have different jobs: the vision describes the future worth reaching; the map describes how the effort is finding a clear route to its destination. Link them rather than copying either into the other.

The pack is a collection of records, not another index:

- The working model captures the current domain or system model: established facts, hypotheses, alternatives, constraints, and implications. Mark uncertainty rather than converting it into fact.
- Research records hold a question or scope, sources with locators, observations, interpretation, uncertainty, and related map or ticket links.
- Experiments stay linked from the relevant ticket and, when useful, the supporting research or model record.

Use the active tracker's local convention for filenames and directories. For a local Markdown map, keep the vision, working model, and research adjacent to that map. Do not add a separate README or status board.

Do not copy the destination, frontier, ticket status, decision answers, or scope boundaries into the pack. Link to the Wayfinder artifact that owns each of them.

Done when a fresh session can load the map, vision, and working model, then selectively open relevant research without reopening every source.

## 3. Work A Ticket With Evidence

At the start of a ticket session, load the map, the linked vision, the working model, and only the research records relevant to the question. Claim and resolve the ticket exactly as Wayfinder directs.

As evidence changes:

- preserve the source and its confidence boundary in a research record;
- update the working model when the evidence changes the current explanation;
- surface evidence or decisions that challenge the vision, and revise the vision only when the human accepts a change in direction;
- link an experiment where it supports the research or model;
- explain meaningful alternatives and how each would change the model before asking the human to choose;
- surface newly precise decisions through Wayfinder's tickets or fog, not through a checklist in the pack.

When a question needs a concrete artifact, let Wayfinder designate a prototype ticket and use the appropriate prototype behavior. Follow the active effort's isolation guidance; if none exists, ask the user before creating mutable code. Link the artifact from the ticket and pack, and record what it taught the model.

Done when the ticket's answer has the needed evidence behind it and the model reflects the answer's consequences.

## 4. Close The Loop

Before Wayfinder records a resolution, make changed research, model, vision, and asset links durable. Revise the vision only when the resolution intentionally changes accepted direction. Then let Wayfinder post the resolution, close the ticket, update the map, and graduate or rule out follow-on work.

Leave the effort orientation-ready: the map points to its vision and evidence context, the vision remains durable intent rather than status, and the model distinguishes evidence, hypotheses, and unresolved alternatives. Use a separate handoff only when the user needs a narrative beyond that durable context.

Done when the next Wayfinder session can resume from the map, vision, and evidence pack without reconstructing prior intent or exploration.
