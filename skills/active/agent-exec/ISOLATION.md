# Local Clean-Room Runs

Use this branch when the target CLI must run locally without reading or writing the invoking user's harness configuration, credentials, sessions, logs, caches, plugins, skills, MCP state, or memories.

This is process-state isolation, not a security sandbox. Environment redirection stops normal config and state discovery, but a child with filesystem tools can still read an absolute host path. Use the harness sandbox, OS isolation, or a container when host files must be inaccessible.

## Build The Clean Root

Create one root per run and put every writable user location under it:

```bash
host_home="${HOME:?}"
root="$(mktemp -d /tmp/agent-exec-<harness>.XXXXXX)"
mkdir -p "$root"/{home,config,data,state,cache}
```

Launch through `env -i` so unrelated provider settings, hooks, proxies, telemetry, and harness variables do not leak in. Reintroduce only `HOME`, `PATH`, the clean state roots, locale or certificate variables required by the machine, and the credential needed for this run. Never pass the entire parent environment.

Choose the root lifetime before launch:

- **Disposable:** use for one fresh probe, prefer non-persisting CLI flags, then remove the root after capturing output.
- **Continuable:** retain the root and report it with the handle. Every resume command must reuse the same variables and root.

Authentication is part of the boundary. A clean run may use a credential variable scoped to one command, a fresh login inside the clean root, or a copied host login. Copying auth is state reuse by design, but it still isolates subsequent reads, token refreshes, and writes from the host file. Copy regular files with mode `0600`; never symlink credentials into the clean root.

Follow the target harness branch:

- [Claude Code](claude-code.md)
- [OpenCode](opencode.md)
- [Codex](codex.md)

## Verify And Close

Before reporting success, verify the child used the clean environment:

- The handle is absent from the normal harness session listing and present under the retained clean root when the harness provides a listing command.
- Resolved config or startup events show no unexpected user plugins, skills, MCP servers, hooks, or memories.
- All created state is under the clean root, apart from explicit task outputs in the target workspace.
- The exact environment prefix is included in any continuation command.

For a disposable run, remove the clean root only after output and evidence are captured. For a continuable run, report the root as sensitive local state and leave it intact. Done when the normal harness state was neither read through normal discovery nor mutated, and the clean root is either removed or explicitly retained.
