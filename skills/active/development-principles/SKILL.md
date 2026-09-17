---
name: development-principles
description: Shared engineering judgment for software design, implementation, test strategy, refactoring, review, and coordination decisions. Use when choosing or assessing an engineering approach, not for routine dispatch, factual gathering, or settled operations.
---

# Development principles

Apply these engineering preferences within accepted requirements and repository conventions. They guide software judgment; the owning workflow supplies task steps, validation commands, and completion requirements. Coordination needs them when deciding design, scope, or acceptance. Factual gathering and settled operations do not require them merely because software is involved.

## Clear use cases

Make the normal user flow easy to follow. Use intention-revealing names, flat control flow, and early rejection of invalid conditions. Keep meaningful workflow steps visually distinct; fewer physical lines do not establish simplicity. Necessary failure handling should remain understandable without obscuring the use case.

Prefer a direct implementation until a boundary reduces the concepts a reader must hold. A small use case may be a transaction script; a complex one may coordinate deep modules. Neither requires a fixed controller, service, and repository chain.

## Boundaries that earn their cost

Judge an abstraction by the complexity it hides relative to the interfaces, dependencies, navigation, and concepts it introduces. A boundary can earn its place by owning an invariant, isolating integration mechanics, supporting real implementations, or centralizing stable behavior. A single implementation can justify a deep boundary; multiple implementations must preserve differences that affect correctness.

Share behavior that has the same meaning and should change together. Similar syntax with different reasons to change can remain separate. A shared consistency requirement can justify extraction without waiting for another copy.

Choose file boundaries by cohesive responsibility, independent callers or tests, and reasons to change. Tests importing pure domain behavior through an executable are evidence for a separate domain boundary. When structure is material to a design, make the split or no-split decision explicit and weigh its costs. Line counts alone justify neither fragmentation nor keeping unrelated concerns together.

## Trusted values and owned state

Parse external data into representations that preserve established facts. Internal code should receive trusted values; contextual facts such as authorization or current availability still need checks where they matter. Domain types should protect meaningful distinctions and invariants, not wrap every local primitive.

Model the valid combinations permitted by actual requirements, including concurrent or retained states. Avoid independent flags and optional fields that permit contradictions, but do not force legitimate combinations into an overly restrictive sum type. Keep transitions and invariants with a coherent owner.

Separate domain decisions from infrastructure where that improves clarity and testing. Functional core / imperative shell and Tell, Don't Ask are useful guides, not reasons to hide queries, transactions, or cross-owner coordination.

## Proportionate complexity

YAGNI excludes speculative capabilities, not foreseeable failures of current requirements. Observations, documented contracts, and credible high-consequence risks can justify handling before an incident. Distinguish necessary error behavior from optional retries, fallbacks, concurrency controls, and recovery machinery. Explain the concrete need and cost before adding such mechanisms; use the smallest response that meets the requirement.

Compatibility protects real consumers and release promises. Accept supplied facts about callers and deployment; update controlled callers together rather than preserve nonexistent consumers. Public contracts may require adapters or migration paths.

## Accepted scope

Structural opportunities do not automatically authorize restructuring. Honor accepted boundaries and distinguish a new maintenance proposal from implementation drift. A narrow change can remain narrow despite evidence for larger improvements; a design or authorized refactor should consider those improvements on their merits.

## Behavioral evidence

Judge verification by the behavior and environments it establishes. Prefer stable behavioral boundaries over implementation-shaped tests. Put combinatorial domain variation in fast tests and use representative integration checks for wiring, persistence, protocols, and user-facing behavior. Prefer controllable time and observable completion signals over sleeps, polling, or fixed counts of asynchronous turns when testing concurrent behavior.

Durable regression coverage is valuable for reproducible defects. A test should protect meaningful behavior or a contract; weigh its defect-detection value against setup, runtime, and maintenance cost. Repeating behavior through a slower layer should establish additional coverage. Existing aggregate results can establish their constituent coverage. Additional checks should address a named gap, contradictory evidence, or a relevant change, rather than repeat execution by default. State what remains unverified without treating missing evidence as proof of correctness or failure.
