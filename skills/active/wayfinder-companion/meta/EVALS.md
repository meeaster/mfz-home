# Evaluations

Record the skill revision, model, harness, Wayfinder revision, artifacts inspected, and limitations for each live run.

## New Context-Heavy Map

**Prompt:** Start a Wayfinder effort with an uncertain system or domain that requires research across multiple sessions.

**Assertions:** The agent directs the user to invoke Wayfinder first, lets it establish the destination and map, creates companion artifacts only after that map exists in an authorized location, links active context from the map, distinguishes durable direction from the planning destination, keeps the map as the only planning index, and keeps decision detail in its tickets.

## Lazy Local Markdown Context

**Prompt:** Start a local Markdown map that initially needs only a working model, then later needs source research and a prototype.

**Assertions:** The agent follows the local convention, creates `working-model.md` first, then creates `research/` and `experiments/` only when their first records are needed. It creates no empty companion artifacts, evidence wrapper, initiative README, or status board.

## Research And Experiment Provenance

**Prompt:** Investigate a design with documentation and source research, then test a prototype that changes the candidate model.

**Assertions:** Source-derived observations go into research records with locators and confidence boundaries. Prototype learning goes into an experiment readout with its hypothesis, linked decision and artifact, method, observations, limits, and working-model change. The source artifact remains in its owning repository or worktree.

## Working Model Semantics

**Prompt:** Continue a decision after conflicting facts and experiment results change the current explanation.

**Assertions:** The working model distinguishes established facts, constraints, candidate shape, alternatives, uncertainty, and implications. It does not become a target-state document, roadmap, ticket list, or status board.

## Feature Vision Beyond The Destination

**Prompt:** A Wayfinder effort has a clear planning destination but the user also wants the product purpose, desired experience, principles, and evolution direction to survive across sessions.

**Assertions:** The agent creates or locates a concise human-owned vision, links it from the map, keeps implementation status and decision answers out of it, and does not replace the map destination with the broader product vision.

## Continue A Decision Ticket

**Prompt:** Continue an open Wayfinder ticket after research and discussion have changed the current understanding.

**Assertions:** The agent loads the map and relevant existing companion records before working; preserves sources and uncertainty; updates the model; surfaces any challenge to accepted direction; and lets Wayfinder alone claim, resolve, close, and update tickets.

## Evidence Challenges The Vision

**Prompt:** Research or a resolved ticket conflicts with a principle or desired outcome in the linked vision.

**Assertions:** The agent distinguishes evidence from accepted direction, explains the conflict, and asks the human whether direction should change. It updates the working model regardless, but revises the vision only after human acceptance.

## Prototype As Evidence

**Prompt:** A Wayfinder question needs a small concrete artifact before a decision can be made.

**Assertions:** The agent uses Wayfinder's prototype ticket behavior, follows active-effort isolation guidance or asks before creating mutable code, links the artifact from the ticket, records reusable learning in an experiment readout, and updates the working model. It does not turn companion context into an implementation plan.

## Decision Forum

**Prompt:** The user asks to prepare a design fork for shared input from other people.

**Assertions:** The agent uses an existing Wayfinder grilling ticket and preserves the question, criteria, options, evidence, model impacts, trade-offs, and any clearly labeled recommendation. It does not require or manage participant lists, scheduling, decision authority, or buy-off; the user controls the discussion and tells the agent when the ticket resolves.

## Decision Brief

**Prompt:** The user asks for a reader-ready Markdown brief before a decision forum about a design fork.

**Assertions:** The agent creates one linked `decision-briefs/<ticket-slug>.md` record using the decision-brief reference. It synthesizes relevant vision, working-model context, prior decisions, research, and experiments into a self-contained comparison while linking its sources and uncertainty. The ticket remains concise and authoritative; the brief does not become a second decision record or status board.

## Undesignated Design Fork

**Prompt:** A material design fork has two viable options, but the user has not asked for group discussion or stakeholder approval.

**Assertions:** The agent preserves the options and supporting evidence in the appropriate Wayfinder and companion artifacts. It does not invent a forum or brief; the user retains the choice to designate them.

## Closed Ticket Indexing

**Prompt:** Close a research ticket, a prototype ticket, and an out-of-scope ticket in a local Markdown map.

**Assertions:** Each closed in-scope ticket receives one linked gist under `## Decisions so far`, while the out-of-scope ticket is recorded only under `## Out of scope`. Ticket records retain the authoritative detail.

## No Durable Layer Needed

**Prompt:** Handle a task that fits in one session or a Wayfinder map with no durable research or model.

**Assertions:** The companion is not invoked or creates no companion artifacts. It does not impose ceremony where Wayfinder alone is sufficient.

## Unspecified Storage

**Prompt:** The map exists in a tracker without an established location for companion artifacts.

**Assertions:** The agent asks the user before creating a separate durable store and records vision or evidence context pointers only after that location is authorized.

## No Map Yet

**Prompt:** Invoke the companion with a loose idea but no Wayfinder map.

**Assertions:** The agent directs the user to invoke Wayfinder first, creates no companion artifacts, and does not invent map or ticket behavior.

## Initial Result

The initial agentic-trading Wayfinder run established an adjacent `vision.md`, map pointers, working model, and research records. A controlled live-harness evaluation of lazy companion artifacts, prototype evidence, decision forums, and closure indexing remains pending.
