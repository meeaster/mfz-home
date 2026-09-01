# `mindframe-z-work-ledger`

Binds an OpenCode V2 session to a filesystem ledger and gives child sessions the nearest explicit ancestor binding.

## Configure

Enable both the `./server` and `./tui` entrypoints with the same absolute ledger root. Mindframe-Z renders these entries from `opencode_v2.plugins`, `opencode_v2.tui_plugins`, and `opencode_v2.plugin_options`.

```yaml
opencode_v2:
  plugins:
    - work-ledger
  tui_plugins:
    - work-ledger
  plugin_options:
    work-ledger:
      root: ~/workspace/knowledge/personal-knowledge/ledgers
```

Requires OpenCode V2 `0.0.0-beta-17595`. Each immediate, visible directory under `root` is one available ledger.

## Use

- Open the command palette with `ctrl+p` and run **Work Ledger: Select**.
- Select a ledger to bind the current session explicitly.
- Select **No active ledger** to clear the current session's explicit binding. A child then returns to its nearest inherited binding, if any.
- Restarting OpenCode preserves explicit bindings under `~/.mindframe-z/work-ledger/bindings/opencode/`.

The server adds only the effective ledger name, absolute path, and explicit or inherited source to model context. It does not load ledger contents.

## Local development

Mindframe-Z configures OpenCode to load this package's repository TypeScript source directly, so package-local dependencies resolve normally and local development does not require a bundle.

After editing the package, run:

```bash
pnpm --filter mindframe-z-work-ledger check
```

Run `mfz apply` after changing the package manifest or profile configuration. Restart the OpenCode V2 service after server changes. Open a fresh wide TUI after TUI changes so the `app` slot mounts and the command registers.
