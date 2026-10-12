# Autonomous feature delivery (planned)

This scenario describes the planned autonomous mode in the [design](../design.md#planned). It is the target the mode will be checked against, not current behavior.

## The ask

Mark selects autonomous mode: "Build the export feature. Here are the requirements." He works out the acceptance criteria and their verification plan with the orchestrator, then leaves it to run.

## What should happen

1. **Agree the criteria and the verification plan.** This is the first of Mark's two checkpoints. The orchestrator also states the cost budget it will work within.
2. **Run the whole flow without stopping.** Research and evidence gathering, an architect's options with the orchestrator choosing within the agreed requirements, units split for implementers, verification, inspection, review, and repairs. Expensive roles run within the budget without asking.
3. **Stop for what wasn't pre-approved.** A decision that changes the agreed requirements, a budget overrun, or a needed permission comes back to Mark instead of being decided.
4. **Hand off.** The final inspector pass gathers evidence from the finished code. An operator opens a PR on a branch whose description carries each criterion with its evidence, the findings with their resolutions, and any verification gaps. This is Mark's second checkpoint.

## What must not happen

- The PR is merged or anything is deployed.
- The orchestrator changes the agreed requirements to make the work easier.
- Evidence from inside the loop, or from before repairs, stands in for the final pass.
- Spending goes past the budget without Mark's agreement.

## Done looks like

An open PR Mark can review from its evidence alone, without having watched the work.
