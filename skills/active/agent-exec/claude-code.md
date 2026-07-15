# Claude Code

Read [ISOLATION.md](ISOLATION.md) first and use its `host_home` and `root` variables.

`CLAUDE_CONFIG_DIR` relocates Claude Code's user configuration and data. On Linux and Windows, a reusable OAuth login needs both `~/.claude/.credentials.json` and the `oauthAccount` anchor from `~/.claude.json`. Seed only those values:

```bash
mkdir -p "$root/claude"
install -m 600 "$host_home/.claude/.credentials.json" "$root/claude/.credentials.json"
jq -e 'if .oauthAccount then {oauthAccount} else error("missing oauthAccount") end' \
  "$host_home/.claude.json" > "$root/claude/.claude.json"
chmod 600 "$root/claude/.claude.json"
```

Do not copy `settings.json`, history, projects, plugins, skills, hooks, tasks, telemetry, or caches. On macOS, the OAuth token normally lives in Keychain; use an API key, authenticate inside the clean root, or explicitly export the Keychain credential to `$root/claude/.credentials.json` rather than granting the child ambient Keychain reuse.

Run with `--safe-mode`, which disables user and project customizations while preserving the copied authentication. System-managed organization policy can still apply:

```bash
env -i \
  HOME="$root/home" \
  PATH="$PATH" \
  CLAUDE_CONFIG_DIR="$root/claude" \
  claude --safe-mode -p "<context packet>" --output-format json --model <model>
```

For a one-shot API-key run, omit the copied files, pass `ANTHROPIC_API_KEY` explicitly, and use `--bare` instead. Bare mode skips OAuth and Keychain reads as well as customizations.

Resume with the same root and mode:

```bash
env -i \
  HOME="$root/home" \
  PATH="$PATH" \
  CLAUDE_CONFIG_DIR="$root/claude" \
  claude --safe-mode -r <session_id> "<context packet>" --output-format json --model <model>
```

Claude may refresh tokens in the copied credential file. Keep the clean root for continuation, or remove it after a disposable run; never copy refreshed credentials back over the host file automatically.
