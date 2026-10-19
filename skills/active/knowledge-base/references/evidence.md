# Evidence

Evidence is what was observed in a system that can change, on a given day: what a docs page said, how a repository's code worked at a commit, what an account's route tables held. It stays true as a record of what was seen even after the system changes, so it is never edited. A later look is new evidence.

One file holds one look: a single page read, or a research pass across many origins. Name it `evidence/<yyyy-mm-dd>-<subject>.md`, dated when it was observed.

## Format

```markdown
---
description: How OpenCode V2 loads agents, skills and MCP configuration.
observed: 2026-10-19
---

# OpenCode agent loading

## Findings

- Agent definitions reload in the running server when their file changes. [1]
- MCP servers declared in a project override global ones with the same name. [1][2]

## Origins

1. `docs:opencode.ai` · /v2/docs/agents
2. `docs:opencode.ai` · /v2/docs/mcp · version 2.3.1
```

- **`description`** says what was looked into, so a write-up can find existing evidence before gathering it again.
- **`observed`** is when the look happened. If one origin was looked at on another day, add `observed <date>` to its line.
- **Findings** are plain statements of what was seen, each citing the origins it came from by number. Mark anything inferred.
- **Origins** is a numbered list, one origin per line: an origin key from `origins.md` in backticks, then the locator, and `version` when it has one. A public URL can stand alone instead of a key.
- Copied output (a command's output, a table, an excerpt) can follow the findings under its own heading.

## Record evidence

1. Check whether evidence on the same look already exists: `grep -r "^description:" evidence/`.
2. Write the file as above, adding to `origins.md` any origin it needs.
3. Run `check`.

## Copy in a session file

When an article, a design or another record cites a file from a session folder, a temporary directory or anywhere outside the knowledge base, copy it in as evidence so the citation travels:

1. Copy its content into `evidence/<yyyy-mm-dd>-<subject>.md`, dated when it was produced, adding the front matter above and `from:` naming the session, if any, and the path it was copied from, as you had it (`from: session claude-code:221a… · <path>`). The `from` line is provenance: nothing depends on the path resolving elsewhere, though a tool on the machine that wrote it can match the copy to the original.
2. If it doesn't already list its origins, add an Origins section from what it says it looked at; when it doesn't say, write that in the Origins section rather than guessing.
3. Point the citing record at the new file, and run `check`.
