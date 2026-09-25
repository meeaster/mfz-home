# Pencil MCP Windows relay

The Personal profile reaches the pen.dev ("Pencil") desktop MCP server over the LAN instead of spawning the Windows MCP binary through WSL interop.

A `supergateway` bridge runs on the Windows host. It connects stdio to the Pen MCP binary and serves MCP Streamable HTTP on `0.0.0.0:7610`. MCP clients use:

```text
http://192.168.1.99:7610/mcp
```

The bridge is Windows-side and is not rendered by MFZ. MFZ owns only the catalog URL and the client entries.

## Why the OpenPencil/Paper relay shape does not apply

OpenPencil and Paper expose HTTP MCP directly, so their "relays" are raw TCP byte pipes from WSL loopback to the app. Pencil's MCP server is **stdio-only** (`mcp-server-windows-x64.exe --app desktop`; no transport, HTTP, or port flags) and attaches to the running Pen app over the `\\.\pipe\pencil-desktop` named pipe. It needs a protocol bridge between stdio and HTTP, not a byte pipe.

The bridge tools are exposed by the Pen app, not by this bridge: `browser`, `execute`, `get_app_state`, `get_style`, `read_skill`.

## Prerequisites (Windows)

- The Pen desktop app is running. The bridge starts a child per MCP session; that child attaches to the Pen app's named pipe.
- Node 26 through the Windows `mise`, plus the bridge:

  ```powershell
  mise use -g npm:supergateway@4.0.0
  ```

- Network: the Windows host is `192.168.1.99`; the work computer reaches it on the LAN.

Authentication is disabled, per the accepted setup. The bridge is reachable by anything on the LAN or tailnet that can route to `192.168.1.99:7610`. Enable it only on a trusted network.

## Install the launcher on Windows

The bridge runs from `C:\Users\chewb\.pencil-mcp-bridge\`. `supergateway` exits when its stdin closes, so a launcher holds stdin open and restarts the bridge.

`C:\Users\chewb\.pencil-mcp-bridge\run.cmd`:

```bat
@echo off
"C:\Users\chewb\AppData\Local\mise\shims\supergateway.exe" --stdio "C:\Users\chewb\AppData\Local\Programs\Pen\resources\app.asar.unpacked\out\mcp-server-windows-x64.exe --app desktop" --outputTransport streamableHttp --stateful --port 7610 --logLevel info >> "C:\Users\chewb\.pencil-mcp-bridge\bridge.log" 2>&1
```

`C:\Users\chewb\.pencil-mcp-bridge\launch.ps1`:

```powershell
$ErrorActionPreference = "Continue"
$cmd = "C:\Users\chewb\.pencil-mcp-bridge\run.cmd"
$wd = "C:\Users\chewb"
while ($true) {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "C:\Windows\System32\cmd.exe"
    $psi.Arguments = "/c `"$cmd`""
    $psi.WorkingDirectory = $wd
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardInput = $true
    $p = [System.Diagnostics.Process]::Start($psi)
    $p.Id | Set-Content "C:\Users\chewb\.pencil-mcp-bridge\bridge.pid"
    $p.WaitForExit()
    Start-Sleep -Seconds 10
}
```

`WorkingDirectory` must be a Windows path. If the shim runs with a WSL working directory, mise reads the WSL configuration and tries to install Linux-only tools.

## Start at logon

```bat
schtasks /create /tn "Pencil MCP Bridge" /sc onlogon /rl LIMITED /f /tr "powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File \"C:\Users\chewb\.pencil-mcp-bridge\launch.ps1\""
schtasks /run /tn "Pencil MCP Bridge"
```

## Firewall (elevated PowerShell or cmd)

```bat
netsh advfirewall firewall add rule name="Pencil MCP bridge (LAN)" dir=in action=allow protocol=TCP localport=7610 profile=private,domain remoteip=192.168.1.0/24
```

Widen `remoteip` only if the work computer is on a different subnet.

## Verify

This request creates an MCP session but does not modify a document:

```sh
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://192.168.1.99:7610/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"probe","version":"0"}}}'
```

Expect `200`. From WSL, the same URL works, so local and remote clients share one endpoint.

## MFZ catalog and clients

`catalog/mcp.yml` declares `pencil` as a remote HTTP server at the URL above, enabled for `opencode`, `claude-code`, and `codex` in `profiles/personal/profile.yml`. Run `mfz apply` after changing the catalog. The rendered shape is a remote URL for OpenCode and an `http` server for Claude Code.

After `mfz apply`, a running OpenCode server can keep a cached `pencil failed: Connection closed` from a previous state. Reconnect it without restarting the server:

```sh
opencode api experimental.mcp.connect --param server=pencil \
  --param 'location[directory]=<workspace directory>'
```

A `204 No Content` reply means the reconnect request was accepted; confirm with `opencode api get '/api/mcp?location[directory]=<workspace directory>'`.

## Troubleshoot

- The bridge exits immediately: stdin closed. Confirm `RedirectStandardInput = $true` in the launcher.
- mise tries to install Linux-only tools: the shim ran with a WSL working directory. Confirm `WorkingDirectory = "C:\Users\chewb"`.
- Connection refused on `192.168.1.99:7610` from the LAN: firewall rule missing, or the scheduled task is not running.
- `bridge.log` shows child errors: the Pen app is not running, or its named pipe is unavailable.

## Remove

```bat
schtasks /delete /tn "Pencil MCP Bridge" /f
netsh advfirewall firewall delete rule name="Pencil MCP bridge (LAN)"
rmdir /s /q C:\Users\chewb\.pencil-mcp-bridge
```

Then revert the `pencil` catalog entry and run `mfz apply`.
