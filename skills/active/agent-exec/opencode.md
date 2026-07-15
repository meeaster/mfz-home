# OpenCode

Read [ISOLATION.md](ISOLATION.md) first and use its `host_home` and `root` variables.

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
  opencode run --format json --title "<title>" --model <provider/model> "<context packet>"
```

A model or plugin available only through the normal OpenCode config is intentionally unavailable. Define the minimum required clean config instead of pointing an XDG or config variable back at the host. If repository OpenCode configuration is part of the target being tested, omit only `OPENCODE_DISABLE_PROJECT_CONFIG` and state that repository config remains in scope.

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
  opencode run --session <sessionID> "<context packet>"
```

OpenCode may refresh OAuth tokens in the copied auth file. Keep the clean root for continuation, or remove it after a disposable run; never copy refreshed credentials back over the host file automatically.
