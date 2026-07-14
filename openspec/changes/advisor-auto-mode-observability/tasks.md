## 1. Shared State And Transcript Planning

- [x] 1.1 Extract advisor context selection, continuation delta selection, advisor-result filtering, and transcript serialization into a shared pure module without changing existing submissions.
- [x] 1.2 Add a deterministic approximate-token estimator and transcript-plan result containing epoch, cursor boundary, serialized input, and estimated pending tokens.
- [x] 1.3 Add focused tests for first-call plans, continued deltas, advisor-result exclusion, compaction rotation, missing cursors, and token-estimate labeling inputs.
- [x] 1.4 Introduce versioned session-mode and observable continuation state under the existing advisor state root with atomic persistence, validation, expiry, and tests for malformed or stale records.

## 2. Session Policy Controls

- [x] 2.1 Add `manual`, `auto`, and `on` mode resolution with `on` as the default and target-specific current-epoch activation derived from continuation state.
- [x] 2.2 Refactor the ported Claude Code invocation guidance into one canonical active policy, add workload-aware cold/reset and follow-up auto guidance plus manual guidance, and make the static tool description mode-neutral.
- [x] 2.3 Add mode-aware system-prompt selection tests proving on retains canonical guidance while cold and reviewed auto sessions receive workload-aware guidance and manual does not receive contradictory mandatory instructions.
- [x] 2.4 Add the `/advisor` command, its `command.execute.before` validation and persistence behavior, concise confirmation prompts, and command-hook tests.
- [x] 2.5 Bundle `/advisor` and `/consult-advisor` through the advisor plugin config hook, remove the unsupported advisor skill registration and source, and verify synchronized skill copies are absent.
- [x] 2.6 Define manual mode as the explicit-command path, suppress automatic review guidance, and migrate persisted legacy `off` records to manual.
- [ ] 2.7 Integrate successful auto activation and compaction reset behavior with native and Claude Code continuation paths, including multi-target partial-success tests.

## 3. Advisor Observability

- [x] 3.1 Extend server tool metadata and durable observable state with mode, context epoch, synchronized cursor, target identity, transcript estimate, and actual usage while preserving existing metadata compatibility.
- [x] 3.2 Extend TUI metric models and loaders to read session policy and per-target synchronization state, calculate pending estimates through the shared transcript planner, and coalesce reactive refreshes.
- [x] 3.3 Render the advisor panel before the first call with mode and cold estimate, then show compact synchronized, pending, and reset rows plus cumulative per-target actual usage.
- [x] 3.4 Preserve recursive descendant historical accounting and ensure descendant continuations do not determine the parent session's synchronization state.
- [ ] 3.5 Add TUI unit and rendering tests for manual, cold auto, activated auto, on, pending deltas, compaction reset, cache misses, multiple targets, and zero-call sessions.

## 4. Verification And Experiment Baseline

- [x] 4.1 Run the focused advisor server and TUI tests, `pnpm test`, and `pnpm typecheck`, resolving all failures.
- [x] 4.2 Run `mfz apply --target all --agent all` and verify the rendered command, plugin, profile configuration, and absence of the advisor skill come from home source files.
- [ ] 4.3 Start a fresh `opencode run --format json` probe and verify manual command handling, auto-mode tool availability, successful advisor activation, persisted continuation reuse, and emitted usage metadata.
- [ ] 4.4 Run the wide-PTY advisor TUI probe with debug logging and verify zero-call mode/state display, pending-estimate updates, post-call actual metrics, and context-reset presentation.
- [ ] 4.5 Record a baseline comparison using representative routine, initially complex, and late-emerging-complexity sessions, capturing call timing, estimated pending input, actual uncached/cache usage, total cost, and whether advice changed the next action.

## Verification Notes

- The implementation and runtime probe cover routine, cold auto, command transitions, explicit auto activation, durable continuation state, pending deltas, and historical actual usage.
- Remaining work includes manual-mode runtime and continuation-reuse proof, multi-target partial-success activation tests, a full TUI rendering matrix including a live compaction reset, and a controlled initially-complex advice-impact comparison.
