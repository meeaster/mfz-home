# Cairn

Cairn keeps the catalog: a SQLite database of sessions, efforts, and pointers to the files and URLs they produce. Files hold the content. The catalog holds descriptions and relationships, and never returns file contents.

The design is in [docs/cairn/design.md](../../docs/cairn/design.md), and the vocabulary is in [TERMINOLOGY.md](TERMINOLOGY.md).

## Installing

The package's skills live in `skills/`: the workflow skills `design-partner`, `orchestrate`, `orchestrate-chief`, `orchestration`, `effort-context`, and `learnings`, and `design-docs`, which keeps the designs that efforts link to and builds their docs. The home catalog selects these directories through explicit root-relative paths. Run `mfz apply` after editing a skill to update its rendered copy. The package tarball also includes the skills.

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

Each export also refreshes the session's harness title, which the catalog shows when nobody has set a title through `session describe` or `catalog_session`. For OpenCode it's the session's title, unless OpenCode still has its `New session - <time>` placeholder. For Claude Code it's a custom title (a `custom-title` entry), then the name the session was started with, then the title Claude Code generates for an interactive session. A session with none of these, such as a `claude -p` run, takes the first line of its first prompt.

## CLI runs

A session started by a headless command, `claude -p` or `opencode run`, is a CLI run: its origin is `cli`, where a session a person works in is `interactive`. When the command ran in another session's shell, the run records that session as its spawner. A spawner is a link, not a parent: the run keeps its own folder, files, and efforts.

- **The marker.** Every agent shell names its session. The Claude Code hook appends `export CAIRN_SESSION=claude-code:<id>` to `CLAUDE_ENV_FILE`, which Claude Code sources before each Bash command. OpenCode sets `OPENCODE_SESSION_ID` in every shell itself, and the plugin removes any `CAIRN_SESSION` an OpenCode shell inherited from further up. A run's spawner is its `CAIRN_SESSION` if set, otherwise its `OPENCODE_SESSION_ID`.
- **Claude Code runs.** The `SessionStart` hook reads the spawner from its own environment, and the origin from `CLAUDE_CODE_ENTRYPOINT`: `sdk-*` is a CLI run. Remote Control sessions are the exception: they also run through the SDK, but `CLAUDE_CODE_ENVIRONMENT_KIND=bridge` marks them, and they're interactive.
- **OpenCode runs.** `opencode run` hands its prompt to the OpenCode service, where the plugin runs, so the plugin reads the command's process under `/proc` instead: an OpenCode executable running `run` in the session's directory, started around when the session was created. A session with no such process came from the TUI or another client and is interactive. Without `/proc`, as on Windows outside WSL, every OpenCode session counts as interactive.
- **Earlier sessions.** `cairn session index` fills in an unknown origin: from the transcript for Claude Code (a prompt a person typed, with `turnOrigin: "human"`, makes it interactive whatever its `entrypoint`), and for OpenCode from whether the TUI ever showed the session (`time_viewed`). Spawners can't be recovered for sessions recorded before this.

## Session cost

Each `cairn session index` of a root session also records the model usage of the session and its subagents: Claude Code's transcript and the subagent transcripts beside it, or OpenCode's session and its child sessions. Usage is kept per session and model, and each call is priced on its own at models.dev API rates, so a context tier applies to the calls that crossed it. Claude Code's one-hour cache writes are priced at twice the input rate, as Anthropic bills them; models.dev lists only the five-minute rate. Calls to a model models.dev doesn't price are counted but left out of the dollars.

The catalog is cached at `pricing/models-dev.json` under the root and fetched again once it's a day old; a failed fetch keeps the cached copy. A model that models.dev knows under another name, such as a LiteLLM gateway's name for the model behind it, is mapped in `pricing/aliases.json`: `{"gateway/opus": "anthropic/claude-opus-5-5"}`, keys as the harness records them, and targets as `<provider>/<model>` or the `session-cost-tui` plugin's `{ providerID, modelID }` form. Re-index after changing it. To bring an older catalog up to date, see [scripts/upgrade/README.md](scripts/upgrade/README.md). A session's cost is worked out when it's shown: its own calls, its subagents' (every session under it), and its CLI runs' (every run its tree started, with their subagents and runs). These are estimates at current API rates, not what a subscription or plan actually bills.


`cairn hook claude-code` reads one Claude Code hook event on stdin and prints the context to add, if any. Point the `SessionStart`, `SubagentStart`, `SubagentStop`, `PostToolUse`, and `Stop` hooks at it:

```sh
cairn hook claude-code
```

