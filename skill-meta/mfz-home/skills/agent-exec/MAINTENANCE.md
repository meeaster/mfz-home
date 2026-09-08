# Maintenance

## Dependencies

The runtime package depends on the installed Codex, OpenCode 2, and Claude Code CLIs. Harness command syntax, session lifecycle behavior, and OpenCode reload boundaries are version-sensitive. OpenCode 2 guidance is grounded in the read-only V2 reference clone at `/home/mark/workspace/references/opencode` and its published V2 docs.

Check the selected CLI's current help and authoritative source before changing commands. No exact OpenCode source revision was retained in the original record; its reload claims need fresh source verification during a version refresh.

## OpenCode 2 Checks

Verify the executable name, `run` flags, model variant syntax, agent modes, JSON event shape, session API operation, service behavior, and isolation variables against the V2 branch. Recheck `SessionContext.select`, config plugins, state consumers, client configuration startup, and `experimental.subagent_depth` before changing reload guidance. A file watcher alone is not proof that the consuming service reloads.

For isolation changes, verify continuation under the same complete environment and distinguish a created handle from an assistant answer. Never expose credentials or copy a harness's complete state into a clean root. The earlier native-subagent-first reload recommendation was reversed; [historical rationale](LOG.md) explains that distinction.
