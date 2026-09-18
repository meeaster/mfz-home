# OpenPencil MCP WSL relay

The Personal profile runs a loopback TCP relay for the Windows OpenPencil MCP endpoint. The relay listens on `127.0.0.1:7600` in WSL and forwards raw bytes to port `7600` on the WSL default IPv4 gateway. Windows then forwards that connection to OpenPencil at `127.0.0.1:7600`.

The relay does not parse or change HTTP, MCP, or TCP data. It preserves request headers, authentication headers, MCP session IDs, and streamed responses.

## Windows prerequisites

Keep the OpenPencil desktop app and its MCP bridge running on Windows. The bridge must listen on Windows loopback `127.0.0.1:7600`.

Windows must forward the current WSL gateway address on port `7600` to `127.0.0.1:7600`. A narrow Windows firewall rule must allow traffic from the current WSL address.

MFZ does not create or update the Windows port proxy, firewall rule, or WSL networking mode. Keep those settings outside this repository. The gateway and WSL address can change after WSL or network restart.

Authentication is currently disabled in the accepted local setup. Both sides remain loopback-contained, but unauthenticated MCP exposes the local OpenPencil endpoint to local clients that can reach the relay. If you enable OpenPencil authentication, configure a secure OpenCode header source as a separate change before changing the catalog. The relay passes supplied headers through but cannot discover or store an OpenPencil token.

## Start and inspect the relay

MFZ renders the source files with `mfz apply --target dotfiles`. MFZ does not reload or start user services.

```sh
mfz apply --target dotfiles
systemctl --user daemon-reload
systemctl --user enable --now openpencil-mcp-relay.service
systemctl --user status --no-pager openpencil-mcp-relay.service
systemctl --user is-enabled openpencil-mcp-relay.service
journalctl --user -u openpencil-mcp-relay.service -n 50 --no-pager
ss -H -ltnp 'sport = :7600'
```

The listener must be `127.0.0.1:7600`. The service discovers the gateway once at startup and records the selected address in the journal. It logs lifecycle and gateway state only. It does not log payload bytes, headers, tokens, document names, or content.

To restart after a gateway or Windows forwarding change, run:

```sh
systemctl --user restart openpencil-mcp-relay.service
```

## Check the OpenPencil endpoint

This request does not create an MCP session or mutate an OpenPencil document:

```sh
curl --connect-timeout 1 --max-time 5 --include http://127.0.0.1:7600/health
```

With OpenPencil and the Windows forwarding path available, the response is `HTTP/1.1 200 OK` and reports version `0.15.0`. Check `authRequired` without printing or saving a token.

Use the loopback URL for MCP clients:

```text
http://127.0.0.1:7600/mcp
```

The relay forwards Streamable HTTP as raw TCP. The OpenPencil MCP server controls session creation and the `Mcp-Session-Id` response header.

## Recover from address drift

If WSL or networking restarts, inspect the current route and WSL address:

```sh
ip -4 route show default
ip -4 addr show dev eth0
```

If the gateway changed, update the Windows portproxy listen address through the separately managed Windows procedure. If the WSL address changed, update the Windows firewall rule's allowed remote address. Do not edit those Windows settings through MFZ.

After the Windows forwarding path matches the current WSL addresses, restart the relay and repeat the health check:

```sh
systemctl --user restart openpencil-mcp-relay.service
curl --connect-timeout 1 --max-time 5 --include http://127.0.0.1:7600/health
```

The relay does not repair stale Windows forwarding or restart the Windows OpenPencil app. Systemd discovers the gateway again when the relay starts.

## Troubleshoot failures

Check the service state and gateway selected at startup:

```sh
systemctl --user status --no-pager openpencil-mcp-relay.service
journalctl --user -u openpencil-mcp-relay.service -n 100 --no-pager
ip -4 route show default
ss -H -ltnp 'sport = :7600'
```

If the service reports `EADDRINUSE`, another WSL process owns `127.0.0.1:7600`. Identify that process before taking any action. Do not stop an unknown owner.

If health fails through the loopback URL, test the gateway URL without changing the relay:

```sh
gateway=$(ip -4 route show default | awk '$1 == "default" && $2 == "via" {print $3; exit}')
curl --connect-timeout 1 --max-time 5 --include "http://${gateway}:7600/health"
```

If the gateway check fails, inspect the Windows OpenPencil process, Windows loopback health, portproxy, and firewall state. If the gateway check succeeds but the loopback check fails, inspect the WSL relay service and its listener. A `401` or `403` response means that OpenPencil authentication is enabled or the client lacks the required header. Configure secure client credentials separately. Never put a token in this document or in relay logs.

The relay has no post-connect idle timeout. A long-lived streamed MCP response can keep its TCP pair open. The service removes both sockets when a pair errors or closes and removes all pairs during shutdown.

## Remove the relay

Stop and disable the service before removing its source files:

```sh
systemctl --user disable --now openpencil-mcp-relay.service
readlink -f ~/.config/systemd/user/openpencil-mcp-relay.service
readlink -f ~/.local/bin/openpencil-mcp-relay.mjs
```

From the repository root, remove the two managed links only after verifying that they resolve into the Personal MFZ snapshot. Then remove the matching source files, restore the OpenPencil catalog URL if needed, render the profile, and reload systemd:

```sh
rm ~/.config/systemd/user/openpencil-mcp-relay.service ~/.local/bin/openpencil-mcp-relay.mjs
rm profiles/personal/.config/systemd/user/openpencil-mcp-relay.service profiles/personal/.local/bin/openpencil-mcp-relay.mjs docs/openpencil-mcp-wsl-relay.md
mfz apply --target dotfiles
systemctl --user daemon-reload
```

Do not remove or alter the Paper relay, the Windows portproxy, the firewall rule, the OpenPencil app, or the OpenPencil discovery file.
