# Browser Setup

Use an isolated browser for public TradingView pages. Use the user's dedicated
Windows Chrome profile when login, private watchlists, saved layouts, or private
Pine scripts are required.

## Start Agent-Browser

Load the version-matched browser workflow before use:

```bash
agent-browser skills get core
```

For a public page:

```bash
SESSION=$(agent-browser session id --scope worktree --prefix tradingview-public)
agent-browser --session "$SESSION" open "https://www.tradingview.com/"
```

Close isolated sessions when the task ends. Do not close a user-attached Windows
Chrome session.

## Persistent Windows Profile

From Windows PowerShell, launch a dedicated profile without remote debugging for
the first login:

```powershell
& "$env:ProgramFiles\Google\Chrome\Application\chrome.exe" `
  --user-data-dir="$env:LOCALAPPDATA\agent-browser\tradingview-profile" `
  "https://www.tradingview.com/chart/"
```

Complete identity-provider and TradingView login in that window, then close the
profile completely. Relaunch the same profile with debugging:

```powershell
& "$env:ProgramFiles\Google\Chrome\Application\chrome.exe" `
  --remote-debugging-port=9222 `
  --user-data-dir="$env:LOCALAPPDATA\agent-browser\tradingview-profile" `
  "https://www.tradingview.com/chart/"
```

Google may reject login while remote debugging is active. Authenticate in the
normal launch instead of weakening browser security checks.

## Connect From WSL

Try discovery first:

```bash
agent-browser --auto-connect tab
```

When discovery checks only localhost, obtain the Windows gateway and connect to
it directly:

```bash
GATEWAY=$(ip -j route show default | jq -r '.[0].gateway')
curl --silent --show-error --max-time 3 "http://${GATEWAY}:9222/json/version"
agent-browser --cdp "http://${GATEWAY}:9222" tab
```

If WSL cannot reach the gateway, the user runs these commands separately in an
elevated Windows Command Prompt:

```cmd
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=9222 connectaddress=127.0.0.1 connectport=9222
```

```cmd
netsh advfirewall firewall add rule name="WSL Chrome Debug" dir=in action=allow protocol=TCP localport=9222
```

Verify `/json/version` before retrying agent-browser. Do not print cookies,
profile contents, or authentication storage while diagnosing connectivity.

## Make TradingView Controls Visible

TradingView hides the right sidebar and some chart legend controls in a narrow
viewport. Before searching for missing controls:

```bash
agent-browser --cdp "<cdp-url>" set viewport 1440 900
agent-browser --cdp "<cdp-url>" snapshot -i -c
```

Re-snapshot after opening a menu, dialog, layout, symbol, or sidebar because
element refs become stale.
