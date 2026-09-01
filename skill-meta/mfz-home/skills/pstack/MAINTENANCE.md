# Maintenance

`opencode/plugins/pstack/UPSTREAM.md` pins the reviewed Cursor source. Compare that subtree before importing updates. Port provider-neutral behavior selectively and preserve the upstream MIT notice.

The plugin's development SDK must exactly match `opencode2 --version`. OpenCode V2 is beta. Check the client version, SDK declaration, plugin list, and live skill discovery before changing versions.

Run the package typecheck and tests, the repository test and typecheck lanes, anti-slop on `opencode/plugins/pstack`, `mfz apply`, `mfz skills list`, `mfz doctor`, and a fresh OpenCode V2 runtime probe.
