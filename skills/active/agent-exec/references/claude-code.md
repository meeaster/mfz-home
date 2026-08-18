# Claude Code

Read [isolation.md](isolation.md) before a local clean-room run.

## Model And Effort

Use `--model <alias-or-full-name>` for explicit model selection. Useful aliases include `default`, `best`, `fable` for hardest long-running work, `opus` for complex reasoning, `sonnet` for daily coding, `haiku` for simple or cheap work, `sonnet[1m]` or `opus[1m]` for long context, and `opusplan` for Opus planning plus Sonnet execution.

Use `--effort <level>` with `low`, `medium`, `high`, `xhigh`, `max`, or `ultracode` when supported. Prefer the model's default effort for normal work, `high` or `xhigh` for difficult implementation, review, or debugging, `ultracode` for substantive Claude Code workflow orchestration, and `max` only when the user asks for the strongest pass or the task clearly warrants the cost. The documented default effort is already high on most current models. For `haiku` and other simple or cheap runs, omit `--effort` unless the user explicitly asks for it or local docs confirm support.

Do not disable tools with `--tools ""` during normal delegation; that prevents Claude Code from loading configured tools and skills. Restrict tools only when the user explicitly requests a tool-free run or the safety posture requires it.

## Commands

Fresh synchronous run:

```bash
claude -p "<context packet>" --output-format json --model <model>
```

Fresh background run:

```bash
claude --bg "<context packet>" --model <model>
claude agents --json --all
```

Continue an explicit session:

```bash
claude -r <session_id> "<context packet>" --output-format json --model <model>
```

Continue the latest session in the current directory:

```bash
claude -c -p "<context packet>" --output-format json --model <model>
```

Add `--effort <level>` only when the selected model supports it and the task warrants an override. Omit `--model` only when intentionally using configured defaults. For read-only review, add `--permission-mode plan` or explicit denied tools if local configuration does not already prevent edits.

Capture `session_id` from JSON output and check `modelUsage` for the actual model used. Aliases, entitlements, or organization restrictions can substitute another model, and JSON output may suppress the warning. Prefer `claude agents --json --all` for background status. Avoid parsing `claude logs` unless the user wants human-readable terminal output; it may contain TUI control sequences.

Claude Code has no supported per-session deletion for ordinary foreground `-p` sessions. Retain and report a disposable probe's `session_id`.

## Clean-Room State

Use the `host_home` and `root` variables from [isolation.md](isolation.md).

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
