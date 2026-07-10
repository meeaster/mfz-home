---
name: agent-exec
description: >
  Run another agent harness via its CLI. Use when the user explicitly asks to run Codex, OpenCode, or Claude Code;
  continue a session from one of those harnesses; or inspect a harness's available models or variants.
---

# Agent Exec

Agent exec drives another agent CLI and preserves the continuation handle. It is a primitive, not a review, planning, or session-archaeology workflow.

CLI delegation normally starts the target harness's primary/main agent, not a nested subagent in that harness. Only use a harness-specific agent flag when the named agent is valid for direct CLI runs; parent-session subagents and child-harness run agents are different concepts.

## Native Subagents

For a request to use a named subagent available in the current environment, such as `explore`, `general`, or `research`, use the native task tool. Reserve agent exec for explicitly running an external harness CLI or resuming its session.

## Steps

1. Identify the target harness.

   Use the user's named CLI, model, or session handle to choose Claude Code, OpenCode, or Codex. If the target is unclear, ask one short question. Done when the harness and intended mode are explicit.

2. Build a context packet.

   Send the smallest runnable brief, not the parent transcript. Reference artifacts by path or URL when the target harness can read them. Use `agent-sessions` first only when the user asks to catch up from a prior saved session/transcript. Done when the packet contains enough context for a fresh agent to act without guessing.

3. Choose fresh or continuation.

   Prefer explicit handles over "latest". Continue only when the user asks to continue/resume or gives a handle. Avoid `latest`/`--continue` when parallel runs may exist. Done when the exact continuation command or fresh-run command is chosen.

4. Choose the model and effort.

   Use the user's explicit model, effort, or variant when provided. Otherwise use the target harness default for routine work, and raise effort/variant for hard debugging, architecture, review, or multi-file implementation. For Claude Code, remember that the documented default effort is already high on most current models. Done when both model and reasoning depth are either explicit or intentionally omitted to use defaults.

5. Choose permissions from verbs.

   Treat review, opinion, analyze, compare, explain, and investigate as read-only unless the user asks for edits. Treat implement, fix, apply, update, refactor, change, and write as write-capable. If ambiguous, default read-only or ask. Done when sandbox/permission posture matches the task.

6. Run the harness in machine-readable mode when available.

   Capture the final answer and the session/thread handle. Machine-readable CLI output may be an event stream rather than a single result object; extract the final assistant text and handle instead of treating the raw stream as the answer. Done when the result, handle, and continuation command are visible; keep raw event streams, logs, or exports as verification evidence rather than the default user-facing output.

7. Report the result.

   Return the target agent's useful output, the captured handle, and the exact continuation command. Do not paste the full trace unless the user asked for it or the trace is needed to explain a failure. If the target made edits, report changed files and any verification it ran or skipped.

## Nested Harness Caveats

- A parent harness may block child CLI execution through its own permission system. If the child command is denied before it runs, report the blocked command and required permission instead of implying the target harness failed.
- A child harness launched from a sandboxed parent may not have the same writable home, state, cache, auth, or network access as an interactive shell. If startup fails on log/state/cache paths, retry once with explicit writable temp locations such as `HOME=/tmp/<tool>-home` and `XDG_DATA_HOME=/tmp/<tool>-data` when that is safe for the task.
- Preserve any required environment prefixes in the continuation command. A session created with temp home/data directories may not be resumable from the default environment.
- Do not treat a captured handle as a successful answer. A session/thread can be created before the child model returns any assistant message; inspect the child output or export before reporting success.

## Context Packet

Use this shape. Keep it compact; omit sections that are irrelevant.

```markdown
## Objective
What the target agent should accomplish.

## Mode
implement | investigate | review | opinion | continue

## Current State
What has already been decided, tried, or ruled out.

## Relevant References
Paths, specs, issues, diffs, or session handles. Prefer references over pasted bulk content.

## Scope And Constraints
What the target may edit, must not edit, style constraints, and permission posture.

## Verification
Commands or observable success criteria.

## Expected Output
Patch, findings, recommendation, diagnosis, or next-step plan.
```

Packet rules:

- State current behavior and desired behavior for implementation tasks.
- Include acceptance criteria for delegated implementation.
- Include explicit out-of-scope boundaries to prevent gold-plating.
- Include relevant file paths when they help immediate execution; avoid brittle line numbers unless necessary.
- Redact secrets and private transcript content that the target does not need.
- For multi-step work, delegate one fresh-context-sized slice at a time.

## Claude Code

Select model and effort before running. Use `--model <alias-or-full-name>` for explicit model selection. Useful aliases include `default`, `best`, `fable` for hardest long-running work, `opus` for complex reasoning, `sonnet` for daily coding, `haiku` for simple/cheap work, `sonnet[1m]` or `opus[1m]` for long context, and `opusplan` for Opus planning plus Sonnet execution. Use `--effort <level>` with `low`, `medium`, `high`, `xhigh`, `max`, or `ultracode` when supported. Prefer the model's default effort for normal delegated work, `high` or `xhigh` for difficult implementation/review/debugging, `ultracode` for substantive Claude Code workflow orchestration, and `max` only when the user asks for the strongest pass or the task clearly warrants the cost.

