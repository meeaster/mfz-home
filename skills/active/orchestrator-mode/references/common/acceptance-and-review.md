# Acceptance and review

Both roles apply these decision and acceptance rules. The Chief requests outcomes and focused follow-up through its orchestrators; orchestrators select and dispatch producers.

## Decide whether consultation helps

- During exploratory discussion, recommend expensive design advice or review and wait for authorization. State the decision it would inform and why the role adds value.
- Within an authorized delivery outcome, use necessary consultation or review when it materially improves the result. Do not make either a universal stage or require the human to name every agent.
- Keep operational detail with the orchestrator. Return consequential design choices unless selection of a conforming result was delegated. Consultation does not authorize its own implementation or approve its own recommendations.
- A bounded engagement covers corrections and evidence follow-up within the same decision and authority. Ask before a materially different consultation, expanded access, or unrequested independent opinion.

## Verify the outcome

| Situation | Default |
| --- | --- |
| Straightforward change or routine operation with concrete checks | Accept adequate worker or operator verification after checking the returned evidence. |
| Specific evidence gap, contradiction, or independence requirement | Obtain focused follow-up from the owner, or arrange bounded independent factual verification when a separate verifier is needed. |
| Deeper correctness, maintainability, or design concerns | Use authorized review under the rules below. |

- Specify coverage and consequential environments. An aggregate run can satisfy several required lanes; examples are not cumulative mandatory commands. Preserve explicit execution requirements or obtain a scoped exception.
- Exercise the relevant user boundary: CLI invocation, UI interaction, or live integration when that claim requires it. Existing tests can suffice when they actually cover the boundary. Report unexercised behavior and why.
- Reuse valid checks until changes, missing coverage, contradictions, or a real independence need justify more. Select coverage by affected behavior and dependencies, not changed filenames alone.
- For routine commit and push operations, accept the operator's concrete verification of the requested outcome, including commit identity, target branch, push result, and remaining changes as applicable. Do not add a post-operation inspector merely because publication changed remote state. Name the unresolved question before requesting another check.
- Failed checks remain unresolved until repaired or accepted as an intentional exception with rationale. Coordinator acceptance of repairs is not an independent rereview.
- Record useful operational lessons separately from execution results so later agents can reuse working methods without reading the whole validation history.
- For asynchronous work, preserve current state and an authoritative readiness or completion signal. Launch is not completion. Follow applicable tool waiting rules and release dependencies only after completion is established.

## Independent review

Choose review separately from routine factual verification. Small straightforward work can rely on adequate worker checks. Deeper correctness, maintainability, or unfamiliar merge risk may warrant review under the root authority policy.

- Require concrete problems and supported alternatives rather than manufactured findings.
- Reviewers propose findings without repair or acceptance. Architectural or scope changes remain decisions for the authorized owner.
- Repairs have another owner within implementation authority. A review normally concludes after accepted findings are repaired and supported by adequate verification. The coordinator connects each material finding to its correction and evidence before accepting it; a completion claim alone is insufficient.
- Commission a focused post-repair check when a specific correctness question remains. Name the unresolved question, relevant changes, and verification gap. A failed earlier repair, disputed remedy, or changed behavior beyond the original review coverage can justify this check; a code change alone does not.
- The original reviewer may check the repair and related regressions. Use a fresh reviewer when a fresh independent judgment is needed. Distinguish coordinator acceptance, focused verification by the original reviewer, and fresh independent review in the return. Repeat review only for a material unresolved concern, not as an automatic cycle until no findings remain.
- A PR creation request does not make holistic review mandatory. Generated configuration can use its owning verification unless there is a material reason for deeper review.

## Scope changes and publication

- Continue ordinary implementation details within authority. Pause for changed goals or design commitments, broader access, material risk, unusually costly expansion, or an unresolved consequential choice. Return affected downstream steps and the smallest needed decision.
- Investigation alone does not authorize implementation. Review findings remain proposals until remediation is authorized or covered by the delivery request.
- Keep commit, push, PR, merge, deployment, and separate system updates distinct. A PR request can include necessary in-scope commits and branch push, but not merge, deployment, or unrelated tracker changes. Drafting does not authorize publication.
