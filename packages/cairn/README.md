# Cairn

Cairn keeps the catalog: a SQLite database of sessions, efforts, and pointers to the files and URLs they produce. Files hold the content. The catalog holds descriptions and relationships, and never returns file contents.

The design is in [docs/cairn/design.md](../../docs/cairn/design.md), and the vocabulary is in [TERMINOLOGY.md](TERMINOLOGY.md).

## Running

Cairn runs TypeScript directly on Node 26, with no build step:

```sh
node packages/cairn/src/cli.ts --help
```

`CAIRN_ROOT` sets the folder Cairn manages. Without it, the root is `~/workspace/artifacts/cairn/`. The root holds `catalog.db`, daily copies in `backups/`, session folders in `sessions/`, and effort folders in `efforts/`. Every command accepts `--json`.

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

## MCP server

Agents use the catalog through a stdio MCP server:

```sh
node packages/cairn/src/mcp.ts
```

It reads `CAIRN_ROOT` the same way the CLI does. It has six tools:
- `catalog_session`: describe a session and attach it to efforts.
- `catalog_describe`: describe a file, or register a URL.
- `catalog_find`: find efforts, sessions, or files.
- `catalog_location`: get a path for a new file.
- `catalog_effort`: show or change an effort.
- `catalog_link`: link files or efforts.

The tools return pointers and descriptions, never file contents.

The OpenCode plugin in [`opencode/plugins/cairn/`](../../opencode/plugins/cairn/README.md) records sessions and files as they happen.

## Development

```sh
pnpm --filter @mfz/cairn typecheck
pnpm --filter @mfz/cairn test
```

Tests drive the CLI in process against a temporary root. No test touches the real root.
