# Browse guidance

- **Fact:** Browse's agent guide arrives with the MCP server's instructions and the `execute` tool description; `~/.local/bin/browse --help` prints the same guide for terminal use.
- **Fact:** Browse sessions share the relay and browser profile; separate sessions do not isolate global browser state such as cookies, logins, and open windows.
- **Behavior:** Coordinate operations that affect shared browser state.
- **Fact:** The `files` helper inside `execute` reads and writes only under `/tmp`, in directories and files you own without group or world write access. To hand a local file to a script, copy it into a fresh `mktemp -d` directory with mode 600.
- **Fact:** Browse installs to `~/.local/bin/browse`; call it by that path, because xdg-utils ships an unrelated `/usr/bin/browse`.
- **Fact:** Browse updates itself and changes often; trust `--help` and the server instructions over remembered commands. If `~/.local/bin/browse` is missing or broken, run `mise run browse:install`. If the extension is not connected, check `~/.local/bin/browse status`, and run `~/.local/bin/browse pair` to re-pair Windows Chrome.
