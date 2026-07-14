## Context

The advisor server forwards a selected parent transcript to one or more stronger-model targets and persists a continuation cursor per parent session and target. The first call in an epoch submits the selected compacted transcript; later calls submit only messages after the stored cursor while the advisor child retains prior context. Actual usage shows why both review value and synchronization cost matter: a small delta can still reread a large cached prefix, while a later call can add a large uncached delta. Parent compaction rotates the continuation and creates a new cost boundary.

Invocation guidance was duplicated in the static advisor tool description and the previously installed advisor skill. Both copies strongly prescribed calls before substantive work and completion, so manual mode needs explicit policy guidance rather than a prompt-only switch. The TUI currently derives historical metrics from completed advisor tool metadata and remains hidden until at least one call exists.

## Goals / Non-Goals

**Goals:**

- Give users durable, session-scoped `manual`, `auto`, and `on` controls plus a durable global default.
- Preserve the current ported Claude Code invocation behavior as the standard active policy, while accurately describing the available transcript.
- Let auto mode activate at any point based on semantic review value and estimated synchronization cost.
- Make mode, continuation synchronization, pending transcript size, actual cache behavior, and cost visible before and after calls.
- Reuse one transcript-selection implementation for invocation and estimation.
- Collect enough evidence to tune auto guidance without prematurely hard-coding token thresholds.

**Non-Goals:**

- Automatically invoke advisor from plugin code without an executor tool call.
- Guarantee provider cache retention or predict an exact cache hit before a response.
- Summarize or truncate arbitrary transcript content to reduce cost; GPT-5.6 executor reasoning summaries are intentionally omitted based on session evidence.
- Introduce configurable stale-token thresholds or a hard per-session call budget in the first version.
- Change advisor model selection, multi-target fan-out, or subagent eligibility rules.
- Add project-specific defaults or a UI action that clears an existing session override in the first version.

## Decisions

### Separate configured mode from per-target synchronization state

Mode is session-wide and has three values. Synchronization is target-specific because one target may fail, rotate, or resume independently. Auto activation is derived from a valid continuation in the current context epoch rather than persisted as a second user-facing mode.

The state model is:

```text
manual              automatic guidance suppressed; explicit commands remain available
on                  standard guidance active
auto + cold/reset   workload-aware admission guidance
auto + synchronized/pending continuation
                    workload-aware follow-up guidance
```

This avoids a sticky `auto -> on` configuration mutation while retaining activation across ordinary turns. Compaction returns auto to admission guidance because the next call must synchronize a new epoch.

Alternative: decide auto only at the first turn. Rejected because complexity can emerge much later. Alternative: keep standard active guidance after continuation activation. Rejected because it can over-invoke for routine follow-up work; the narrower follow-up policy preserves workload triage while allowing review when meaningful new evidence or decisions emerge.

### Preserve standard guidance as one canonical policy

Move the ported invocation guidance out of an always-mandatory static description into a canonical exported policy used by `on`. Preserve its invocation timing and review-gating behavior while adapting transcript-availability wording. The static tool description becomes neutral and points the executor to the injected session policy. Manual receives an explicit instruction not to invoke automatically while leaving `/consult-advisor` available; cold/reset auto receives workload-aware admission guidance and reviewed auto sessions receive narrower follow-up guidance. Do not install or maintain a separate advisor skill; the plugin-injected session policy is the sole executor guidance surface.

Alternative: append overrides while leaving the mandatory tool description unchanged. Rejected because conflicting instructions would make manual and inactive auto unreliable.

### Persist mode separately and extend continuation state for observability

Use versioned advisor-owned files under `~/.opencode/advisor/state/`, following the existing atomic-write and expiry pattern. Keep mode state keyed by parent directory and session, and retain continuation state keyed by directory, session, and target. Extend persisted continuation records only with fields needed to report synchronization; do not store transcript bodies. A shared state module will provide parsing, hashing, atomic writes, and read models usable by both server and TUI entrypoints.

