# Vision

## Problem

Users sometimes need a specific external agent harness to run through its CLI, continue an existing harness session, or expose its model catalog. Native subagents are a better fit for ordinary in-process delegation and OpenCode 2 hot-reload tests, so CLI execution must not become the default delegation path.

## Intended Behavior

Agent Exec runs Codex, OpenCode 2, or Claude Code only after an explicit user request for that harness CLI, continuation, or model inspection. It sends a bounded context packet, chooses permissions from the requested work, captures the useful answer and continuation handle, and cleans up disposable sessions when the harness supports it.

Inside OpenCode 2, the skill preserves the current session for ordinary tests of hot-reloaded skills, agents, configuration, instructions, MCP state, references, and local plugins. It uses a fresh native subagent only when fresh context or child behavior is part of the test. External `opencode2` runs remain available for CLI and client-server testing, clean-room or private-server execution, and fresh top-level sessions when the current ancestry or permissions would invalidate a nested workflow test.

## Success

An explicit CLI request runs the named harness with the requested model, permissions, and continuation semantics. An ordinary OpenCode hot-reload test stays in the current session unless the test requires fresh context, then uses a native subagent. Reports distinguish a created handle from a completed answer and include exact continuation or cleanup state.

## Non-Goals

- Choosing an external CLI merely because another agent could help.
- Replacing review, planning, session archaeology, or native subagent workflows.
- Treating OpenCode 2's default subagent depth as an immutable nesting prohibition.
- Providing security isolation through process-state redirection alone.
