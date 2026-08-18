# OpenCode 2

Read [opencode-reload.md](opencode-reload.md) before using an external CLI run to test a configuration or resource change. Read [isolation.md](isolation.md) before a local clean-room run.

## Model And Agent

Inspect available models and agents before selecting non-default settings:

```bash
opencode2 models
opencode2 debug agents
```

Use the configured default for routine work. Choose `--model <provider/model>` only when the user names a target, a stronger reviewer or implementer is needed, or a cheaper or faster worker is appropriate. Append a relevant provider variant as `<provider/model#variant>`.

Use `--agent <agent>` when the user asks for a specific primary or all-mode agent, or when that agent's permissions encode the needed posture. A subagent-mode agent cannot run at the top level. `run` does not make work read-only by itself; enforce read-only work through the selected agent and configuration plus the context packet.

## Commands

Fresh run:

```bash
opencode2 run --title "<short trackable title>" --model <provider/model#variant> "<context packet>"
```

Continue an explicit session:

```bash
opencode2 run --session <sessionID> "<context packet>"
```

Omit `--model` when intentionally using configured defaults. Avoid `opencode2 run --continue` unless the user explicitly wants the latest session and concurrent OpenCode runs cannot select the wrong one.

Use default output when only the final answer is needed. When stdout is not a TTY, OpenCode 2 prints completed assistant text without the raw event stream. Use `--format json` for event-level data or guaranteed session ID capture.

JSON output is an event stream, not one result object. Every event includes `sessionID`; the useful answer is usually the final `text` event's `part.text`. Return that text plus `sessionID`. If the child answer itself must be JSON, require it in the context packet and validate the final text.

Delete a disposable test or probe session after capturing its evidence:

```bash
opencode2 api v2.session.remove --param sessionID=<sessionID>
```

## Clean-Room State

Use the `host_home` and `root` variables from [isolation.md](isolation.md).

OpenCode splits state across all four XDG roots. `XDG_DATA_HOME` contains provider auth and the session database. Seed only the provider auth file:

```bash
mkdir -p "$root/data/opencode"
install -m 600 "$host_home/.local/share/opencode/auth.json" "$root/data/opencode/auth.json"
```

Do not copy `opencode.db`, `account.json`, logs, repositories, snapshots, tool output, caches, or the host config directory. The copied auth file can contain several providers; when narrower credential exposure matters, use a provider-specific environment variable or a minimal redacted auth file instead.

Supply an empty explicit config and disable repository OpenCode config when neither user nor project configuration should load:

```bash
env -i \
  HOME="$root/home" \
  PATH="$PATH" \
  XDG_CONFIG_HOME="$root/config" \
  XDG_DATA_HOME="$root/data" \
  XDG_STATE_HOME="$root/state" \
  XDG_CACHE_HOME="$root/cache" \
  OPENCODE_CONFIG_CONTENT='{}' \
  OPENCODE_DISABLE_PROJECT_CONFIG=true \
  opencode2 run --standalone --format json --title "<title>" --model <provider/model#variant> "<context packet>"
```

A model or plugin available only through normal OpenCode config is intentionally unavailable. Define the minimum required clean config instead of pointing a config or XDG variable back at the host. If repository configuration is part of the test, omit only `OPENCODE_DISABLE_PROJECT_CONFIG` and state that it remains in scope.

Resume with the same XDG roots and config controls:

```bash
env -i \
  HOME="$root/home" \
  PATH="$PATH" \
  XDG_CONFIG_HOME="$root/config" \
  XDG_DATA_HOME="$root/data" \
  XDG_STATE_HOME="$root/state" \
  XDG_CACHE_HOME="$root/cache" \
  OPENCODE_CONFIG_CONTENT='{}' \
  OPENCODE_DISABLE_PROJECT_CONFIG=true \
  opencode2 run --standalone --session <sessionID> "<context packet>"
```

`--standalone` starts a private server for the command instead of discovering or starting the shared background service. OpenCode 2 may refresh OAuth tokens in the copied auth file. Keep the clean root for continuation, or remove it after a disposable run; never copy refreshed credentials back over the host file automatically.
