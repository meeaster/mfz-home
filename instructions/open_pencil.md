# OpenPencil across WSL and Windows

- **Fact:** The OpenPencil app runs on Windows; its MCP server is the WSL user service `openpencil-mcp.service`, which writes the discovery file the app reads. Do not install or start `@open-pencil/mcp` on Windows: the app starts it, and two servers overwrite each other's discovery file.
- **Tool:** Use the WSL `openpencil` CLI. It finds the service through `OPENPENCIL_MCP_DISCOVERY_PATH`, exported by the shell profile. When it reports no discovery file, check the service and that variable; the Windows CLI is no alternative, because it rejects a discovery file written by a WSL process.
- **Behavior:** Give the app Windows-resolvable paths for files it opens or saves: `\\wsl.localhost\<distro>\…`. A Linux path such as `/home/…` makes the app read and write `C:\home\…`. `openpencil documents open` resolves its argument as a Linux path, so send UNC paths as an `open_file` RPC over the service socket (`POST /rpc` with `{"command":"open_file","args":{"path":…}}`).
- **Fact:** Each CLI call is a new session: `switch_page` does not persist, `render` lands on the app's current page, and node searches cover only the current page. Pages the app hasn't loaded report 0 nodes.
- **Tool:** For image fills larger than a few kilobytes, pipe `figma.createImage` code into `openpencil eval --stdin` instead of passing base64 as an argument or tool parameter.
- **Behavior:** Save open documents before restarting the app or the service. Restarting the service drops agents' MCP connections until the client reconnects.
