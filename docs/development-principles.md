# Development Principles

The following principles are preserved here as a reference alongside the active `development-principles` skill. They may be restored to global instructions later if that becomes useful.

- Keep the normal flow flat and obvious. Prefer direct use-case code initially, but refactor when real repetition, complexity, coupling, invariant ownership, or maintenance cost demonstrates that an abstraction earns its cost. Keep justified code-health improvements moving alongside feature work while avoiding speculative cleanup campaigns.
- Build the smallest useful happy path first with enough observability to identify failures. Before implementation, scan for material risks rather than cataloging every imaginable failure, estimate their likelihood and consequences, and handle them upfront only when their risk justifies the added complexity; otherwise defer them until evidence shows the need.
- When tests are warranted, prefer repeatable tests for observable behavior over mocks of internal implementation details.
- Test observable behavior at stable boundaries. Prefer a small number of deterministic domain and use-case tests plus focused real-boundary tests; avoid tests that mirror implementation details, test trivial helpers, or build large mock systems. Add regression coverage for observed failures and material safety invariants.
- When changing an area, surface nearby code-health improvements that would support long-term maintenance. Keep them bounded, distinguish them from required feature work, and implement them when the touched scope provides clear leverage; otherwise record them for later rather than expanding the change opportunistically.
- Before finishing, review the changed scope for unnecessary branches, temporary code, stale comments, unused abstractions, and avoidable complexity. Simplify what can be simplified without weakening required behavior or coverage.
