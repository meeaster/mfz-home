# Pencil MCP

The Personal profile runs the pen.dev ("Pencil") desktop MCP server through WSL interop. Each MCP client starts the Windows binary as a stdio child:

```text
/mnt/c/Users/chewb/AppData/Local/Programs/Pen/resources/app.asar.unpacked/out/mcp-server-windows-x64.exe --app desktop
```

The binary attaches to the running Pen app over the `\\.\pipe\pencil-desktop` named pipe, so it must run on Windows; interop lets WSL clients start it directly. Nothing stays running between sessions, no port is opened, and an app update takes effect at the next client connection. Only clients on this machine can use it.

The server's tools come from the Pen app: `browser`, `execute`, `get_app_state`, `get_style` and `read_skill`. Its design skill is served by `read_skill`, so it updates with the app; MFZ vendors no copy.

## Prerequisites

- The Pen desktop app is running. Without it, the binary starts but can't attach to the named pipe.
- WSL interop is enabled (the default). The command uses the binary's full `/mnt/c` path, so Windows paths don't need to be on `PATH`.

## MFZ catalog and clients

`catalog/mcp.yml` declares `pencil` as a local stdio server with the command above, enabled for `opencode`, `claude-code` and `codex` in `profiles/personal/profile.yml`. Run `mfz apply` after changing the catalog.

A running OpenCode server can keep a cached failure from a previous state. Reconnect it without restarting the server:

```sh
opencode api experimental.mcp.connect --param server=pencil \
  --param 'location[directory]=<workspace directory>'
```

In Claude Code, reconnect `pencil` from `/mcp`.

## Verify

This sends `initialize` and `tools/list` without modifying a document:

```sh
( printf '%s\n' \
    '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"probe","version":"0"}}}' \
    '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
    '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
  sleep 5 ) | timeout 20 /mnt/c/Users/chewb/AppData/Local/Programs/Pen/resources/app.asar.unpacked/out/mcp-server-windows-x64.exe --app desktop
```

Expect an `initialize` result naming the `pencil` server, then the tool list. Its stderr reports `connected to \\.\pipe\pencil-desktop` when the app is reachable.

## Retired Windows bridge

From Sep 25 to Oct 19 2026, a Windows `supergateway` bridge served this server over the LAN at `http://192.168.1.99:7610/mcp`, so another computer could reach it. It ran from `C:\Users\chewb\.pencil-mcp-bridge\` under the "Pencil MCP Bridge" scheduled task, with a firewall rule for port 7610. If any of it remains, remove it from Windows:

```bat
schtasks /end /tn "Pencil MCP Bridge"
schtasks /delete /tn "Pencil MCP Bridge" /f
netsh advfirewall firewall delete rule name="Pencil MCP bridge (LAN)"
rmdir /s /q C:\Users\chewb\.pencil-mcp-bridge
```

The firewall command needs an elevated prompt. `git log -- docs/pencil-mcp-windows-relay.md` has the bridge's full setup if it's needed again.
