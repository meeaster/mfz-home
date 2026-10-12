# Feature delivery

## The ask

"We agreed on the design for this feature. Implement it, get it reviewed, and open a PR."

## What should happen

1. **Ground the work.** The orchestrator checks that the accepted design and the evidence it rests on are enough to implement from. Missing facts go to an explorer or researcher first. The design's requirements become acceptance criteria, things Mark could observe working, each with how it will be verified and at what evidence level, planned from the repository's verification article. The orchestrator confirms them with Mark.
2. **Plan units.** For work that spans several pieces, an OpenSpec change holds the plan, and its tasks are the units. Each unit fits one implementer's context with room to debug, and can be verified alone. Units run in parallel only when they don't share files, generated output, or other state.
3. **Build and verify each unit.** An implementer (`implementer/frontend` or `implementer/backend`) builds the unit, loads `verification`, and reports each of the unit's criteria as pass, fail, or not verified, with evidence. The next unit starts after the previous one is verified.
4. **Check the criteria.** For any change a user can exercise (UI, CLI, or API), an inspector loads `verification` and checks each acceptance criterion in the background while review starts.
5. **Review.** A reviewer (`reviewer/code`, with thermo-nuclear review) examines the finished change and returns findings without fixing them. Mark's request for a review is the approval.
6. **QA, if asked.** QA uses the app, with the project's verification skill if it has one, and judges whether it looks and feels right. QA findings Mark accepts become acceptance criteria.
7. **Repair.** A fresh implementer gets the findings and the files involved, fixes them, and redoes its verification. The orchestrator checks that each finding has a fix and evidence.
8. **Hand off.** New facts about verifying the repository, and any gaps, go into its verification article first. With review and repairs finished, a final inspector pass checks every acceptance criterion against the finished code and saves evidence for Mark's review. Because a PR is coming, this runs without being asked.
9. **Ship.** An operator (`operator/pr`) commits, pushes, and opens the PR. Its description, written for its reader, carries the criterion-by-criterion evidence, the review and QA findings with how each was resolved, and any verification gaps.

## What must not happen

- The orchestrator edits application code itself, even a small change.
- One implementer gets a feature too large to finish and verify in its context.
- Parallel implementers write to the same files or shared state.
- Review repairs are sent back into the original implementer's long session.
- The PR gets merged, or anything deployed, without being asked.
- Evidence captured before review repairs, or an implementer's own report, is handed to Mark as the final evidence.

## Done looks like

A reviewed change in an open PR whose description shows each acceptance criterion with evidence from the final code, plus the review and QA findings and how each was resolved.
