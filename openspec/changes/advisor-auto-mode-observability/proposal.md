## Why

The advisor plugin's ported Claude Code guidance produces valuable reviews, but it can also invoke the advisor for routine checkpoints where the additional model cost is not justified. Because the advisor reuses a continuation, the relevant cost changes over time: the first call or a context reset can load substantial uncached input, while later calls combine cached context with only the parent-session delta. Session modes are easier to use when the TUI exposes the current and default choices directly instead of requiring a model-turn slash command for every change.

## What Changes

- Add session-scoped advisor modes controlled through the TUI mode picker.
- Add a keyboard-opened TUI mode picker that marks the current session mode and global default, sets the highlighted mode for the session with Enter, and sets the highlighted global default with `D`.
- Persist the global default as advisor-owned runtime settings for sessions without an explicit mode, falling back to `OPENCODE_ADVISOR_MODE` and then `on` without modifying rendered profile configuration.
- Preserve the existing ported invocation guidance for explicitly enabled advisor sessions.
- Make `auto` workload-aware: it may remain inactive, activate when emerging complexity or risk justifies synchronizing context, and use a narrower follow-up policy when a continuation already exists.
- Persist enough session state for mode and continuation status to survive plugin restarts.
- Estimate the advisor transcript delta since the previous synchronized parent message using the same context-selection rules as an actual invocation.
- Extend the advisor TUI to show mode, synchronization state, estimated pending input, context resets, and actual per-call and cumulative usage and cost.
- Add evaluation coverage and runtime probes so the auto policy can be tuned from observed invocation quality and token behavior.

## Capabilities

### New Capabilities
- `advisor-session-policy`: Session-scoped advisor modes, global default selection, TUI controls, auto activation semantics, persistence, and enforcement.
- `advisor-sync-observability`: Cost-oriented synchronization estimates, actual usage accounting, and TUI state presentation.

### Modified Capabilities

None.

## Impact

- Advisor server plugin state and settings, invocation guidance, transcript selection, continuation handling, and tool metadata.
- Advisor TUI metrics, rendering, and state refresh behavior.
- OpenCode explicit advisor command registration and the base profile that enables commands.
- Advisor unit tests, TUI tests, and fresh rendered-plugin runtime verification.
- Applied OpenCode configuration after `mfz apply`; no external API changes, and one versioned advisor-owned runtime settings record is added.
