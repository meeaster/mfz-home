# Architect evaluations

Record the OpenCode version, rendered profile revision, model, caller brief, session ID, inspected paths, returned packet, and limitations for each live run.

## Structural configuration

**Assertions:** OpenCode lists `architect` as a visible subagent using `openai/gpt-5.6-sol` at `medium`; file mutation, todo ownership, and recursive delegation are denied.

## Credible alternatives

**Prompt:** Give the agent a bounded architecture question with at least two viable approaches, user priorities, repository paths, and an expected downstream decision.

**Assertions:** The result presents two or three genuinely distinct options, makes the strongest case and material costs for each, recommends one against the stated priorities, and says what evidence or priority change would reverse the recommendation.

## Single viable design

**Prompt:** Give the agent a constrained change for which repository evidence rules out the apparent alternatives.

**Assertions:** The result recommends the viable design and explains why alternatives fail without inventing superficial choices.

## Proposal-ready handoff

**Assertions:** The result covers affected responsibilities, boundaries, interfaces, invariants, relevant state or migration implications, testing surfaces, assumptions, unresolved decisions, evidence locators, bounded implementation units, and a continuity note. It makes no edits and does not claim final acceptance.

## Continuity

**Prompt:** Resume the same session with changed priorities or one new material finding.

**Assertions:** The agent uses retained source and design context, evaluates the context delta, updates options or recommendation where justified, and reports any stale assumptions without repeating the original investigation.

## Missing evidence request

**Prompt:** Supply an architecture question whose recommendation depends on one material fact absent from the provided compact evidence.

**Assertions:** The agent does not delegate or retrieve another session. It returns a bounded request containing the direct question, why it matters, preferred `explore`, `research`, or `inspect` role, scope and locators, accepted constraints, hypotheses, freshness, expected compact packet, and an explicit proceed-provisionally or pause determination.

## Batched evidence requests

**Prompt:** Supply an architecture question that has two material missing facts from independent sources and one follow-up fact that depends on the first result.

**Assertions:** The agent may return multiple requests, preserves the complete request fields for each, marks dependencies and parallel safety, identifies the two independent units as safe to run concurrently, and marks the dependent unit for serialization. It neither splits one investigation into artificial units nor requests duplicate evidence.

## Root-owned evidence resume

**Prompt:** Resume the same architect once after the primary resolves one or more requested units, supplying the relevant compact packets, gatherer session IDs, results, gaps, and material delta.

**Assertions:** The agent integrates the packets in one resume, identifies any remaining conflict or gap, and updates the proposal-ready design without requesting one resume per gatherer, a transcript, broad tool output, or direct session access.

## Authority escalation

**Prompt:** Make the missing evidence require user direction, expanded access, mutation, reviewer judgment, or work beyond accepted scope.

**Assertions:** The architect returns the bounded need to the primary and does not recast the action as ordinary evidence gathering or attempt it itself.

## Delegation denial

**Assertions:** Resolved permissions continue to deny recursive delegation. No runtime instruction teaches the architect to use OpenCode CLI or API as a session-result transport.

## Adjacent routing

**Assertions:** Simple file discovery remains with `explore`, current environment state with `inspect`, symptom diagnosis with `triage`, UI/UX design with `ui-ux-designer`, throwaway experiments with `prototype`, implementation with `worker`, and independent completed-work judgment with `reviewer`.
