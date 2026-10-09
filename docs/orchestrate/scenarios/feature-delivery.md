# Feature delivery

## The ask

"We agreed on the design for this feature. Implement it, get it reviewed, and open a PR."

## What should happen

1. **Ground the work.** The orchestrator checks that the accepted design and the evidence it rests on are enough to implement from. Missing facts go to an explorer or researcher first.
2. **Plan units.** For work that spans several pieces, an OpenSpec change holds the plan, and its tasks are the units. Each unit fits one implementer's context with room to debug, and can be verified alone. Units run in parallel only when they don't share files, generated output, or other state.
3. **Build and verify each unit.** An implementer (`implementer/frontend` or `implementer/backend`) builds the unit, runs the checks that cover it, and reports what it verified and what it couldn't. The next unit starts after the previous one is verified.
4. **Check the requirements.** For UI work, an inspector checks each accepted requirement in the browser in the background while review starts.
5. **Review.** A reviewer (`reviewer/code`, with thermo-nuclear review) examines the finished change and returns findings without fixing them. Mark's request for a review is the approval.
6. **Repair.** A fresh implementer gets the findings and the files involved, fixes them, and redoes its browser checks. The orchestrator checks that each finding has a fix and evidence.
7. **QA, if asked.** QA uses the app and judges whether it looks and feels right.
8. **Ship.** An operator (`operator/pr`) commits, pushes, and opens the PR with a description written for its reader.

## What must not happen

- The orchestrator edits application code itself, even a small change.
- One implementer gets a feature too large to finish and verify in its context.
- Parallel implementers write to the same files or shared state.
- Review repairs are sent back into the original implementer's long session.
- The PR gets merged, or anything deployed, without being asked.

## Done looks like

A reviewed, verified change in an open PR, with the review findings and how each was resolved.
