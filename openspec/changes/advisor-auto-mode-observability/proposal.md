## Why

The advisor plugin's ported Claude Code guidance produces valuable reviews, but it can also invoke the advisor for routine checkpoints where the additional model cost is not justified. Because the advisor reuses a continuation, the relevant cost changes over time: the first call or a context reset can load substantial uncached input, while later calls combine cached context with only the parent-session delta.

## What Changes

- Add session-scoped advisor modes controlled through `/advisor manual|auto|on`.
- Preserve the existing ported invocation guidance for explicitly enabled advisor sessions.
- Make `auto` workload-aware: it may remain inactive, activate when emerging complexity or risk justifies synchronizing context, and use a narrower follow-up policy when a continuation already exists.
- Persist enough session state for mode and continuation status to survive plugin restarts.
- Estimate the advisor transcript delta since the previous synchronized parent message using the same context-selection rules as an actual invocation.
- Extend the advisor TUI to show mode, synchronization state, estimated pending input, context resets, and actual per-call and cumulative usage and cost.
- Add evaluation coverage and runtime probes so the auto policy can be tuned from observed invocation quality and token behavior.

## Capabilities

### New Capabilities
- `advisor-session-policy`: Session-scoped advisor modes, auto activation semantics, persistence, and enforcement.
- `advisor-sync-observability`: Cost-oriented synchronization estimates, actual usage accounting, and TUI state presentation.

### Modified Capabilities

None.

## Impact

- Advisor server plugin state, invocation guidance, transcript selection, continuation handling, and tool metadata.
- Advisor TUI metrics, rendering, and state refresh behavior.
- OpenCode command registration and the base profile that enables commands.
- Advisor unit tests, TUI tests, and fresh rendered-plugin runtime verification.
- Applied OpenCode configuration after `mfz apply`; no external API or persisted user-data schema is changed.
