## ADDED Requirements

### Requirement: Session-scoped advisor mode
The system SHALL maintain an advisor mode of `manual`, `auto`, or `on` for each OpenCode session, SHALL default sessions without stored state to `on`, and SHALL persist explicit mode changes across plugin restarts. Persisted legacy `off` values SHALL be interpreted as `manual`.

#### Scenario: New session uses on mode
- **WHEN** a session has no persisted advisor mode
- **THEN** the system treats the session as `on`

#### Scenario: Explicit mode survives restart
- **WHEN** a user changes a session's advisor mode and the advisor plugin restarts
- **THEN** the system restores that mode for the same session

#### Scenario: Sessions remain independent
- **WHEN** a user changes the advisor mode in one session
- **THEN** the system does not change the mode of another parent or subagent session

### Requirement: Advisor mode command
The system SHALL provide `/advisor manual`, `/advisor auto`, and `/advisor on` commands that update the current session's mode, reject unsupported values without changing state, and produce a concise confirmation of the resulting mode.

#### Scenario: User changes mode
- **WHEN** the user runs `/advisor manual`, `/advisor auto`, or `/advisor on`
- **THEN** the system stores the requested mode for the current session and confirms it

#### Scenario: User supplies an invalid mode
- **WHEN** the user runs `/advisor` with an unsupported mode value
- **THEN** the system reports the accepted values and leaves the current mode unchanged

### Requirement: Manual mode behavior
The system SHALL instruct the executor not to invoke advisor automatically in `manual` mode while keeping explicit `/consult-advisor` invocations available.

#### Scenario: Manual command requests advisor
- **WHEN** the user invokes `/consult-advisor` while the session is in `manual` mode
- **THEN** the command can invoke the advisor and send a request to eligible configured targets

#### Scenario: Manual session receives ordinary work
- **WHEN** an executor continues ordinary work while the session is in `manual` mode
- **THEN** the injected policy does not direct it to invoke advisor automatically

### Requirement: On mode preserves standard guidance
The system SHALL apply the existing ported Claude Code advisor invocation guidance without semantic changes while a session is in `on` mode.

#### Scenario: Session is explicitly enabled
- **WHEN** a session enters `on` mode
- **THEN** subsequent executor turns receive the standard advisor invocation guidance

### Requirement: Auto mode activation
The system SHALL begin `auto` mode without requiring an advisor invocation and SHALL provide workload-aware guidance that permits activation when substantive work, uncertainty, consequence, repeated failure, or a change of direction justifies independent review.

#### Scenario: Routine session remains inactive
- **WHEN** an auto-mode session performs routine, deterministic, read-only, or already-approved work without material uncertainty
- **THEN** the guidance does not require an advisor call merely because work begins or ends

#### Scenario: Complexity emerges later
- **WHEN** an inactive auto-mode session develops a load-bearing decision or material risk after substantial work
- **THEN** the executor may invoke advisor after weighing review value against the pending context synchronization cost

#### Scenario: Small delta alone does not trigger review
- **WHEN** little context has accumulated since the previous advisor call but no consequential decision or uncertainty exists
- **THEN** auto guidance does not treat the inexpensive delta alone as a reason to invoke advisor

#### Scenario: Large delta does not prohibit review
- **WHEN** substantial context has accumulated and an independent review is needed for a consequential decision
- **THEN** auto guidance permits invocation despite the higher synchronization cost

### Requirement: Auto mode after activation
The system SHALL retain `auto` as the configured mode after its first advisor call, SHALL reuse the configured target continuations, and SHALL apply workload-aware follow-up guidance while the current context epoch has an active continuation.

#### Scenario: Auto session invokes advisor for the first time
- **WHEN** the executor invokes advisor in an inactive auto-mode session
- **THEN** the system creates or restores eligible advisor continuations and treats the current context epoch as activated

#### Scenario: Activated auto session continues
- **WHEN** an activated auto-mode session reaches a later checkpoint in the same context epoch
- **THEN** the system uses follow-up auto guidance and sends only the parent transcript delta required by the existing continuation behavior

#### Scenario: User switches an activated session to manual
- **WHEN** the user runs `/advisor manual` after auto activation
- **THEN** automatic advisor guidance stops without deleting historical usage records, while explicit `/consult-advisor` remains available

### Requirement: Context epoch reset
The system SHALL detect when parent compaction changes the advisor context epoch and SHALL treat the next synchronization as a reset whose cost must be reconsidered in `auto` mode.

#### Scenario: Parent session compacts
- **WHEN** a completed parent compaction supersedes the epoch associated with an advisor continuation
- **THEN** auto mode returns to cost-aware activation guidance until advisor is synchronized with the new compacted context