Do not disable tools with `--tools ""` during normal delegation; that prevents Claude Code from loading configured tools and skills such as `claude-code-docs`. Only restrict tools when the user explicitly asks for a tool-free run or when the safety posture requires it. For `haiku` and other simple/cheap Claude runs, omit `--effort` unless the user explicitly asks for it or local docs confirm the chosen model supports the requested effort.

Fresh synchronous run:

```bash
claude -p "<context packet>" --output-format json --model <model>
```

Fresh background run:

```bash
claude --bg "<context packet>" --model <model>
claude agents --json --all
```

Continue explicit session:

```bash
claude -r <session_id> "<context packet>" --output-format json --model <model>
```

Continue latest in the current directory:

```bash
claude -c -p "<context packet>" --output-format json --model <model>
```

Add `--effort <level>` only when the selected Claude model supports it and the task warrants an explicit override. Omit `--model` only when intentionally using configured defaults. For read-only review, add `--permission-mode plan` or explicit denied tools if the local Claude configuration does not already prevent edits. Capture `session_id` from JSON output and check `modelUsage` for the actual model used; aliases, entitlements, or organization restrictions can substitute a different model, and JSON output may suppress the warning. Prefer `claude agents --json --all` for background status. Avoid parsing `claude logs` unless the user wants human-readable terminal output; it may contain TUI control sequences.

## OpenCode

Inspect models and variants before selecting a non-default OpenCode model:

```bash
opencode models <provider> --verbose
```

Use the configured OpenCode default for routine delegation. Choose `--model <provider/model>` only when the user names a target, you need a stronger reviewer/implementer, or you need a cheaper/faster worker. Add `--variant <variant>` only when the provider exposes reasoning effort or speed variants relevant to the task.

Fresh run:

```bash
opencode run --title "<short trackable title>" --model <provider/model> --variant <variant> "<context packet>"
```

Continue explicit session:

```bash
opencode run --session <sessionID> "<context packet>"
```

Omit `--model` and `--variant` when intentionally using configured defaults. Use `--agent <agent>` when the user asks for a specific OpenCode primary/all agent or when that agent's permissions encode the needed read-only/write-capable posture; if `opencode run` warns that the named agent is only a subagent, retry with a valid run agent or omit `--agent`. OpenCode `run` does not make a command read-only by itself; enforce read-only work through the selected agent/config plus the context packet. Avoid `opencode run --continue` unless the user explicitly wants the latest session and there is no risk of concurrent OpenCode runs in the same repo.

Use default output when you only need the child agent's final answer; when stdout is not a TTY, OpenCode prints completed assistant text without the raw event stream. Use a unique `--title`, then recover the handle with `opencode session list --format json --max-count <n>` if the session ID is needed. Use `--format json` only when you need event-level data or guaranteed session ID capture from stdout.

OpenCode `--format json` emits JSON events, not a single final result object. The useful answer is usually in the last assistant `text` event; return that concise text plus `sessionID`. If the caller needs the child answer itself to be JSON, say so in the context packet and validate or report if the final `text` is not JSON.

## Codex

Select model and reasoning effort before running. Use `--model <model>` for explicit model selection; start with the current strongest recommended Codex model, currently `gpt-5.5`, for most Codex work and a faster mini model, currently `gpt-5.4-mini`, for lower-cost lighter subagent work. Use `codex debug models` when you need the current model catalog. Use `-c model_reasoning_effort="<effort>"` for effort when the chosen model supports it. Prefer `medium` for normal delegated work, `high` for complex implementation/review/debugging, and `low` when the task is straightforward and speed matters most.

Fresh read-only run:

```bash
codex exec --json --sandbox read-only --model <model> -c model_reasoning_effort="<effort>" "<context packet>"
```

Fresh write-capable run:

```bash
codex exec --json --sandbox workspace-write --model <model> -c model_reasoning_effort="<effort>" "<context packet>"
```

Continue explicit thread:

```bash
codex exec resume --json <thread_id> --model <model> -c model_reasoning_effort="<effort>" "<context packet>"
```

Continue latest recorded thread:

```bash
codex exec resume --json --last --model <model> -c model_reasoning_effort="<effort>" "<context packet>"
```

Omit `--model` or `-c model_reasoning_effort=...` only when intentionally using configured or persisted thread defaults. Capture `thread_id` from the `thread.started` JSON event. `codex exec` does not use `--ask-for-approval`; use sandbox choice as the main scripted safety control.

## Failure Handling

- If a CLI is missing or unauthenticated, report the failed probe and the setup command suggested by that CLI.
- If model selection fails, inspect available models/variants and retry only after choosing an available target.
- If the target output is unstructured despite a JSON flag, preserve raw output and state which handle could not be captured.
- If the target agent makes claims about edits or tests, verify with local git status, diff, or the reported verification command before presenting them as facts.
