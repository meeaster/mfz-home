# Maintenance

`opencode/plugins/pstack/UPSTREAM.md` pins the reviewed Cursor source. Compare that subtree before importing updates. Port provider-neutral behavior selectively and preserve the upstream MIT notice.

The initial adaptation deliberately deferred Cursor automation, fixed model roles, transcript tooling, scripts, PR machinery, and UI work. An upstream refresh does not authorize importing those branches; each needs a demonstrated OpenCode use case and its own accepted scope.

The plugin's development SDK must exactly match `opencode2 --version`. OpenCode V2 is beta. Check the client version, SDK declaration, plugin list, and live skill discovery before changing versions.

The plugin README owns executable verification commands. After an authorized runtime change, check package loading and actual skill discovery as well as source checks. OpenCode V2 reloads watched assets; validate in the running session after rendering unless isolation or CLI behavior is the subject of the test.
