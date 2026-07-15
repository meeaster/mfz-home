# Codex

Read [ISOLATION.md](ISOLATION.md) first and use its `host_home` and `root` variables.

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
