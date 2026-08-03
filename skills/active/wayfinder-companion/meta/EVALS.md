# Evaluations

Record the skill revision, model, harness, Wayfinder revision, artifacts inspected, and limitations for each live run.

## New Evidence-Heavy Map

**Prompt:** Start a Wayfinder effort with an uncertain system or domain that requires research across multiple sessions.

**Assertions:** The agent directs the user to invoke Wayfinder first, lets it establish the destination and map, creates companion artifacts only after that map exists in an authorized location, links the vision and evidence pack from the map, distinguishes durable direction from the planning destination, and keeps the map as the only planning index and decision source of truth.

## Feature Vision Beyond The Destination

**Prompt:** A Wayfinder effort has a clear planning destination but the user also wants the product purpose, desired experience, principles, and evolution direction to survive across sessions.

**Assertions:** The agent creates or locates a concise human-owned vision, links it from the map, keeps implementation status and decision answers out of it, and does not replace the map destination with the broader product vision.

## Continue A Decision Ticket

**Prompt:** Continue an open Wayfinder ticket after research and discussion have changed the current understanding.

**Assertions:** The agent loads the map, linked vision, working model, and relevant records before working; preserves sources and uncertainty; updates the model; surfaces any challenge to accepted direction; and lets Wayfinder alone claim, resolve, close, and update tickets.

## Evidence Challenges The Vision

**Prompt:** Research or a resolved ticket conflicts with a principle or desired outcome in the linked vision.

**Assertions:** The agent distinguishes evidence from accepted direction, explains the conflict, and asks the human whether direction should change. It updates the working model regardless, but revises the vision only after human acceptance.

## Prototype As Evidence

**Prompt:** A Wayfinder question needs a small concrete artifact before a decision can be made.

**Assertions:** The agent uses Wayfinder's prototype ticket behavior, follows active-effort isolation guidance or asks before creating mutable code, links the artifact from the ticket and pack, and records what changed in the working model. It does not turn the pack into an implementation plan.

## No Durable Layer Needed

**Prompt:** Handle a task that fits in one session or a Wayfinder map with no durable research or model.

**Assertions:** The companion is not invoked or creates no vision or evidence pack. It does not impose ceremony where Wayfinder alone is sufficient.

## Unspecified Storage

**Prompt:** The map exists in a tracker without an established location for companion artifacts.

**Assertions:** The agent asks the user before creating a separate durable store and records vision or evidence context pointers only after that location is authorized.

## No Map Yet

**Prompt:** Invoke the companion with a loose idea but no Wayfinder map.

**Assertions:** The agent directs the user to invoke Wayfinder first, creates no evidence pack, and does not invent map or ticket behavior.

## Initial Result

The initial agentic-trading Wayfinder run established an adjacent `vision.md`, map pointers, working model, and research records. A controlled live-harness evaluation of vision drift and continuation behavior remains pending.
