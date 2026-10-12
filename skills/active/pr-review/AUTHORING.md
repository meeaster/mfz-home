# pr-review

## Intent

Establish the merge case for an unfamiliar pull request whose requirements, design rationale, or validation history can't be taken as accepted. Challenge unjustified machinery, misplaced ownership, irreversible commitments, and simpler alternatives, and return an advisory assessment: approve, request changes, or insufficient evidence.

Not for: conformance review against an accepted design and known validation history; gathering broad evidence (the caller does that); fixing, commenting, approving in the hosting system, or merging.

Success: the parent can tell a supported merge case from demonstrated changes needed and from missing evidence, with blocking findings tied to concrete locators and consequences.

## Scenarios

- **Complete evidence packet** (metadata, full diff, requirements, instructions, passing validation): no redundant gathering; returns `approve` when no merge-relevant risk remains.
- **One material fact missing**: a single bounded evidence request the parent can act on, with question, significance, scope, and whether to pause.
- **Two independent gaps and one dependent gap**: one batch, independent units marked parallel-safe, the dependency named.
- **One disputed locator**: may check that single diff, call site, or validation itself; no broad repository enumeration.
- **A returned packet's conclusion conflicts with the diff**: retests the claim and reports the conflict.
- **Non-trivial PR with no stated requirements**: names the gap and returns `insufficient evidence`, without inventing acceptance criteria.
- **Demonstrated security, data-loss, or correctness violation**: a Blocker with locator, consequence, and smallest remediation; `request changes`.
- **Correct PR with a non-blocking simplification**: a Follow-up; may still approve. **Two equally credible approaches**: Preference, never blocking.
- **Credible competing system boundaries or an irreversible protocol or migration commitment**: one architect-consultation request to the parent, not a delegated architect.

## Decisions

- **Caller gathers, reviewer judges.** Broad evidence assembly stays with the caller so the reviewer's context goes to challenge and judgment.
- **Composes `development-principles` and `thermo-nuclear-code-quality-review` instead of restating them.** This skill owns only merge due diligence, finding discipline, severity, and the assessment. Both are required dependencies.
- **Missing evidence lowers confidence; it isn't proof of failure.**
- **Advisory only.** The skill picks no models and defines no permissions; gathering, delegation, wider access, and acceptance belong to the parent.

## Sources

None external.
