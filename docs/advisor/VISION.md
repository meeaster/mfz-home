# Vision: Advisor

## Purpose

The advisor pairs a capable executor with a stronger reviewer that can inspect the executor's
available transcript and give strategic guidance while work is still in progress. It exists to
improve load-bearing decisions, catch consequential mistakes, and provide course correction without
moving the whole task onto the slower, more expensive model.

The executor still owns the task. It gathers evidence, calls tools, edits files, runs verification,
and produces the result. The advisor does not replace implementation, act as a generic second
opinion on every turn, or remove the executor's responsibility to judge advice against primary
evidence.

The desired experience is selective and predictable:

- routine work proceeds without interruption;
- consequential work receives advice before the approach hardens;
- later evidence can trigger another consultation when it changes the decision;
- completed substantive work can receive a final challenge before it is declared done;
- the user can always request a consultation explicitly when the configured advisor is eligible.

## Core Model

### The executor chooses timing

The plugin supplies the tool, transcript, mode policy, continuation state, and eligibility checks.
The executor decides when to emit the tool call. Plugin code does not independently launch an
advisor call.

Invocation guidance should therefore be short enough to remain legible and explicit enough to
produce the intended timing. When traces show systematic under-calling or over-calling, change the
narrowest responsible branch rather than adding broad reminders everywhere.

### The advisor must be stronger

Consultation is useful only when the configured advisor provides a meaningful capability increase.
If the executor is equal to or stronger than the configured advisor, the call should be skipped
rather than spending time and context on a weaker review.

### Advice is a gate, not an order

The executor gives blocking advice serious weight. It either resolves the issue or reconciles the
conflict against primary evidence before continuing. It may reject advice that contradicts the
specification, source, test evidence, or user intent, but it should make that judgment deliberately
rather than silently ignoring the result.

## Mode Contract

### Manual

`manual` suppresses automatic consultation. A direct slash command or clear natural-language user
request permits one call for the requesting turn. Incidental, explanatory, conditional, quoted, or
negated mentions do not authorize a call.

Manual mode is for users who want complete control over consultation timing. It is not complete tool
removal: explicit consultation remains available.

### Auto

`auto` is workload-aware admission. It lets the executor decide when independent review is worth the
cost based on the work now in front of it. It must be able to activate when complexity emerges late,
not only at the beginning of a session.

Auto should consult for load-bearing implementation or refactoring decisions, behavioral changes,
architecture, authored prompts or skills, specifications, consequential operations, meaningful new
evidence, repeated failure, or a real change of direction. It should remain inactive for casual
conversation, orientation, ordinary searches, simple read-only commands, routine commits of already
reviewed work, and obvious mechanical edits.

Auto is not a lighter spelling of `on`. Admission remains workload-driven after every call and after
every compaction. A successful call does not turn the remainder of the session into mandatory
checkpoint review.

### On

`on` applies the full active advisor cadence. The executor consults after enough orientation to frame
the task but before substantive work, at meaningful checkpoints during long tasks, when stuck or
changing direction, and after making a substantive result durable but before declaring completion.

This mode intentionally favors review coverage over cost and interruption. Removing its checkpoint
behavior would collapse its distinction from `auto`.

## Auto Timing

### Admission can happen late

An auto session may perform many routine turns without consulting. When a later turn introduces a
non-obvious design decision, material risk, conflicting evidence, repeated failure, or consequential
change, the executor should call after gathering enough context to frame the issue and before
committing to the approach.

The amount of accumulated context affects cost, not value. A small pending delta does not create a
reason to call. A large pending delta does not prohibit a needed call.

### Review-and-fix is a distinct cycle

Nontrivial findings from a code review, audit, or review subagent create a new decision point. In
auto mode, the executor should consult after orienting on the findings and relevant source, but before
accepting or rejecting findings, choosing the fix strategy, or editing.

When that review cycle produces substantive changes, the executor should make the result durable,
run relevant verification, and consult again before declaring the review-and-fix pass complete. The
first call helps adjudicate the findings and approach; the second challenges the implemented result.

This two-call behavior belongs to the review-and-fix branch. It does not impose a mandatory
before-and-after cadence on every task admitted by auto mode.

### Follow-up calls require new value

After an advisor has reviewed the current context epoch, routine execution and small mechanical
changes should continue without another call. Another consultation becomes warranted when meaningful
new work, a new decision, material evidence, repeated failure, a changed direction, or a substantively
changed review deliverable gives the advisor something new to evaluate.

Repeated calls that merely ask the advisor to restate the same judgment add cost and can create review
churn. The goal is useful intervention, not maximum call count.

## Compaction And Continuations

Advisor mode and advisor synchronization are separate states. Compaction changes the transcript
epoch and invalidates reuse of the previous epoch's continuation, but it does not change the
configured mode.

After compaction in auto mode:

