# Vision

## Problem

An authorized external operational mutation can have a credible collateral-impact path that ordinary coordinator and operator preflight miss, especially in production or shared environments, while the existing `reviewer` covers completed work and `inspect` gathers current state without making independent safety judgments.

## Intended Behavior

`safety-reviewer` is a stable native OpenCode subagent that gives a quick, independent pre-mutation challenge of one concrete AWS, Datadog, or similar external operation. The base profile assigns Luna/high because this is a bounded secondary check rather than the primary safety or acceptance authority.

The caller supplies the exact proposed action, target and environment, selectors, expected affected resources, dependency and propagation paths, containment, reversibility and rollback facts, current-state evidence with locators and freshness, unresolved assumptions, and accepted authority. The agent treats that packet as evidence rather than proof and uses ordinary inspection capabilities to verify consequential claims through operations whose semantics are clearly read-only.

Investigation starts at the proposed action and follows credible selector, dependency, inheritance, propagation, shared-ownership, rollback, monitoring, and access paths. An operation that is broad or account-wide can justify broad inspection; unrelated systems remain out of scope without a credible path. Inspection continues past an initial concern when it could materially change the status or required containment, then stops when neither can change. Architecture analysis stops when blast radius and containment are established, and design concerns appear only when they create a concrete collateral-impact path.

The result uses `no material concern found`, `conditions`, `hold`, or `insufficient evidence`; gives concrete action-to-impact paths and evidence locators; labels unsupported possibilities as hypotheses; and makes material missing facts visible. It is evidence for coordinator judgment, never authorization or acceptance. `inspect` retains current-state gathering, `operator` retains mutation and ordinary immediate preflight, and the coordinator and user retain resolution, override, and acceptance authority.

## Success

Higher-risk operator dispatches receive a fresh, compact independent challenge after only material current-state evidence is gathered. Credible concerns and missing evidence pause mutation visibly, explicit overrides preserve residual risk, and trivial isolated reversible operations avoid the extra lane.

## Non-Goals

- Proving that the operation will succeed or designing the operation.
- Inventory or architecture analysis unrelated to a credible impact path, compliance review, or long-form reporting.
- Executing commands or tools that mutate files or external state.
- Replacing coordinator or operator safety reasoning, approving production change, or reviewing completed work.
