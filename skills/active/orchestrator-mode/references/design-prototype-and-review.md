# Design, prototype, and review

## Decide whether consultation helps

- During exploratory discussion, recommend expensive design advice or review and wait for authorization. State the decision it would inform and why the role adds value.
- Within an authorized delivery outcome, use necessary consultation or review when it materially improves the result. Do not make either a universal stage or require the human to name every agent.
- Keep operational detail with the orchestrator. Return consequential design choices unless selection of a conforming result was delegated. Consultation does not authorize its own implementation or approve its own recommendations.
- A bounded engagement covers corrections and evidence follow-up within the same decision and authority. Ask before a materially different consultation, expanded access, or unrequested independent opinion.

## Architecture and interface direction

- Before requesting design advice, establish the intended workflow and which existing constraints remain requirements. Treat current implementation choices as provisional when the human asks to rethink the design.

| Agent | Supply | Request |
| --- | --- | --- |
| `architect` | Goals, accepted constraints, checked evidence, priorities, and the pending decision | Credible options, strongest cases, tradeoffs, recommendation, uncertainty, and reversal conditions |
| `ui-ux-designer` | Relevant interface context, states, audience, constraints, and the pending decision | Implementation-ready layout and interaction direction, accessibility considerations, and verification needs under its owning guidance |

- Gather missing evidence through the evidence roles. Resume the engagement with a combined relevant delta rather than raw research traces.
- For production transitions, consider staged compatibility and direct cutover when both are responsible. Ground the choice in clients, data, interruption tolerance, recovery, observability, coordination, and cleanup. Production alone does not require temporary compatibility machinery.
- Present substantive options and rationale to the decision owner. Record accepted shared design in `design.md` when useful.
- Transfer actionable detail under the [complete-artifact contract](child-contracts.md#complete-artifact-handoffs), preserving proposal or acceptance status.

## Throwaway prototypes

- Use `prototype` for an authorized runnable artifact answering a bounded unsettled logic, state-model, or interface question. A suggestion to prototype is not creation authority.
- Require its owning skill, a suitable disposable workspace, observations, assumptions, verification, and an artifact locator.
- Keep production implementation and publication separately authorized. A prototype's success does not establish production readiness.

## Independent review

Choose review separately from routine factual verification. Small straightforward work can rely on adequate worker checks. Deeper correctness, maintainability, or unfamiliar merge risk may warrant review under the root authority policy.

| Agent | Use when | Required guidance |
| --- | --- | --- |
| `reviewer` | Intent, design, changes, and validation history are known | `thermo-nuclear-code-quality-review` for code |
| `pr-reviewer` | PR intent, approach, validation, or holistic merge readiness needs reconstruction | `pr-review` |

- Supply accepted constraints, review scope, evidence, known gaps, and stop conditions. Require concrete problems and supported alternatives rather than manufactured findings.
- Reviewers propose findings without repair or acceptance. Architectural or scope changes remain decisions for the authorized owner.
- Route missing facts through evidence gatherers, then resume the unconcluded review with the relevant results. The reviewer checks conclusions against the actual diff and constraints.
- Assign repairs to another owner within implementation authority. A review normally concludes after accepted findings are repaired and supported by adequate verification. The coordinator connects each material finding to its correction and evidence before accepting it; a completion claim alone is insufficient.
- Commission a focused post-repair check when a specific correctness question remains. Name the unresolved question, relevant changes, and verification gap. A failed earlier repair, disputed remedy, or changed behavior beyond the original review coverage can justify this check; a code change alone does not.
- The original reviewer may check the repair and related regressions. Use a fresh reviewer when a fresh independent judgment is needed. Distinguish coordinator acceptance, focused verification by the original reviewer, and fresh independent review in the return. Repeat review only for a material unresolved concern, not as an automatic cycle until no findings remain.
- A PR creation request does not make holistic review mandatory. Generated configuration can use its owning verification unless there is a material reason for deeper review.
