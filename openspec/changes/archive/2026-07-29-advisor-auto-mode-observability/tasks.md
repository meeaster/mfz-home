## 1. Shared State And Transcript Planning

- [x] 1.1 Extract advisor context selection, continuation delta selection, advisor-result filtering, and transcript serialization into a shared pure module without changing existing submissions.
- [x] 1.2 Add a deterministic approximate-token estimator and transcript-plan result containing epoch, cursor boundary, serialized input, and estimated pending tokens.
- [x] 1.3 Add focused tests for first-call plans, continued deltas, advisor-result exclusion, compaction rotation, missing cursors, and token-estimate labeling inputs.
- [x] 1.4 Introduce versioned session-mode and observable continuation state under the existing advisor state root with atomic persistence, validation, expiry, and tests for malformed or stale records.
- [x] 1.5 Add non-expiring advisor-owned global settings with atomic persistence and tests for `session override -> UI default -> environment -> on` resolution without modifying rendered configuration.

## 2. Session Policy Controls

- [x] 2.1 Add `manual`, `auto`, and `on` mode resolution with `on` as the default and target-specific current-epoch activation derived from continuation state.
- [x] 2.2 Refactor the ported Claude Code invocation guidance into one canonical active policy, add workload-aware cold/reset and follow-up auto guidance plus manual guidance, and make the static tool description mode-neutral.
- [x] 2.3 Add mode-aware system-prompt selection tests proving on retains canonical guidance while cold and reviewed auto sessions receive workload-aware guidance and manual does not receive contradictory mandatory instructions.
- [x] 2.4 Keep `/consult-advisor` as the explicit command, remove the mode slash command, and add command-hook tests for its one-shot manual-mode allowance.
- [x] 2.5 Bundle only `/consult-advisor` through the advisor plugin config hook, remove the unsupported advisor skill registration and source, and verify synchronized skill copies are absent.
- [x] 2.6 Define manual mode as policy-discouraged with a tool-boundary rejection for unsolicited calls, permit explicit `/consult-advisor` and clear natural-language consultation requests, and migrate persisted legacy `off` records to manual.
- [x] 2.7 Integrate successful auto activation and compaction reset behavior with native and Claude Code continuation paths, use one cross-process transaction coordinator through remote mutation and cleanup, fence rotated losers, distinguish persistence outcomes, and cover multi-target partial-success tests.
- [x] 2.8 Use effective-mode resolution consistently for server policy injection, advisor metadata, explicit-command allowance, and sessions that inherit a changed global default.

## 3. Advisor Observability

- [x] 3.1 Extend server tool metadata and durable observable state with mode, context epoch, synchronized cursor, target identity, transcript estimate, and actual usage while preserving existing metadata compatibility.
- [x] 3.2 Extend TUI metric models and loaders to read session policy and per-target synchronization state, calculate pending estimates through the shared transcript planner, and coalesce reactive refreshes.
- [x] 3.3 Render the advisor panel before the first call with effective mode/default scope and cold estimate, then show compact synchronized, pending, and reset rows plus cumulative per-target counts, usage, cost, and latest-call cache details.
- [x] 3.4 Preserve recursive descendant historical accounting and ensure descendant continuations do not determine the parent session's synchronization state.
- [x] 3.5 Register the `<leader>v` and command-palette mode picker, mark current and default modes, persist Enter and `D` actions with immediate feedback, and keep the picker open after default changes.
- [x] 3.6 Add TUI unit and view-model tests for picker interaction, current/default markers, inherited and overridden modes, manual, cold auto, activated auto, on, pending deltas, compaction reset, cache misses, multiple targets, and zero-call sessions; cover live component rendering in 4.4.

## 4. Verification And Experiment Baseline

- [x] 4.1 Run the focused advisor server and TUI tests, `pnpm test`, and `pnpm typecheck`, resolving all failures.
- [x] 4.2 Run `mfz apply --target all --agent all` and verify the rendered command, plugin, profile configuration, and absence of the advisor skill come from home source files.
- [x] 4.3 Start a fresh `opencode run --format json` probe and verify manual-mode rejection for unsolicited calls, explicit advisor-command allowance, auto-mode tool availability, successful advisor activation, persisted continuation reuse, and emitted usage metadata.
- [x] 4.4 Run the wide-PTY advisor TUI probe with debug logging and verify the keybinding and palette picker, session/default persistence across restart, next-turn policy behavior, zero-call mode/state display, pending-estimate updates, post-call actual metrics, and context-reset presentation.
- [x] 4.5 Record a baseline comparison using representative routine, initially complex, and late-emerging-complexity sessions, capturing call timing, estimated pending input, actual uncached/cache usage, total cost, and whether advice changed the next action.

## Verification Notes

- The implementation and runtime probes cover global-default persistence, effective-mode resolution, routine and cold sessions, command transitions, the keyboard and command-palette picker, explicit auto activation, durable continuation reuse, pending deltas, context-reset presentation, and historical actual usage.
- The controlled comparison records one initially complex advisor call and two auto-mode no-call turns; it is observational evidence, not a causal quality judgment.
