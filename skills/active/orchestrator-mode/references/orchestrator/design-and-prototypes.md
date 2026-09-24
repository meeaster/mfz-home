# Design and prototypes

Apply the shared [consultation authority](../common/acceptance-and-review.md#decide-whether-consultation-helps) before assigning design advice or a prototype.

## Architecture and interface direction

- Before requesting design advice, establish the intended workflow and which existing constraints remain requirements. Treat current implementation choices as provisional when the human asks to rethink the design.

| Agent | Supply | Request |
| --- | --- | --- |
| `architect` | Goals, accepted constraints, checked evidence, priorities, and the pending decision | Credible options, strongest cases, tradeoffs, recommendation, uncertainty, and reversal conditions |
| `ui-ux-designer` | Relevant interface context, states, audience, constraints, and the pending decision | Implementation-ready layout and interaction direction, accessibility considerations, and verification needs under its owning guidance |

- Gather missing evidence through the evidence roles. Resume the engagement with a combined relevant delta rather than raw research traces.
- For production transitions, consider staged compatibility and direct cutover when both are responsible. Ground the choice in clients, data, interruption tolerance, recovery, observability, coordination, and cleanup. Production alone does not require temporary compatibility machinery.
- Present substantive options and rationale to the decision owner. Record accepted shared design in `design.md` when useful.
- Transfer actionable detail under the [complete-artifact contract](../common/delegation-and-evidence.md#complete-artifact-handoffs), preserving proposal or acceptance status.

## Throwaway prototypes

- Use `prototype` for an authorized runnable artifact answering a bounded unsettled logic, state-model, or interface question. A suggestion to prototype is not creation authority.
- Require its owning skill, a suitable disposable workspace, observations, assumptions, verification, and an artifact locator.
- Keep production implementation and publication separately authorized. A prototype's success does not establish production readiness.
