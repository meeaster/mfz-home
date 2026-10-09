# Design doc

## The ask

"We have VPN Datadog agents in one AWS account, monitoring our VPN agents there. We want to deploy Datadog agents in another AWS account to monitor different VPN agents. What would the process be? I don't need to build it yet. I need a design doc with options and recommendations."

## What should happen

1. **Check what's known, in the background, straight away.** An explorer searches the catalog (`catalog_find`) and knowledge articles for the VPN setup, the Datadog agents, and both AWS accounts. The conversation continues while it runs.
2. **Talk it through.** The orchestrator, as design partner, asks about the constraints that matter: who reads the doc, account ownership, network paths, cost. It challenges assumptions.
3. **Fill the gaps in parallel.** When the knowledge check returns, the orchestrator says what changed and what's still missing. A researcher reads Datadog's docs on agent deployment and cross-account monitoring; an inspector reads the current agents and the VPC and IAM setup in the existing account. Both run in the background.
4. **Write up what was learned.** If Mark asks, a writer folds the new evidence into a knowledge article, so the architect and later sessions read one article instead of several results.
5. **Options and a recommendation.** An architect develops two or three options with tradeoffs and a recommendation. Mark's request for options and recommendations is the approval.
6. **Settle decisions.** Mark and the orchestrator accept, change, or leave each decision open.
7. **Write the doc.** A writer builds the design with `design-docs`, given the architect's result unchanged plus a note of what Mark changed. It checks the rendered pages itself at a glance and has an inspector take the full screenshot pass, then repairs what the inspector finds.

## What must not happen

- The orchestrator reads Datadog docs, AWS state, or source itself.
- The knowledge check waits until after the conversation, or the conversation waits on it.
- The architect writes HTML, or the writer re-decides the options.
- The writer's render-and-repair loop runs through the orchestrator.
- Anything gets implemented or deployed.

## Done looks like

A rendered design doc with options, a recommendation, and open decisions, built on a knowledge article that later sessions can reuse.
