---
name: wayfinder-companion
description: Keep an evidence pack and working model alongside a Wayfinder map. User-invoked.
disable-model-invocation: true
argument-hint: "An idea, map, or ticket to orient and preserve"
---

# Wayfinder Companion

Wayfinder owns the route. This companion keeps the **evidence pack** that lets later Wayfinder sessions understand why that route exists: source-grounded research, a changing working model, and links to experiments. The map remains the only orientation index.

Use it when starting or continuing a Wayfinder effort that needs durable context beyond its decision tickets. Do not use it for a one-session task or an effort whose map needs no supporting evidence.

## 1. Join A Wayfinder Effort

This companion has a manual handshake with Wayfinder:

- **Start:** invoke Wayfinder first to name the destination and chart the map. Then invoke this companion with that map.
- **Continue:** load the map and evidence pack here; invoke Wayfinder again before claiming, resolving, or otherwise advancing a ticket.

If no map exists, direct the user to invoke Wayfinder and stop. Do not create companion artifacts before a map exists.

When Wayfinder is active, follow its current instructions for the destination, map, tickets, frontier, claims, blocking, fog, resolutions, and scope. This companion may orient or update evidence on its own, but never advances the ticket lifecycle.

Done when the Wayfinder map is the unambiguous source of truth for planning and decisions.

## 2. Create Or Locate The Evidence Pack

Use an existing, authorized durable location. Keep the pack adjacent to the map only when the tracker or local-map convention already supplies that location; otherwise ask the user before creating a separate store. Add one context pointer to the map's `## Notes` section so future sessions can find the pack.

The pack is a collection of records, not another index:

- The working model captures the current domain or system model: established facts, hypotheses, alternatives, constraints, and implications. Mark uncertainty rather than converting it into fact.
- Research records hold a question or scope, sources with locators, observations, interpretation, uncertainty, and related map or ticket links.
- Experiments stay linked from the relevant ticket and, when useful, the supporting research or model record.

Use the active tracker's local convention for filenames and directories. For a local Markdown map, keep the working model and research adjacent to that map. Do not add a separate README or status board.

Do not copy the destination, frontier, ticket status, decision answers, or scope boundaries into the pack. Link to the Wayfinder artifact that owns each of them.

Done when a fresh session can load the map and working model, then selectively open the relevant research without reopening every source.

## 3. Work A Ticket With Evidence

At the start of a ticket session, load the map, the working model, and only the research records relevant to the question. Claim and resolve the ticket exactly as Wayfinder directs.

As evidence changes:

- preserve the source and its confidence boundary in a research record;
- update the working model when the evidence changes the current explanation;
- link an experiment where it supports the research or model;
- explain meaningful alternatives and how each would change the model before asking the human to choose;
- surface newly precise decisions through Wayfinder's tickets or fog, not through a checklist in the pack.

When a question needs a concrete artifact, let Wayfinder designate a prototype ticket and use the appropriate prototype behavior. Follow the active effort's isolation guidance; if none exists, ask the user before creating mutable code. Link the artifact from the ticket and pack, and record what it taught the model.

Done when the ticket's answer has the needed evidence behind it and the model reflects the answer's consequences.

## 4. Close The Loop

Before Wayfinder records a resolution, make the changed research, model, and asset links durable. Then let Wayfinder post the resolution, close the ticket, update the map, and graduate or rule out follow-on work.

Leave the pack orientation-ready: the map points to its context, and the model distinguishes evidence, hypotheses, and unresolved alternatives. Use a separate handoff only when the user needs a narrative beyond that durable context.

Done when the next Wayfinder session can resume from the map and evidence pack without reconstructing prior exploration.
