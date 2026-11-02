# Workspace Instructions

## Purpose

This workspace is the single place sessions start. A session may begin at the root
or already inside one repository, and it may be any of:

- computer or machine work that belongs to no repository;
- work that spans several repositories;
- brainstorming a new project;
- discussing or planning a feature for an existing repository;
- implementation inside one repository.

These instructions load in both places. At the root they govern the session; inside
a repository, that repository's instructions take precedence for its own work.

Treat `VISION.md` as the human-owned north star for workspace structure and policy.
Check durable structural changes against it.

## Orienting A Session

- Identify the kind of work before searching. Load only the repositories and
  material the goal needs; do not scan the workspace by default.
- Machine or tool work belongs to no repository. Machine configuration has a
  source of truth in the active Mindframe-Z home; change it there, not in rendered
  files.
- Cross-repository work stays at the root. Read each affected repository's
  `AGENTS.md` before changing it.
- Brainstorming a new project happens in conversation and `scratch/`. Creating a
  repository under `repos/` needs approval first.
- Discussing a feature for an existing repository can stay at the root while it is
  talk: read that repository's `AGENTS.md` and docs for context. Before the first
  change, move the session into the repository as the session-location guidance
  describes.
- A session already started inside a repository works there; return to the root
  only when the work turns out to span repositories.

## Layout

- `repos/`: project repositories, including the Mindframe-Z home and engine.
- `services/`: long-lived services and their operational repositories. Change them
  only through their own runbooks.
- `specs/`: specification and planning stores, each its own repository.
- `knowledge/`: source-aware knowledge repositories.
- `artifacts/`: outputs that belong to no repository.
- `references/`: read-only upstream checkouts.
- `scratch/`: temporary work, by month; see `scratch/README.md`.
- `worktrees/`: disposable Git worktrees.

The root is not a repository; every repository owns its own history. Run
`mfz workspace status` for cross-repository status, and `mfz workspace sync` only
when the human asks to update repositories.

Root guidance files, including this one, `VISION.md`, `docs/`, and each folder's
`README.md` or `AGENTS.md`, are links rendered by Mindframe-Z from
`profiles/<profile>/workspace/` in the active home. Edit them there and run
`mfz apply`; edits through the link are overwritten.

## Searching

A root `.ignore` keeps `scratch/`, `references/`, and `worktrees/` out of broad
searches started at the root. Search them by naming the path, such as a reference
checkout from the reference index.