Continuation coordination uses process-independent contender directories with a short owner lease, recorded PID/token ownership, and a bakery-style choosing phase followed by a ticket ordered by `(ticket, token)`. The named continuation transaction holds that lock across durable reload, transcript planning, remote child creation/resume and prompt execution, durable commit/removal, and cleanup. A live owner is not lease-stolen and contenders wait for it without a fixed operation timeout, so a normal long model call does not look like lock failure. An incomplete owner record is provisional only until its lease expires, a crashed owner's unique stale contender can be recovered without reusing its pathname, and an old owner cannot release a successor's lock. A late completion from an older context epoch therefore cannot replace a newer compaction continuation, and error cleanup uses the same expected-record fence so it cannot remove newer state or a shared child. Unlocked reads leave malformed or missing records for explicit pruning rather than destructively cleaning a path that may be concurrently replaced. Persistence reports committed, conflict, and unavailable outcomes separately; unavailable storage never masquerades as a competing winner or discards a locally advanced continuation.

Session metadata was considered because it is naturally session-scoped and visible to clients. It is rejected as the primary store because OpenCode's session metadata update replaces the complete metadata record, creating a race with unrelated plugin metadata. An in-memory map was rejected because resumed sessions would silently lose explicit mode choices.

### Keep the global default separate from expiring session state

Persist a machine-wide advisor default in advisor-owned runtime settings outside the expiring session and continuation records. Resolve the effective mode in this order: an explicit session mode, the UI-selected global default, `OPENCODE_ADVISOR_MODE`, then `on`. Changing the global default therefore affects sessions without an explicit mode while preserving existing session overrides.

The TUI must not edit rendered OpenCode or Mindframe-Z profile configuration. The environment variable remains a deployment-level fallback, while the runtime settings file records the interactive user preference. The first version does not expose a reset-to-default action; once a session receives an explicit mode, the user may set it to the same value as the default but it remains an override.

Alternative: store the global default as a non-expiring record in the session-state directory. Rejected because preference lifetime and pruning rules would become coupled to ephemeral continuation data. Alternative: rewrite `OPENCODE_ADVISOR_MODE` or rendered configuration. Rejected because a process cannot durably change its inherited environment and rendered files are not the source of truth.

### Open a focused mode picker from the TUI

Register a TUI keymap command, initially bound to `<leader>v`, that opens an advisor mode picker for the active session. The picker highlights the selected mode and independently marks the current effective session mode and global default. Enter saves the highlighted mode as the current session override and closes the picker. `D` saves it as the global default and keeps the picker open, allowing `D` followed by Enter to set both quickly. Escape closes without further changes. If both values match, show both markers on the same option.

Expose the action in the command palette as `Advisor: Change mode` as a discoverable fallback. Persist through the same shared state/settings boundary used by the server, update the local TUI state immediately, and show concise confirmation feedback. A mode change affects system-policy selection on subsequent turns; it does not alter the policy already supplied to a running response or cancel an advisor invocation already in progress.

Alternative: cycle modes directly from the shortcut. Rejected because an accidental extra keypress changes policy without a confirmation surface. Alternative: use a binary enable/disable switch. Rejected because it hides the meaningful `auto` mode and conflates `manual` with complete tool removal.

### Register a command and enforce mode in the tool

Have the advisor plugin inject only `consult-advisor` through its config hook; TUI controls are the sole mode configuration surface. The plugin's `command.execute.before` hook marks an explicit `/consult-advisor` request for one manual-mode tool call. A clear natural-language request to consult, ask, use, or call the advisor marks the same one-shot allowance, making manual mode usable through speech-to-text. The command uses its bundled prompt template to request an immediate advisor call.

Manual mode injects discouraging guidance and rejects unsolicited advisor calls at the tool boundary. The allowance stays bound to the requesting user message and its direct assistant response; negated or explanatory mentions do not authorize a call. Auto transitions to its follow-up policy when a successful first call saves a current-epoch continuation.

### Share transcript planning between execution and estimation

