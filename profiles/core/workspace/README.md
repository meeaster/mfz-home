# Shared AI Development Workspace

This is a shared workspace for human and AI-assisted software work. It provides
a common place to begin broad exploration, work across projects, use accumulated
knowledge, and create new projects without turning all content into one
repository.

## Layout

```text
workspace/
├── AGENTS.md
├── README.md
├── VISION.md
├── docs/designs/
├── repos/
├── services/
├── specs/
├── knowledge/
├── artifacts/
├── references/
├── scratch/
└── worktrees/
```

`VISION.md` is the human-owned north star for the workspace. The remaining root
guidance and designs translate that direction into operating rules and reviewed
structural decisions.

- `docs/designs/` contains accepted and proposed workspace-level designs.
- `repos/` is the home for workspace-managed project repositories.
- `services/` contains independently managed services and operational repositories.
- `specs/` contains independent specification and planning stores.
- `knowledge/` is reserved for source-aware knowledge and wiki repositories.
- `artifacts/` contains mutable outputs that do not belong to a project repository.
- `references/` contains read-only source material used for research and context.
- `scratch/` is available for temporary agent and human exploration.
- `worktrees/` is the conventional location for disposable isolated checkouts.

The workspace root is not a repository. Mindframe-Z renders its guidance from the
active home, and `mfz setup` clones and updates the repositories inside it.
Folder-local instructions describe the contents present in a particular workspace.
