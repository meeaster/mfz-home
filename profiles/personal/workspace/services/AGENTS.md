# Local Services

This directory contains the long-lived services and operational repositories on
this machine. Treat each nested repository as an independent authority and load
its own `AGENTS.md` before making changes.

## Service Inventory

### Buzz

- `buzz/source/` is the pristine upstream Buzz application checkout. It owns the
  relay, desktop and mobile clients, CLI, and agent harness source.
- `buzz/production/` is the machine-specific operations repository for the
  private Buzz deployment. It owns Compose overrides, lifecycle automation,
  systemd units, provider integration, and operational runbooks.
- Application behavior belongs in `buzz/source/`; deployment-specific behavior
  belongs in `buzz/production/`.
- Do not start, stop, migrate, restore, upgrade, or cut over the production
  service without an explicit human request.

### Workspace User Services

Definitions under `systemd/user/`:

- `claude-remote-control.service` runs Claude Code Remote Control from the
  workspace and restarts it on failure.
- `opencode-serve.service` runs OpenCode Serve on WSL loopback and restarts it
  on failure.
- `herdr-server.service` runs the Herdr headless server and restarts it on
  failure.

These unit files describe service configuration; the active user units live
under the user's systemd configuration. Do not enable, disable, start, stop, or
restart them without an explicit human request.

## Boundaries

- Keep credentials, private identities, logs, databases, backups, and other
  mutable runtime state outside the workspace unless a service explicitly
  governs them.
- Inspect each affected repository's Git state independently. Never stage a
  nested repository into the workspace root repository.
- Follow the owning service's runbooks for deployment, lifecycle, backup,
  restore, and validation operations.
