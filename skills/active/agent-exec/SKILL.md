---
name: agent-exec
description: >
  Run another agent harness via its CLI. Use when the user explicitly asks to run Codex, OpenCode 2, or Claude Code;
  continue a session from one of those harnesses; or inspect a harness's available models or variants.
---

# Agent Exec

Agent exec drives another agent CLI and preserves the continuation handle. It is a primitive, not a review, planning, or session-archaeology workflow.

CLI delegation normally starts the target harness's primary/main agent, not a nested subagent in that harness. Only use a harness-specific agent flag when the named agent is valid for direct CLI runs; parent-session subagents and child-harness run agents are different concepts.

## Native Subagents And OpenCode 2 Testing

For a request to use a named subagent available in the current environment, such as `explore`, `general`, or `research`, use the native task tool. Reserve agent exec for explicitly running an external harness CLI or resuming its session.

Inside OpenCode 2, do not launch a child merely to obtain current runtime state. Ensure the edit has reached a watched source first; Mindframe-Z home changes require `mfz apply`. After reload settles, the current session reselects reloadable agent definitions, skills, tools, permissions, instructions, references, MCP state, and plugin state before its next physical model attempt. An in-flight model request keeps its captured state, but a later step in the same run can observe the reload.

Use a fresh native subagent when fresh context is part of the test: initial session behavior, default-agent selection, subagent-specific configuration, or freedom from previously loaded skill text and durable conversation history. Reinvoke an edited skill to load its current body; the older loaded text remains in the conversation. Before deciding that a new session, TUI, private server, or restart is required, follow [references/opencode-reload.md](references/opencode-reload.md).

Use an external `opencode2` run when the user explicitly requests the CLI, or when the behavior under test is the installed CLI, client-to-server connection, a private server, clean-room state, or a fresh top-level session needed to escape the current session's subagent depth or permissions. Nested subagents are limited to depth 1 by default, but the limit and permissions are configurable; do not describe nesting as an absolute OpenCode 2 restriction.

## Steps

1. Identify the target harness.

   Use the user's named CLI, model, or session handle to choose Claude Code, OpenCode 2, or Codex. If the target is unclear, ask one short question. Done when the harness and intended mode are explicit.

2. Build a context packet.

   Send the smallest runnable brief, not the parent transcript. Reference artifacts by path or URL when the target harness can read them. Use `agent-sessions` first only when the user asks to catch up from a prior saved session/transcript. Done when the packet contains enough context for a fresh agent to act without guessing.

3. Choose fresh or continuation.

   Prefer explicit handles over "latest". Continue only when the user asks to continue/resume or gives a handle. Avoid `latest`/`--continue` when parallel runs may exist. When the user requests an isolated, clean-room, disposable, or configuration-free local run, follow [references/isolation.md](references/isolation.md) and the selected harness reference before launching. Done when the exact continuation command or fresh-run command, including any required isolation environment, is chosen.

4. Choose the model and effort.

   Use the user's explicit model, effort, or variant when provided. Otherwise use the target harness default for routine work, and raise effort/variant for hard debugging, architecture, review, or multi-file implementation. Done when both model and reasoning depth are either explicit or intentionally omitted to use defaults.

5. Choose permissions from verbs.

   Treat review, opinion, analyze, compare, explain, and investigate as read-only unless the user asks for edits. Treat implement, fix, apply, update, refactor, change, and write as write-capable. If ambiguous, default read-only or ask. Done when sandbox/permission posture matches the task.

6. Run the harness in machine-readable mode when available.

   Capture the final answer and the session/thread handle. Machine-readable CLI output may be an event stream rather than a single result object; extract the final assistant text and handle instead of treating the raw stream as the answer. Done when the result, handle, and continuation command are visible; keep raw event streams, logs, or exports as verification evidence rather than the default user-facing output.

7. Clean up disposable sessions.

   After capturing the required evidence, delete sessions created solely for a test or probe. Keep handles the user asked to continue or that are the requested deliverable. Use the harness's individual-session deletion mechanism when available; otherwise report the retained handle and why it could not be deleted. Done when every disposable handle captured in step 6 is deleted or reported as retained.

8. Report the result.

   Return the target agent's useful output, any retained handle, and its exact continuation command. For deleted test/probe sessions, report the cleanup instead. Do not paste the full trace unless the user asked for it or the trace is needed to explain a failure. If the target made edits, report changed files and any verification it ran or skipped.

## Nested Harness Caveats

- A parent harness may block child CLI execution through its own permission system. If the child command is denied before it runs, report the blocked command and required permission instead of implying the target harness failed.
- A child harness launched from a sandboxed parent may not have the same writable home, state, cache, auth, or network access as an interactive shell. Treat an incidental temp-directory retry as a clean-room run and follow [references/isolation.md](references/isolation.md), rather than redirecting only one state path and accidentally mixing environments.
- Preserve the complete isolation environment in the continuation command. A handle created under a clean root belongs to that root and may resolve to a different or missing session under the default environment.
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

## Harness Guidance

After identifying the target, read exactly one harness reference before choosing its command:

- [Claude Code](references/claude-code.md) for Claude models, effort, permissions, output, continuation, cleanup, and clean-room state.
- [OpenCode 2](references/opencode.md) for models, agents, output events, continuation, cleanup, shared or private servers, and clean-room state.
- [Codex](references/codex.md) for models, reasoning effort, sandboxing, output, continuation, cleanup, and clean-room state.

## Failure Handling

- If a CLI is missing or unauthenticated, report the failed probe and the setup command suggested by that CLI.
- If model selection fails, inspect available models/variants and retry only after choosing an available target.
- If the target output is unstructured despite a JSON flag, preserve raw output and state which handle could not be captured.
- If the target agent makes claims about edits or tests, verify with local git status, diff, or the reported verification command before presenting them as facts.
