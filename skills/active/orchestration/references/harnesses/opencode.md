# OpenCode orchestration

- Use the configured named roles through the native subagent tool. Its permissions and configured depth remain authoritative. At a depth limit, return the missing child assignment to the caller rather than choosing an unauthorized role.
- Human-facing sessions prefer background dispatch when independent work or dialogue can continue. Background completion is notified; do not poll solely for completion. When no useful independent work remains, state what is pending and end the response.
- Delegated orchestrators use foreground calls. Run independent calls concurrently when useful and await them before accepting results. Return the integrated outcome or a concrete blocker, not a launch-only status with required children still running.
- Reuse a session only under child-continuity rules. Keep one active execution per child. Discover a supported session messaging tool for steering active work instead of starting another execution.
- Human-facing maintenance loads `effort-context`'s OpenCode continuity reference before assigning Scribe. Preserve Scribe ownership and cursors across recovery; do not initiate compaction without a human request.
- Hidden skill advertisement is not a permission boundary: `opencode/autoinvoke: false` preserves explicit skill loading. Human-only entry rules still apply. A compaction reminder to reassess skills does not select a role or restart a completed capture.
