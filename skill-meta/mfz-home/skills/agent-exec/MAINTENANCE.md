# Maintenance

## Dependencies

The runtime package depends on the installed Codex, OpenCode 2, and Claude Code CLIs. Harness command syntax, session lifecycle behavior, and OpenCode reload boundaries are version-sensitive. OpenCode 2 guidance is grounded in the read-only V2 reference clone at `/home/mark/workspace/references/opencode` and its published V2 docs.

## Change Procedure

1. Confirm whether the change affects invocation, context transfer, permissions, continuation, output parsing, cleanup, or isolation.
2. Check the target CLI's current `--help` and authoritative source or docs before changing command syntax.
3. Keep the current OpenCode session as the default hot-reload test path after source changes reach the watched runtime path. Use native subagents when fresh context or child behavior is part of the test.
4. Update the runtime package, invocation examples, and affected evaluation scenarios together.
5. Run Mindframe-Z validation and inspect the rendered skill after applying the home.

## OpenCode 2 Checks

Verify the executable name, `run` flags, model variant syntax, agent modes, JSON event shape, session API operation, service behavior, and isolation variables against the V2 branch. Recheck `SessionContext.select`, config plugins, state consumers, client configuration startup, and `experimental.subagent_depth` before changing reload guidance. A file watcher alone is not proof that the consuming service reloads.

## Verification

Run:

```bash
mfz apply
mfz skills list
mfz doctor
```

Inspect the source and rendered diffs. Live CLI scenarios remain optional unless the change depends on unverified installed behavior; never expose credentials or copy a harness's complete state into a clean root.
