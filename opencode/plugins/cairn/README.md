# Cairn plugin

Records OpenCode sessions and the files they write or read in the [Cairn](../../../packages/cairn/README.md) catalog.

- **Sessions.** Before a session's first model request, the plugin registers it, with its parent, agent, and directory. It adds `This session's catalog ID is opencode:<id>.` to the system text, so the agent can pass its ID to the `catalog_*` tools.
- **Files.** When `write`, `edit`, or `patch` changes a file under the Cairn root, the plugin runs `cairn capture`. The first time a session writes a given file, the plugin adds a note to the tool result that asks for a description through `catalog_describe`. When `read` opens a file under the root, the plugin runs `cairn read`. Files outside the root are ignored, and so are writes from the shell. A shell write to a path from `catalog_location` is credited to the session that asked for the path once anything records the file; `cairn check` finds the rest.
- **Conversations.** After each turn of a root session, the plugin runs `cairn session index`, which appends the turn's messages to `conversation.md` in the session's folder. Subagent sessions get no export.
- **Compaction.** After a compaction, every request carries the session's compaction note: its efforts and the records to read.

Each catalog update is a detached `node` process running the Cairn CLI. A failure never fails the tool call or the model request.

`CAIRN_ROOT` in OpenCode's environment sets the root. It must match the root the MCP server uses. The default for both is `~/workspace/artifacts/cairn/`.

Tests: `pnpm exec vitest run opencode/plugins/cairn` from the repository root.
