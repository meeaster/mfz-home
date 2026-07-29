## ADDED Requirements

### Requirement: Session-scoped advisor mode
The system SHALL maintain an advisor mode of `manual`, `auto`, or `on` for each OpenCode session, SHALL persist explicit mode changes across plugin restarts, and SHALL use the effective mode of the nearest ancestor session for subagent sessions. Sessions without an explicit mode in their ancestor chain SHALL use the global advisor default. Persisted legacy `off` values SHALL be interpreted as `manual`.

#### Scenario: New session uses on mode
- **WHEN** a session has no persisted advisor mode, no UI-selected global default exists, and `OPENCODE_ADVISOR_MODE` is unset
- **THEN** the system treats the session as `on`

#### Scenario: Explicit mode survives restart
- **WHEN** a user changes a session's advisor mode and the advisor plugin restarts
- **THEN** the system restores that mode for the same session

#### Scenario: Subagents inherit parent mode
- **WHEN** a user changes the advisor mode in a parent session
- **THEN** subagent sessions use that effective mode for subsequent turns

### Requirement: Global advisor default
The system SHALL persist a machine-wide global advisor default of `manual`, `auto`, or `on` in advisor-owned runtime settings, SHALL apply it to sessions without an explicit mode, and SHALL resolve an absent UI-selected default from `OPENCODE_ADVISOR_MODE` and then `on`. The system SHALL NOT modify rendered OpenCode or Mindframe-Z profile configuration when the global default changes.

#### Scenario: User-selected default survives restart
- **WHEN** the user selects a global advisor default and restarts OpenCode
- **THEN** sessions without an explicit mode use the selected default

#### Scenario: Environment supplies the fallback default
- **WHEN** no UI-selected global default exists and `OPENCODE_ADVISOR_MODE` contains a valid mode
- **THEN** sessions without an explicit mode use the environment-selected mode

#### Scenario: Global default changes an inherited session
- **WHEN** the global default changes while a session has no explicit mode
- **THEN** the session's effective mode changes to the new default for subsequent turns

#### Scenario: Global default preserves an override
- **WHEN** the global default changes while a session has an explicit mode
- **THEN** the session retains its explicit mode

### Requirement: TUI advisor mode picker
The system SHALL provide a keyboard-opened advisor mode picker for the active session, SHALL expose the same action in the command palette, and SHALL independently mark the current effective session mode and global default. The initial key binding SHALL be `<leader>v`.

#### Scenario: User opens the picker
- **WHEN** the user invokes `<leader>v` or selects `Advisor: Change mode` from the command palette
- **THEN** the TUI opens a picker containing `manual`, `auto`, and `on` and highlights the current effective session mode

#### Scenario: User changes the current session
- **WHEN** the user highlights a mode and presses Enter
- **THEN** the system persists that mode as the current session override, closes the picker, updates the visible current marker, and applies the mode to subsequent turns

#### Scenario: User changes the global default
- **WHEN** the user highlights a mode and presses `D`
- **THEN** the system persists that mode as the global default, keeps the picker open, and updates the visible default marker

#### Scenario: User sets both values
- **WHEN** the user presses `D` and then Enter for the same highlighted mode
- **THEN** the system sets both the global default and current session override to that mode and shows both markers on the same option

#### Scenario: User closes without selecting
- **WHEN** the user presses Escape without applying a highlighted mode to either scope
- **THEN** the system closes the picker without changing session or default state

#### Scenario: Response is already running
- **WHEN** the user changes a mode after an executor response has received its system policy
- **THEN** the change applies to subsequent policy construction and does not cancel an advisor invocation already in progress

### Requirement: Manual mode behavior
The system SHALL instruct the executor not to invoke advisor automatically in `manual` mode, SHALL reject unsolicited tool calls, and SHALL allow a one-shot tool call opened by explicit `/consult-advisor` or a clear natural-language request to consult the advisor.

#### Scenario: Manual command requests advisor
- **WHEN** the user invokes `/consult-advisor` while the session is in `manual` mode
- **THEN** the command permits one advisor call to eligible configured targets

#### Scenario: Manual natural-language request asks advisor
- **WHEN** the user clearly asks to consult, ask, use, or call the advisor in a manual-mode message
- **THEN** that message permits one advisor call to eligible configured targets

#### Scenario: Manual incidental mention does not ask advisor
- **WHEN** the user negates or merely explains how to use the advisor in a manual-mode message
- **THEN** the plugin does not authorize an advisor call

#### Scenario: Manual model call ignores policy
- **WHEN** the model invokes the advisor tool in `manual` mode without an active explicit user request
- **THEN** the plugin rejects the call without contacting any configured target

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
- **WHEN** the user selects `manual` in the TUI after auto activation
- **THEN** automatic advisor guidance stops without deleting historical usage records, while explicit `/consult-advisor` remains available

### Requirement: Context epoch reset
The system SHALL detect when parent compaction changes the advisor context epoch and SHALL treat the next synchronization as a reset whose cost must be reconsidered in `auto` mode.

#### Scenario: Parent session compacts
- **WHEN** a completed parent compaction supersedes the epoch associated with an advisor continuation
- **THEN** auto mode returns to cost-aware activation guidance until advisor is synchronized with the new compacted context

### Requirement: Fenced continuation persistence
The system SHALL prevent a completion or cleanup from an older advisor request from replacing or removing a newer continuation record for the same parent session and target, including across independent plugin processes.

#### Scenario: Older completion follows compaction
- **WHEN** an advisor request from an older context epoch completes after a newer post-compaction request has persisted its continuation
- **THEN** the older completion does not replace the newer record, and its newly created child is cleaned up without deleting the newer continuation

#### Scenario: Older failure follows compaction
- **WHEN** an older advisor request fails after a newer post-compaction request has persisted its continuation
- **THEN** error cleanup leaves the newer continuation record intact
