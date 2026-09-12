# Maintenance

## Dependencies

The runtime package depends on the installed Codex, OpenCode, and Claude Code CLIs. Harness command syntax, session lifecycle behavior, and OpenCode reload boundaries are version-sensitive. OpenCode guidance is grounded in the read-only reference clone at `/home/mark/workspace/references/opencode` and the current product documentation.

Check the selected CLI's current help and authoritative source before changing commands. No exact OpenCode source revision was retained in the original record; its reload claims need fresh source verification during a version refresh.

## OpenCode Checks

Verify the executable name, `run` flags, model variant syntax, agent modes, JSON event shape, first-class session commands, service behavior, and isolation variables against the current release. Recheck `SessionContext.select`, config plugins, state consumers, client configuration startup, and `experimental.subagent_depth` before changing reload guidance. A file watcher alone is not proof that the consuming service reloads. The current refresh is pinned to source revision `7c5a4d01aa2a8144a81b6261aad220cf5a84c107` and installed release `v2.0.2`; `v2` remains a release number and internal API identifier, not the product name used in runtime guidance.

For isolation changes, verify continuation under the same complete environment and distinguish a created handle from an assistant answer. Never expose credentials or copy a harness's complete state into a clean root. The earlier native-subagent-first reload recommendation was reversed; [historical rationale](LOG.md) explains that distinction.
