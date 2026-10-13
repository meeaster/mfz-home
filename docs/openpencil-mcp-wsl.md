# OpenPencil MCP in WSL

OpenPencil runs on Windows. Its MCP server runs in WSL as a user systemd service. OpenPencil reads `%USERPROFILE%\AppData\Local\OpenPencil\mcp.json` and connects to `http://127.0.0.1:7600`. The WSL service writes discovery metadata to that Windows path through `/mnt/c` and listens on WSL loopback port `7600`. WSL localhost forwarding carries the Windows connection to the service.

The Personal base mise profile pins `@open-pencil/mcp` to `0.16.0-beta.3`. The systemd unit sets `OPENPENCIL_MCP_APP_TIMEOUT_MS=0` so the service stays up while the editor is closed. Authentication remains disabled for this loopback-only setup. Any local process that can reach port `7600` can call the MCP server. The base mise profile applies a one-day release-age limit to npm dependencies. Start WSL and confirm the service is active before launching OpenPencil. If the WSL server is unavailable, OpenPencil may start the installed Windows MCP package instead.

## Install and start the service

Run these commands from WSL after changing the mise or systemd source files:

```sh
mfz apply --target mise
mise install 'npm:@open-pencil/mcp@0.16.0-beta.3'
mfz apply --target dotfiles
systemctl --user daemon-reload
systemctl --user enable --now openpencil-mcp.service
```

Check the service and package version:

```sh
systemctl --user status --no-pager openpencil-mcp.service
mise exec -- openpencil-mcp-http --version
ss -H -ltnp 'sport = :7600'
```

The listener should be `127.0.0.1:7600`. Check health from WSL:

```sh
curl --connect-timeout 1 --max-time 5 http://127.0.0.1:7600/health
```

Check the same endpoint from Windows PowerShell:

```powershell
Invoke-RestMethod http://127.0.0.1:7600/health
```

`status: "no_app"` means the MCP server is running but OpenPencil has not attached. `status: "ok"` means the editor bridge is connected.

## OpenCode connection

OpenCode uses the WSL loopback endpoint:

```text
http://127.0.0.1:7600/mcp
```

The service writes its discovery file directly to the location OpenPencil checks. Do not copy `mcp.json` by hand. The file is generated runtime metadata and may contain an authentication token if authentication is enabled later. Do not commit or sync it.

## Stop the service

```sh
systemctl --user disable --now openpencil-mcp.service
```

The previous `openpencil-mcp-relay.service` and Windows port-proxy path on port `7601` are not part of this setup. Keep machine-local Windows port-proxy and firewall changes outside MFZ unless you remove them separately.
