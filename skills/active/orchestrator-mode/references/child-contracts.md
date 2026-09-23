# Child contracts

## Brief the assignment

Give a fresh child what its own context does not supply. Describe outcomes and consequential constraints; prescribe mechanics when needed for correctness, repeatability, or an accepted choice. Point to owning procedures rather than repeating them, and use the [role capabilities](routing-and-roles.md#capability-aware-assignments) to keep the assignment executable. Detail should follow the task, not a word limit or mandatory template.

| Brief element | Include when applicable |
| --- | --- |
| Objective and purpose | What to accomplish and how it fits the effort |
| Authority and scope | Permitted work, targets, constraints, and explicit waivers |
| Outputs | Owned paths for useful files, or an explicit direct return |
| Context | Selected evidence, accepted design, working context, and operational learnings with status and applicability |
| Dependencies | Inputs that must finish first, shared-state restrictions, and independent-review exclusions |
| Acceptance | Required outcome and verification coverage |
| Stop conditions | Missing authority, consequential changes, or a non-narrowing investigation |

- For a resumed assignment, send the next objective, material delta, relevant readings, and changed authority or stops. Avoid replaying the original conversation.
- Attribute choices to their actual owner. Distinguish explicit user approval, coordinator decisions within delegated authority, agent recommendations, and unresolved choices; a coordinator choice is not explicit user acceptance.
- Follow [Scribe briefing](workspace-and-coordination.md#brief-scribe) for pointer briefs and explicit first-use versus incremental reads.
- Distinguish required skills from hints based on their descriptions. Require Task Evidence for assigned evidence, operational learnings, or reuse. If an evidence role cannot load required guidance, supply the necessary instructions in its brief.
- Internal helpers return to their parent without inherited shared-file obligations. Session IDs do not substitute for useful accessible evidence.
- Routine dispatch requires no additional prompting skill. Use `writing-for-agents` for actual instruction authoring and `artifact-context` for a durable artifact when reader or destination context materially changes its explanation.

## Check the return

- Require the answer or resulting state needed for the next decision, with completed paths when assigned, verification and limits, uncertainty, blockers, unresolved side effects, and exact mutation or publication state. A report's existence or list of topics is not its result; retain supporting depth in the evidence file.
- Keep raw sources and traces with the producer. Pass selected relevant notes to successors rather than chains of parent summaries. Reassess suggested procedures before converting them into assignment requirements.
- Identify consequential residual state, such as an ignored installed application copy. A clean Git tree does not establish that all runtime state is clean or authorize cleanup.
- A failed check remains unresolved until repaired or accepted as a supported exception. A passing summary must agree with its measurements and describe the meaningful extent of any failures.

## Complete-artifact handoffs

When design, research, review, or planning output contains actionable detail for an implementer, preserve the complete artifact and its actual proposal or acceptance status.

- Inline the complete artifact when usable; otherwise give an accessible unchanged file. Do not replace it with a parent summary.
- Put parent corrections in a separate overlay naming each overridden decision, its authoritative source, and replacement.
- Check that every actionable decision is present unchanged or explicitly overridden. Transfer does not approve unaccepted proposals.

## Screenshot evidence

- Save useful captures under `screenshots/` or an assigned evidence location. Associate each image with the exact revision, viewport, relevant state, and an accessible locator.
- Verify access across machines. Inspect captures for useful scale, correct content, and unobscured inspection results before returning them.
- Select overviews and details by coverage, not a fixed count. Put findings and relevant measurements in the existing owner note or direct helper return; no extra manifest is required.
- For diagrams, page-level no-overflow does not establish text containment inside a node.

## Missing evidence

- Require a bounded question, why it matters, known locators, evidence family, version or freshness needs, and the smallest useful result.
- Check materiality, scope, access, duplication, and overlap with active agents. Reuse existing evidence; parallelize independent requests and wait on dependencies.
- Check results and normally resume the same valid engagement with the combined delta. Source facts do not settle design choices or expand authority.
- At the depth limit, the dispatching coordinator owns additional gathering. The child returns the request instead of substituting unauthorized roles.

## Mutation stop contract

Include the applicable boundary in mutation briefs.

| Owner | Continue | Stop and return |
| --- | --- | --- |
| Operator | Bounded corrections within a settled procedure while evidence narrows | The procedure no longer fits, attempts repeat, uncertainty stops shrinking, or novel troubleshooting or software behavior becomes the task |
| Worker | Immediate in-unit investigation, distinct useful hypotheses, and bounded repairs | Open-ended or non-narrowing discovery, contradicted accepted assumptions, incompatible acceptance, multiple independent outcomes, or broader authority and evidence needs |

- A focused lookup alone is not a stop. Compaction alone does not invalidate a coherent active assignment.
- Repeated broad discovery or little validated progress can justify a proposed handoff. Compare remaining work with retained useful context; do not invent retry, turn, or compaction quotas. Apply [child continuity](recovery-and-continuity.md#choose-child-continuity) on the next dispatch.
- On stop, preserve partial changes and return the accepted contract, exact state, symptom or decision, distinct attempts and results, hypotheses, verification, and smallest missing evidence or authority.
- The child does not dispatch its own replacement, architect, or triage. Difficulty alone does not invalidate the design.

## Diagnosis and remediation

- Use [routing guidance](routing-and-roles.md#investigation-and-diagnosis) to choose the next owner. A new agent needs a better evidence basis or approach, not another copy of the failed assignment.
- A settled procedural correction belongs to operator. Bounded diagnosis or novel troubleshooting belongs to worker within authority. Use authorized triage when its diagnostic value warrants it.
- Require reproduction or falsification, impact, likely cause and confidence, contribution of existing changes, contradicted assumptions, remaining uncertainty, and whether repair fits the accepted contract.
- Triage diagnoses without repairing or deciding architecture. A fresh worker can remediate within existing implementation authority; a cleanly stopped worker may resume when retained context helps.
- Supply partial state, checked diagnosis, approaches not to repeat, required correction, and verification history. Return consequential design or requirement conflicts to the decision owner; ordinary implementation failures need no architect by default.