Extract context selection, cursor delta selection, advisor-result filtering, and serialization into a shared pure module. It returns a transcript plan containing epoch, cursor boundary, serialized text, and deterministic size inputs. Execution consumes the text; observability consumes the same plan.

Exact provider token counts are unavailable before submission, so the first version reports an approximate token count derived from serialized content with a documented deterministic estimator. The UI labels it as estimated. Actual provider input and cache fields continue to come only from completed usage metadata.

The shared serializer preserves visible messages and tool calls/results. For assistant messages generated by GPT-5.6 executors, it omits the short reasoning summaries stored by OpenCode; those summaries duplicate visible execution evidence and add prompt cost without demonstrated advisor value. Other model reasoning parts remain eligible for forwarding.

Alternative: estimate from parent assistant token counters. Rejected because those counters describe model requests and cache behavior rather than the serialized transcript delta sent to advisor. Alternative: add a provider-specific tokenizer dependency. Deferred until evidence shows the simpler estimator is too inaccurate.

### Publish state to the TUI without coupling it to server memory

The TUI reads durable advisor mode and continuation cursors through the shared state module, then uses current session messages and the shared transcript planner to calculate reactive pending estimates. If the continuation cursor is outside currently loaded TUI state, the existing paginated session client path supplies the required bounded history. Message, part, session, and command-generated updates schedule a coalesced refresh.

The panel renders even with zero calls. It shows a top-level session mode and per-target synchronization rows, while existing historical metric groups remain per model/target. Descendant calls remain included in historical totals but do not determine the parent's synchronization state.

### Treat token volume as a cost signal, not an invocation trigger

Auto guidance explicitly weighs semantic value against estimated pending input. A small delta lowers the cost of a warranted call but does not create value; a large delta raises the threshold but does not prohibit a necessary review. The first release records and displays observations rather than implementing token-based automatic thresholds.

## Risks / Trade-offs

- [Estimated tokens differ from provider billing] -> Label estimates, use the exact submitted serialization, and show actual usage after completion.
- [Continuation exists but provider cache expired] -> Use synchronization terminology rather than claiming warmth; report cache hits only from actual usage.
- [TUI history loading becomes expensive] -> Reuse cursors, coalesce events, and fetch additional pages only when the synchronization cursor is not locally available.
- [Command hook still consumes a model turn] -> Keep its generated confirmation minimal; OpenCode does not currently expose a direct slash-command response.
- [Moving static guidance changes model behavior] -> Preserve the canonical invocation behavior, add focused prompt-selection tests, and compare invocation behavior against recorded sessions.
- [Multiple targets diverge] -> Keep continuation cursors and pending estimates target-specific and never infer parent state from aggregate metrics.
- [Shared files become malformed or stale] -> Use versioned validation, atomic replacement, best-effort cleanup, and the existing inactivity expiry policy.
- [Global preference is mistaken for generated configuration] -> Keep it in advisor-owned runtime settings, preserve environment/profile fallback precedence, and never mutate rendered configuration.
- [A mode changes during a running response] -> Define picker changes as applying to subsequent policy construction and do not imply cancellation of in-flight work.
- [Auto policy remains subjective] -> Instrument observable inputs and evaluate real sessions before adding thresholds or further modes.

## Migration Plan

1. Introduce shared state and transcript-planning modules while retaining current invocation behavior.
2. Add mode selection, command registration, policy injection, and manual-mode guidance with `on` as the default.
3. Extend TUI rendering, keyboard interaction, global-default settings, and metadata without removing existing historical metrics.
4. Run focused and full tests, apply the home configuration, and verify a fresh OpenCode process loads the command and plugin behavior.
5. Roll back by disabling the command and restoring the always-active standard policy; versioned state files can remain harmlessly unused or be pruned by normal expiry.

## Open Questions

- What deterministic token estimator gives an acceptable error rate for the configured advisor models without adding a tokenizer dependency?
- Which compact TUI labels best distinguish `cold`, `synchronized`, `pending`, and `reset` without implying provider-cache guarantees?
- After collecting session evidence, should the TUI add an informational stale band or estimated next-call price range?