- the session returns to workload-aware admission;
- compaction alone does not trigger a call;
- routine work can continue without consultation;
- the next warranted call synchronizes the advisor with the new compacted context;
- later calls in that epoch can reuse the new continuation and send only the required delta.

A continuation makes a warranted follow-up cheaper; it does not make the follow-up necessary.
Conversely, an expensive reset does not justify skipping review when the decision is consequential.

## Invocation Shape

Before calling, the executor should state one concise sentence describing the task and its initial
read. This gives the advisor an explicit decision surface while the plugin supplies the transcript.
The executor should not write a second long prompt that duplicates history already available to the
advisor.

The best first call occurs after orientation but before commitment. Orientation may include locating
files, reading the specification, inspecting the relevant implementation, or gathering the review
findings. Choosing the architecture, triaging findings, editing, or declaring an answer is
substantive work.

For a completion call, the deliverable should already be durable and relevant verification should
already have run. That lets the advisor inspect the actual result and leaves useful work behind if the
session ends during review.

## Subagents

Subagents inherit the effective advisor mode of their parent chain so delegation does not silently
discard the user's consultation preference. Only eligible general-purpose subagents may execute
advisor calls; narrow read-only agents should not expand into advisor-driven work.

An independent review subagent and the advisor have different roles. The review subagent produces
detailed findings from source inspection. The advisor helps the parent executor adjudicate those
findings and later challenge the resulting fix. One does not automatically substitute for the other.

## Cost And Quality

The advisor is valuable when a short strategic intervention avoids a flawed plan, security issue,
incorrect boundary, repeated retry, or premature completion. It is poor value when used for routine
orientation, deterministic mechanics, unchanged work, or repeated confirmation.

Auto mode exists because always-on consultation can be expensive and can destabilize a task through
unnecessary repeated review. Its policy should be tuned from observed usefulness, false alarms,
missed checkpoints, call cost, and downstream adoption rather than from token volume alone.

Model choice and mode are separate decisions. Changing the advisor model, mode semantics, and prompt
at the same time makes behavioral evaluation difficult to attribute.

## Expected Observability

The user should be able to distinguish:

- configured mode from synchronization state;
- cold or reset context from an active continuation;
- estimated pending transcript size from actual provider usage;
- executor model from advisor model;
- a completed consultation from an eligibility skip or tool failure.

Observability should explain behavior without becoming another control plane or changing generated
configuration behind the user's back.

## Behavioral Evaluation

Policy changes are not validated by unit tests or by the executor saying it followed the policy.
Evaluation should combine repeatable scenarios with real session traces.

At minimum, scenarios should cover:

- routine auto work that never calls;
- complexity emerging after several routine turns;
- compaction followed by routine work and then later consequential work;
- a review-and-fix pass with consultation before triage and after verified fixes;
- activated auto continuing through mechanical follow-up without repeated calls;
- on mode consulting before work, at a meaningful checkpoint, and before completion;
- manual mode accepting direct requests and rejecting incidental mentions;
- equal-or-stronger executors skipping an ineligible advisor;
- parent mode inheritance into eligible and ineligible subagents.

Trace review should verify the actual order of user turns, orientation, advisor calls, edits,
verification, and completion. It should record the executor model, advisor model, reasoning level,
mode, compaction boundary, and plugin version or commit when those facts are available.

After changing invocation policy or its advertised description, testing must use a fresh OpenCode
process so the evaluated session loads the intended version.

## Non-Goals

- Advisor is not a replacement executor or implementation worker.
- Auto mode does not guarantee a call at the start or end of every substantive task.
- Compaction is not an invocation trigger.
- Continuation availability is not an invocation trigger.
- Token volume alone is not an invocation trigger.
- The plugin does not silently call advisor without an executor tool use.
- More calls are not inherently better.
- The runtime policy should not duplicate this complete vision document.

## Durable Decisions

- Keep `manual`, `auto`, and `on` behaviorally distinct.
- Keep auto workload-aware before and after activation.
- Keep on as the aggressive before/checkpoint/completion policy.
- Treat review-and-fix as a special two-consultation auto branch when fixes are substantive.
- Treat compaction as a synchronization reset, not a reason to consult.
- Keep runtime guidance concise and maintain it as the sole executor-facing policy source.
- Use real session evidence to tighten the smallest failing branch instead of broadly increasing call
  pressure.

## Related Sources

- [`openspec/changes/advisor-auto-mode-observability/design.md`](../../openspec/changes/advisor-auto-mode-observability/design.md)
- [`openspec/changes/advisor-auto-mode-observability/specs/advisor-session-policy/spec.md`](../../openspec/changes/advisor-auto-mode-observability/specs/advisor-session-policy/spec.md)
- [`opencode/plugins/advisor/server.ts`](../../opencode/plugins/advisor/server.ts)
- [Anthropic advisor tool documentation](https://platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool.md)
