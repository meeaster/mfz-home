# Cairn

Cairn keeps the catalog: a SQLite database of sessions, efforts, and pointers to the files and URLs they produce. Files hold the content. The catalog holds descriptions and relationships, and never returns file contents.

The design is in [docs/cairn/design.md](../../docs/cairn/design.md), and the vocabulary is in [TERMINOLOGY.md](TERMINOLOGY.md).

## Installing

The package's skills live in `skills/`: the workflow skills `design-partner`, `orchestrate`, `orchestrate-chief`, `orchestration`, `effort-context`, and `task-output`, and `design-docs`, which keeps the designs that efforts link to and builds their docs. The home catalog selects these directories through explicit root-relative paths. Run `mfz apply` after editing a skill to update its rendered copy. The package tarball also includes the skills.

Cairn is built into `dist/` and installed from a local tarball; nothing is published. From the repository root:

```sh
mise run cairn:install
```

The task builds the package, packs it, and installs the tarball into `~/.local/share/mfz-packages/`, an ordinary pnpm project outside the repository. It links the two commands, `cairn` and `cairn-mcp`, into `~/.local/bin`, which is on PATH for shells and for the OpenCode service. It also makes `opencode/plugins/cairn` a symlink to the installed plugin, which is where mfz renders the OpenCode plugin from. On another machine, clone the home, run the task, then `mfz apply`.

To iterate without reinstalling:

```sh
mise run cairn:dev
```

It runs `cairn:link`, which points the installed package at `packages/cairn` in the repository, then rebuilds on every change. The CLI picks up a rebuild on its next run, and the MCP server when its client restarts it. OpenCode reloads the plugin when a rebuild changes its file. OpenCode also logs `failed to subscribe … Not a directory` for `opencode/plugins/cairn` at startup, because it can't watch a symlinked plugin folder; reloading doesn't depend on that watch. Run `mise run cairn:install` to go back to the tarball. After switching between the two, or after an install, restart OpenCode or reload the plugin: the switch replaces the folder OpenCode watches.

The build bundles each entry with its dependencies: `dist/cli.js`, `dist/mcp.js`, and `dist/opencode/server.js`. Node won't strip types from files under `node_modules`, so the installed package needs the build. In the repository, `node src/cli.ts` still runs the source directly.

## Running

`CAIRN_ROOT` sets the folder Cairn manages. Without it, the root is `~/workspace/artifacts/cairn/`. The root holds `catalog.db`, daily copies in `backups/`, session folders in `sessions/`, effort folders in `efforts/`, and folders named for their subjects: designs in `designs/`, knowledge articles in `knowledge/` (with a generated `index.md`), and meetings and message threads in `sources/`. Every command accepts `--json`.

A typical sequence, as the harness plugins and agents will run it:

```sh
cairn session start opencode:ses_a1
cairn session start opencode:ses_b2 --parent opencode:ses_a1
cairn location --session opencode:ses_b2 --topic "AWS account structure"
cairn capture <path> --session opencode:ses_b2
cairn describe <path> --category evidence --title "AWS account structure" --description "Accounts and VPCs."
cairn session describe opencode:ses_a1 --title "S3 archive research" --create "Logs archived to S3"
cairn ls logs-archived-to-s3
```

The last command prints the effort view. The same view is written to `efforts/logs-archived-to-s3/index.md`.

After each turn of a root OpenCode session, the plugin runs `cairn session index opencode:<id>`. It exports the human's messages and the assistant's text to `conversation.md` in the session's folder, appending when nothing earlier changed and rewriting after a revert. `--source` names OpenCode's database; without it, Cairn asks `opencode debug paths db`.

For a Claude Code session, `cairn session index claude-code:<id>` reads the session's transcript. `--source` names the transcript file; without it, Cairn looks for `projects/*/<id>.jsonl` under `CLAUDE_CONFIG_DIR` or `~/.claude`. `--last-message <file|->` supplies the turn's final message when the transcript may not hold it yet.

## Claude Code hooks

`cairn hook claude-code` reads one Claude Code hook event on stdin and prints the context to add, if any. Point the `SessionStart`, `SubagentStart`, `SubagentStop`, `PostToolUse`, and `Stop` hooks at it:

