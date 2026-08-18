# Codex

Read [isolation.md](isolation.md) before a local clean-room run.

## Model And Effort

Use `--model <model>` for explicit model selection. Start with the current strongest recommended model, currently `gpt-5.5`, for most work and a faster mini model, currently `gpt-5.4-mini`, for cheaper lighter work. Use `codex debug models` when the current catalog is needed.

Use `-c model_reasoning_effort="<effort>"` when the model supports it. Prefer `medium` for normal work, `high` for complex implementation, review, or debugging, and `low` when the task is straightforward and speed matters most.

## Commands

Fresh read-only run:

```bash
codex exec --json --sandbox read-only --model <model> -c model_reasoning_effort="<effort>" "<context packet>"
```

Fresh write-capable run:

```bash
codex exec --json --sandbox workspace-write --model <model> -c model_reasoning_effort="<effort>" "<context packet>"
```

Continue an explicit thread:

```bash
codex exec resume --json <thread_id> --model <model> -c model_reasoning_effort="<effort>" "<context packet>"
```

Continue the latest recorded thread:

```bash
codex exec resume --json --last --model <model> -c model_reasoning_effort="<effort>" "<context packet>"
```

Omit `--model` or `-c model_reasoning_effort=...` only when intentionally using configured or persisted thread defaults. Capture `thread_id` from the `thread.started` JSON event. `codex exec` does not use `--ask-for-approval`; use sandbox choice as the main scripted safety control.

Delete a disposable test or probe thread with `codex delete <thread_id>` after capturing its evidence.

## Clean-Room State

Use the `host_home` and `root` variables from [isolation.md](isolation.md).

`CODEX_HOME` contains Codex config, auth, logs, sessions, skills, and package metadata. Create it and seed only the file-backed login:

```bash
mkdir -p "$root/codex"
install -m 600 "$host_home/.codex/auth.json" "$root/codex/auth.json"
```

This path requires a host `auth.json`. If the host login exists only in the OS credential store, use an API key or log in inside the clean root; do not let automatic keyring lookup silently reuse the host entry.

Force file-backed credential lookup so Codex reads the copied auth file rather than the OS keyring. Use `--ephemeral` for disposable runs, `--ignore-user-config` to skip `config.toml`, and `--ignore-rules` to skip user and project execpolicy rules:

```bash
env -i \
  HOME="$root/home" \
  PATH="$PATH" \
  CODEX_HOME="$root/codex" \
  codex exec --ephemeral --ignore-user-config --ignore-rules --json \
  -c 'cli_auth_credentials_store="file"' \
  --sandbox read-only --model <model> "<context packet>"
```

For a continuable first run, omit `--ephemeral` and retain `$root/codex`. Resume with the same config and rule exclusions, credential-store override, and sandbox:

```bash
env -i \
  HOME="$root/home" \
  PATH="$PATH" \
  CODEX_HOME="$root/codex" \
  codex exec resume --ignore-user-config --ignore-rules --json \
  -c 'cli_auth_credentials_store="file"' \
  --sandbox read-only <thread_id> --model <model> "<context packet>"
```

Codex may refresh tokens in the copied auth file; never copy refreshed credentials back over the host file automatically.