- `SessionStart` registers the session, with its origin and spawner (see [CLI runs](#cli-runs)), exports its ID to its shells, and adds its catalog ID to the context. After a compaction it adds the session's efforts and records instead. On a resume it re-exports the conversation.
- `SubagentStart` adds the subagent's `agent_id` to its context as its catalog ID. A subagent becomes a child session, keyed by that ID, once Claude Code has written its `agent-<id>.meta.json`, which happens just after `SubagentStart`; any later event registers it. Claude Code also sends subagent events for internal work that has no metadata file; those events belong to the main session.
- `PostToolUse` records files written with `Write`, `Edit`, `MultiEdit`, or `NotebookEdit`, and files read with `Read`, when they are under the root. The first write of a file adds a note asking the writer to describe it.
- `Stop` exports the conversation in a separate process that outlives the hook.

The hook never fails the harness action. Failures go to `logs/cairn.log` under the root, and the hook exits 0.

## MCP server

Agents use the catalog through a stdio MCP server:

```sh
cairn-mcp
```

It reads `CAIRN_ROOT` the same way the CLI does. It has eight tools:
- `catalog_session`: describe a session and attach it to efforts.
- `catalog_describe`: describe a file, or register a URL, with what an agent read about a Jira item or Confluence page.
- `catalog_find`: find efforts, sessions, or files.
- `catalog_location`: get a path for a new file.
- `catalog_effort`: show or change an effort.
- `catalog_link`: link files or efforts.
- `catalog_origin`: find or register the systems knowledge comes from, with how to reach them.
- `catalog_reference`: record what a knowledge article looked at in an origin, and list an article's references oldest observed first.

The tools return pointers and descriptions, never file contents.

The OpenCode plugin and the Claude Code hooks record sessions and files as they happen.

## OpenCode plugin

The plugin in `src/opencode/` records OpenCode sessions and the files they write or read.

- **Sessions.** Before a session's first model request, the plugin registers it, with its parent, agent, and directory, and for a root session its origin and spawner (see [CLI runs](#cli-runs)). It adds `This session's catalog ID is opencode:<id>.` to the system text, so the agent can pass its ID to the `catalog_*` tools. A subagent's registration finishes before its first request, and its system text also says where its result is saved and names a learnings path granted to it through `cairn location`.
- **Subagent results.** When a subagent finishes, the plugin writes its final message to a file named for the task in the session tree's folder, captures it for the subagent, and adds `Cairn saved this response to <path>.` to the parent's tool result, naming the learnings file too when the subagent wrote one. A background subagent's result arrives through the parent's inbox and is saved the same way, without the note. A follow-up to the same subagent replaces its file. In the background, a small model titles and describes the result (category `evidence`) and any learnings (category `learning`); if that fails, the file stays undescribed. The `describeModel` plugin option picks the model, as `provider/model#variant`; the default is `openai/gpt-6-luna#high`. The saved file names last only as long as the plugin: after a reload, a follow-up starts a new file.
- **Files.** When `write`, `edit`, or `patch` changes a file under the Cairn root, the plugin runs `cairn capture`. The first time a root session writes a given file, the plugin adds a note to the tool result that asks for a description through `catalog_describe`. A subagent gets no note for its learnings file, which is described when it returns. When `read` opens a file under the root, the plugin runs `cairn read`. Files outside the root are ignored, and so are writes from the shell. A shell write to a path from `catalog_location` is credited to the session that asked for the path once anything records the file; `cairn check` finds the rest.
- **Conversations.** After each turn of a root session, the plugin runs `cairn session index`, which appends the turn's messages to `conversation.md` in the session's folder. Subagent sessions get no export.
- **Compaction.** After a compaction, every request carries the session's compaction note: its efforts and the records to read.

Each catalog update is a detached `node` process running the CLI from the same package, so the plugin and the CLI are always the same version. A failure never fails the tool call or the model request.

`CAIRN_ROOT` in OpenCode's environment sets the root. It must match the root the MCP server uses. The default for both is `~/workspace/artifacts/cairn/`.

## UI

`cairn ui` serves a browser UI over the catalog at `http://localhost:4317/`. It runs in the foreground until you stop it with Ctrl+C; start it again to pick up a rebuilt UI. `--port` picks another port.

```sh
cairn ui
```

The sidebar puts the work first (efforts, designs, and every Jira item and Confluence page the efforts registered) and the agents' material after it (sessions, knowledge articles, sources, origins). The sessions list hides CLI runs until its filter asks for them; a session's page lists the CLI runs its shell started. Session lists show each session's total cost; a session's page breaks it down into the session itself, its subagents, and its CLI runs, and shows each subagent's own cost beside its files. An effort's page opens on an overview: where it stands, the designs it delivers with their plan progress, its Jira items as a canvas with one lane per epic and Jira's blocks links as arrows (each lane names the plan deliverable its epic delivers, from the design), its Confluence pages as created or referenced, its other links, and related efforts. Its Material tab groups its files by category, shows its records, and marks each file that has been written up in a knowledge article. The Jira and Confluence page lists them across efforts, filtered by created or referenced. The designs list reads each design's `design.md` for how many decisions are settled and how many questions are open, and says when the published doc is behind `changes.md`. A built doc opens in its own tab from the list: the UI serves `designs/<name>/published/<slug>.html` at `/docs/<name>/`. The sources list shows how far intake has gone: a meeting's accepted, deferred, and rejected candidates, or a thread's messages since `Reviewed through`. A knowledge article opens on its own page: the article rendered, its references grouped by origin or by section with when each was observed and at which version, oldest first, and its efforts. The origins list groups origins by kind, with how to reach each one and how many articles and references rest on it. Clicking a file opens it, rendered or raw.

The UI only reads. Its one action, Open folder, opens a folder under the root in the desktop's file manager (Explorer from WSL). The server listens on 127.0.0.1 and answers only requests addressed to `localhost`. The file viewer shows files under the root, and outside it only files the catalog records.

The app is React with shadcn/ui components, in `ui/`. `pnpm --filter @mfz/cairn build` builds it into `dist/ui/` alongside the CLI. To work on it with reloading, run `cairn ui` (or `node src/cli.ts ui`) for the data, then `pnpm --filter @mfz/cairn dev:ui`; Vite forwards `/api` and `/docs` to port 4317.

## Development

```sh
pnpm --filter @mfz/cairn typecheck
pnpm --filter @mfz/cairn test
pnpm --filter @mfz/cairn build
```

`typecheck` covers the Node sources and the UI. Tests drive the CLI in process against a temporary root, and the UI server's tests call its HTTP interface the same way. No test touches the real root.
