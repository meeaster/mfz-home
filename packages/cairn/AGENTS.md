@VISION.md

# Cairn

- `VISION.md` above is Cairn's north star; read it if it isn't already in your context. Check changes to any part against it, and raise a conflict with the human instead of resolving it yourself. Propose edits to it; don't make them unasked.
- System-level direction for Cairn's skills lives in `VISION.md`. A skill's `AUTHORING.md` keeps its own intent and decisions and may repeat the vision where useful.
- Cairn is the whole system; the catalog is one part. Name parts for what they do, and use "Cairn" alone for the system.

## Layout

- Catalog: `src/` holds the CLI, MCP server, OpenCode plugin, and Claude Code hook; `README.md` documents how they run.
- Skills: `skills/` holds the workflow skills, including `orchestrate` and `design-partner`. Orchestration's design and scenarios are in `docs/orchestrate/` at the repository root; the catalog's design is in `docs/cairn/`.
- `sources/` holds outside material that informs the vision. It is reference, not accepted direction.

## Changing Cairn

- `opencode/plugins/cairn` at the repository root is an ignored installation symlink; edit `src/`. Source changes require a build before the installed CLI, MCP server, or plugin can use them.
- Keep Cairn's designs consistent proactively: when a design change touches one place (the Pencil mock `C:\Users\chewb\OneDrive\Documents\cairn_design.pen`, the design-docs format and its example and template, the renderer, or the UI), find every other place showing the same thing and bring it in line in the same change, including disagreements that predate it. Report any left because the right version is unclear.
