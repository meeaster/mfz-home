---
name: agent-desktop
description: Operate Windows desktop apps from WSL with the agent-desktop CLI. Use only when the user explicitly asks for agent-desktop.
---

# agent-desktop

`agent-desktop` reads and operates desktop apps through the OS accessibility tree. Here it is the Windows build, run from WSL, so it sees Windows apps; WSLg apps are out of its reach.

## Setup

1. If `agent-desktop` is missing or outdated, run `mise run agent-desktop:install`. It installs the Windows release into `%LOCALAPPDATA%\Programs\agent-desktop` and links `~/.local/bin/agent-desktop`.
2. Load the guides that match the installed version, and follow them: `agent-desktop skills get desktop` and `agent-desktop skills get platform`. Output is a JSON envelope; the guide is `data.content`, with CRLF line endings.

Setup is done when both guides are loaded.

## WSL gotchas

- Paths the CLI reads or writes are Windows paths. Convert with `wslpath -w` and `wslpath -u`.
- Packaged (UWP) apps such as Calculator run as their own image (`CalculatorApp.exe`) inside `ApplicationFrameHost.exe`. `list-windows` shows the real image name and window id; target with `--window-id`. `close-app` reports `APP_NOT_FOUND` for these, so close them with the window's own close button.
- Bash needs no quoting for `@` refs.
