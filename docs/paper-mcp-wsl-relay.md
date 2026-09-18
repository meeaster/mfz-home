# Paper MCP WSL relay

The Personal profile runs a loopback TCP relay for Paper Desktop's MCP endpoint. The relay listens on `127.0.0.1:29979` in WSL and forwards raw bytes to port `29979` on the WSL default IPv4 gateway. It does not rewrite HTTP headers, so Paper receives the configured `Host: 127.0.0.1:29979` value.

## Windows prerequisites

Paper Desktop must run with a design file open. Windows must forward the current WSL gateway port `29979` to Paper Desktop at `127.0.0.1:29979`. A narrow Windows firewall rule must allow that WSL traffic.

MFZ does not create or update the Windows port proxy, firewall rule, or WSL networking mode. Keep those settings outside this repository. If WSL mirrored networking is unavailable, keep the Windows forwarding target aligned with the gateway that WSL reports.

## Start and inspect the relay

MFZ renders the source files with `mfz apply --target dotfiles`. MFZ does not reload or start user services.

```sh
systemctl --user daemon-reload
systemctl --user enable --now paper-mcp-relay.service
systemctl --user status --no-pager paper-mcp-relay.service
systemctl --user is-enabled paper-mcp-relay.service
journalctl --user -u paper-mcp-relay.service -n 50 --no-pager
ss -H -ltnp 'sport = :29979'
```

The listener must be `127.0.0.1:29979`. The service discovers the gateway once at startup and records the selected address in the journal. It does not log payload bytes.

To restart after a gateway or Windows forwarding change, run:

```sh
systemctl --user restart paper-mcp-relay.service
```

If the gateway changed, update the Windows forwarding target through the separately managed Windows configuration before restarting the service.

## Check the Paper endpoint

This request does not create an MCP session or mutate a Paper design:

```sh
curl --connect-timeout 1 --max-time 5 --include http://127.0.0.1:29979/mcp
```

With Paper and the Windows forwarding path available, the response is `HTTP/1.1 404 Not Found` with an error description of `Session not found`. A `403 Invalid host` response means the upstream received a different `Host` value or the request did not use the relay URL.

If Paper or the Windows forwarding path is unavailable, the relay keeps its loopback listener and logs the affected connection error or timeout. Restore the external prerequisite and retry the request. Restart the relay when the WSL gateway changes.

## Reconnect OpenCode

The OpenCode V2 service has a location-scoped Paper reconnect route. Send an authenticated `POST` to `/api/experimental/mcp/paper/connect` with the workspace directory, then query `/api/mcp` with the same location. A `204 No Content` response confirms that the reconnect request was accepted, not that the MCP handshake succeeded.

After the status query reports `paper.status=connected`, `opencode mcp list` reports Paper as connected. The `opencode mcp list` command reads status and does not start a new connection. The scoped reconnect refreshes Paper only and does not restart the OpenCode service.

## Remove the relay

Stop and disable the service before removing its source files:

```sh
systemctl --user disable --now paper-mcp-relay.service
readlink -f ~/.config/systemd/user/paper-mcp-relay.service
readlink -f ~/.local/bin/paper-mcp-relay.mjs
```

From the repository root, remove the two rendered symlinks only after verifying that they resolve into the Personal MFZ snapshot. Then remove the matching source files, render the profile, and reload systemd:

```sh
rm ~/.config/systemd/user/paper-mcp-relay.service ~/.local/bin/paper-mcp-relay.mjs
rm profiles/personal/.config/systemd/user/paper-mcp-relay.service profiles/personal/.local/bin/paper-mcp-relay.mjs
mfz apply --target dotfiles
systemctl --user daemon-reload
```

Confirm that `paper-mcp-relay.service` is disabled and that `127.0.0.1:29979` has no relay listener.
