## ADDED Requirements

### Requirement: Advisor synchronization state
The system SHALL expose the configured mode and a synchronization state that distinguishes no current-epoch continuation, synchronized context, pending parent context, and a context-epoch reset. Synchronization state SHALL be tracked independently for each configured advisor target when their continuations differ.

#### Scenario: Advisor has never been called
- **WHEN** the current context epoch has no advisor continuation
- **THEN** the observable state identifies the target as cold

#### Scenario: Advisor is current
- **WHEN** the target continuation cursor is the latest eligible parent message
- **THEN** the observable state identifies the target as synchronized

#### Scenario: Parent context advances
- **WHEN** eligible parent messages exist after the target continuation cursor
- **THEN** the observable state identifies the target as pending

#### Scenario: Context epoch changes
- **WHEN** parent compaction supersedes the continuation epoch
- **THEN** the observable state identifies the target as reset until the new epoch is synchronized

### Requirement: Pending input estimate
The system SHALL estimate the new advisor input since each target's last synchronized parent cursor using the same context selection, delta selection, advisor-result filtering, and transcript serialization rules used for a real advisor invocation. The system SHALL identify this value as an estimate rather than an exact provider token count.

#### Scenario: First call estimate
- **WHEN** no continuation exists for the current context epoch
- **THEN** the estimate covers the selected compacted parent context that a first advisor call would submit

#### Scenario: Continuation estimate
- **WHEN** a continuation exists in the current context epoch
- **THEN** the estimate covers only eligible parent transcript content after the stored cursor

#### Scenario: Advisor results are excluded
- **WHEN** completed or failed advisor tool results occur after the stored cursor
- **THEN** the estimate excludes those results in the same way as continuation submission

### Requirement: Actual invocation accounting
The system SHALL retain actual uncached input, cache-read, cache-write, output, reasoning, total-token, model, target, and cost metadata when each value is available from the advisor harness or pricing catalog.

#### Scenario: Advisor call completes with usage
- **WHEN** an advisor target reports token usage
- **THEN** the completed tool metadata records that target's available usage dimensions for historical aggregation

#### Scenario: Multiple targets complete differently
- **WHEN** an advisor invocation includes multiple targets
- **THEN** usage and continuation state remain attributable to each target rather than being merged into an indistinguishable total

### Requirement: TUI state before first invocation
The advisor TUI SHALL render for an enabled plugin even when the current session has no completed advisor calls and SHALL show the configured mode, synchronization state, and estimated pending input.

#### Scenario: Auto session has no advisor history
- **WHEN** the sidebar is visible for a new auto-mode session
- **THEN** the advisor panel shows auto mode, cold state, and the estimated input a first synchronization would submit

#### Scenario: Advisor is manual
- **WHEN** the sidebar is visible for a manual-mode session
- **THEN** the panel shows manual mode and the pending estimate without implying that content will be sent automatically

### Requirement: TUI historical and current metrics
The advisor TUI SHALL show per-target call counts and cumulative actual usage and cost, the latest call's uncached and cached usage, and the estimated new input pending since that target's latest synchronized cursor.

#### Scenario: Continuation has new context
- **WHEN** parent context advances after a completed advisor call
- **THEN** the panel updates the pending estimate while retaining the latest actual call metrics

#### Scenario: Session contains descendant advisor calls
- **WHEN** advisor calls occurred in descendant sessions discoverable by the existing TUI history traversal
- **THEN** historical totals continue to include and deduplicate those calls without attributing their synchronization state to the parent target

### Requirement: Observable estimates remain non-authoritative
The system SHALL NOT represent continuation existence or a pending-input estimate as proof that a provider cache will hit, and SHALL update displayed actual cache behavior only from completed invocation usage.

#### Scenario: Continuation exists before provider response
- **WHEN** a target has a resumable continuation but no new invocation has completed
- **THEN** the TUI describes continuation or synchronization state without claiming a current cache hit rate

#### Scenario: Invocation reports no cache read
- **WHEN** a continued or reset invocation reports zero cache-read tokens
- **THEN** the TUI displays the actual zero cache read rather than inferring a hit from continuation state

### Requirement: Experimentation evidence
The system SHALL provide repeatable tests and runtime evidence for mode transitions, manual command invocation, context-delta estimates, compaction resets, TUI rendering, and fresh rendered-plugin loading.

#### Scenario: Implementation is verified
- **WHEN** the change is prepared for completion
- **THEN** focused tests, full plugin tests, type checking, `mfz apply`, and a fresh OpenCode runtime probe demonstrate the configured command, server plugin, and TUI state operate from rendered configuration
