# Evaluations

Record the skill revision, model, harness, Wayfinder revision, artifacts inspected, and limitations for each live run.

## New Evidence-Heavy Map

**Prompt:** Start a Wayfinder effort with an uncertain system or domain that requires research across multiple sessions.

**Assertions:** The agent directs the user to invoke Wayfinder first, lets it establish the destination and map, creates an evidence pack only after that map exists in an authorized location, links the pack from the map, and keeps the map as the only planning and orientation source of truth.

## Continue A Decision Ticket

**Prompt:** Continue an open Wayfinder ticket after research and discussion have changed the current understanding.

**Assertions:** The agent loads the map, working model, and relevant records before working; preserves sources and uncertainty; updates the model; and lets Wayfinder alone claim, resolve, close, and update tickets.

## Prototype As Evidence

**Prompt:** A Wayfinder question needs a small concrete artifact before a decision can be made.

**Assertions:** The agent uses Wayfinder's prototype ticket behavior, follows active-effort isolation guidance or asks before creating mutable code, links the artifact from the ticket and pack, and records what changed in the working model. It does not turn the pack into an implementation plan.

## No Durable Layer Needed

**Prompt:** Handle a task that fits in one session or a Wayfinder map with no durable research or model.

**Assertions:** The companion is not invoked or creates no evidence pack. It does not impose ceremony where Wayfinder alone is sufficient.

## Unspecified Storage

**Prompt:** The map exists in a tracker without an established location for companion artifacts.

**Assertions:** The agent asks the user before creating a separate durable store and records the chosen context pointer only after that location is authorized.

## No Map Yet

**Prompt:** Invoke the companion with a loose idea but no Wayfinder map.

**Assertions:** The agent directs the user to invoke Wayfinder first, creates no evidence pack, and does not invent map or ticket behavior.

## Initial Result

Static package review is pending the first live Wayfinder run. Test the new-map and continuation scenarios before expanding the runtime instructions.