```sh
cairn hook claude-code
```

- `SessionStart` registers the session and adds its catalog ID to the context. After a compaction it adds the session's efforts and records instead. On a resume it re-exports the conversation.
- `SubagentStart` registers the subagent as a child session keyed by its `agent_id` and adds that ID to the subagent's context.
- `PostToolUse` records files written with `Write`, `Edit`, `MultiEdit`, or `NotebookEdit`, and files read with `Read`, when they are under the root. The first write of a file adds a note asking the writer to describe it.
- `Stop` exports the conversation in a separate process that outlives the hook.

The hook never fails the harness action. Failures go to `logs/cairn.log` under the root, and the hook exits 0.

## MCP server

Agents use the catalog through a stdio MCP server:

```sh
cairn-mcp
```

It reads `CAIRN_ROOT` the same way the CLI does. It has six tools:
- `catalog_session`: describe a session and attach it to efforts.
- `catalog_describe`: describe a file, or register a URL.
- `catalog_find`: find efforts, sessions, or files.
- `catalog_location`: get a path for a new file.
- `catalog_effort`: show or change an effort.
- `catalog_link`: link files or efforts.

The tools return pointers and descriptions, never file contents.

The OpenCode plugin and the Claude Code hooks record sessions and files as they happen.

## OpenCode plugin

The plugin in `src/opencode/` records OpenCode sessions and the files they write or read.

- **Sessions.** Before a session's first model request, the plugin registers it, with its parent, agent, and directory. It adds `This session's catalog ID is opencode:<id>.` to the system text, so the agent can pass its ID to the `catalog_*` tools.
- **Files.** When `write`, `edit`, or `patch` changes a file under the Cairn root, the plugin runs `cairn capture`. The first time a session writes a given file, the plugin adds a note to the tool result that asks for a description through `catalog_describe`. When `read` opens a file under the root, the plugin runs `cairn read`. Files outside the root are ignored, and so are writes from the shell. A shell write to a path from `catalog_location` is credited to the session that asked for the path once anything records the file; `cairn check` finds the rest.
- **Conversations.** After each turn of a root session, the plugin runs `cairn session index`, which appends the turn's messages to `conversation.md` in the session's folder. Subagent sessions get no export.
- **Compaction.** After a compaction, every request carries the session's compaction note: its efforts and the records to read.

Each catalog update is a detached `node` process running the CLI from the same package, so the plugin and the CLI are always the same version. A failure never fails the tool call or the model request.

`CAIRN_ROOT` in OpenCode's environment sets the root. It must match the root the MCP server uses. The default for both is `~/workspace/artifacts/cairn/`.

## UI

`cairn ui` serves a browser UI over the catalog at `http://localhost:4317/`, until you stop it. `--port` picks another port.

```sh
cairn ui
```

It has a page for each effort and session and lists of efforts, sessions, knowledge articles, designs, and sources. The sidebar groups efforts by their `initiative:` tag. An effort's page groups its files by category, shows its records and linked efforts, and marks each file that has been written up in a knowledge article. The designs list reads each design's `design.md` for how many decisions are settled and how many questions are open, and says when the published doc is behind `changes.md`. The sources list shows how far intake has gone: a meeting's accepted, deferred, and rejected candidates, or a thread's messages since `Reviewed through`. Clicking a file opens it, rendered or raw.

The UI only reads. Its one action, Open folder, opens a folder under the root in the desktop's file manager (Explorer from WSL). The server listens on 127.0.0.1 and answers only requests addressed to `localhost`. The file viewer shows files under the root, and outside it only files the catalog records.

The app is React with shadcn/ui components, in `ui/`. `pnpm --filter @mfz/cairn build` builds it into `dist/ui/` alongside the CLI. To work on it with reloading, run `cairn ui` (or `node src/cli.ts ui`) for the data, then `pnpm --filter @mfz/cairn dev:ui`; Vite forwards `/api` to port 4317.

## Development

```sh
pnpm --filter @mfz/cairn typecheck
pnpm --filter @mfz/cairn test
pnpm --filter @mfz/cairn build
```

`typecheck` covers the Node sources and the UI. Tests drive the CLI in process against a temporary root, and the UI server's tests call its HTTP interface the same way. No test touches the real root.
