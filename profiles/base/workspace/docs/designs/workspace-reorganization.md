# Portable Workspace Structure

Status: Accepted; the root-repository parts are superseded. The workspace root is
no longer a Git repository: Mindframe-Z renders the root guidance from the active
home's `profiles/<profile>/workspace/` and manages the repositories with
`mfz setup` and `mfz workspace`. The category boundaries below still apply.

## Purpose

The workspace root is a portable coordination surface for human and AI-assisted
software work. It provides stable category boundaries without claiming ownership
of the projects, services, knowledge, references, experiments, or worktrees that
may appear beneath them.

The root repository describes how the workspace works. It does not describe the
current machine's inventory.

## Layout

```text
workspace/
├── AGENTS.md
├── README.md
├── VISION.md
├── docs/
│   └── designs/
├── repos/
├── services/
├── specs/
├── knowledge/
├── artifacts/
├── references/
├── scratch/
└── worktrees/
```

The directory names are conventions, not requirements of a particular tool.
Equivalent locations may be configured on another machine.

## Category Contracts

| Directory | Contract |
| --- | --- |
| `docs/` | Workspace-level designs and structural documentation. |
| `repos/` | Independent project repositories. |
| `services/` | Independent service and operational repositories. |
| `specs/` | Independent specification and planning stores. |
| `knowledge/` | Domain-scoped source, synthesis, and context repositories. |
| `artifacts/` | Mutable outputs that do not belong to a project repository. |
| `references/` | Read-only source material for research and context. |
| `scratch/` | Temporary, unowned research and experimental material. |
| `worktrees/` | Disposable isolated Git worktrees. |

These contracts describe purpose and handling only. They do not prescribe the
names, number, ownership, or contents of child directories.

## Local Guidance

The tracked root `AGENTS.md` defines rules that apply across the workspace.
Each category may also have a machine-local `AGENTS.md` with navigation details,
available tooling, and local handling rules. Category-level guidance is ignored
by the root repository so a checkout can carry local knowledge without coupling
the portable history to one machine.

When entering a category:

1. Read the root guidance and the category-local guidance, when present.
2. Discover the relevant child repositories or artifacts instead of assuming an
   inventory from documentation.
3. Read the child repository's own instructions before inspecting or modifying
   its contents.
4. Preserve the child's authority, provenance, privacy, and Git history.

Missing local guidance is not permission to guess. Use the tracked category
README and repository metadata, and ask when ownership or handling is unclear.

## Root Git Boundary

The root repository tracks only:

- root guidance and the portable workspace README;
- the human-owned workspace vision;
- workspace-level designs;
- stable category README files;
- ignore rules for nested or machine-local material.

Nested repositories retain their own Git history, remotes, validation, and
acceptance workflows. The root must never stage a nested repository merely to
make the filesystem look unified.

The root intentionally ignores category contents, generated indexes, runtime
state, scratch artifacts, worktrees, and category-local `AGENTS.md` overlays.

## Authority And Privacy

Directory placement is a navigation aid, not an authority claim. Each child
repository or artifact retains its own authority and privacy boundary. Source
evidence, derived knowledge, active work state, generated output, and runtime
state must remain distinguishable according to the owning system's rules.

Do not move, copy, combine, or publish material across authority boundaries just
because the material is reachable from one workspace. Follow the child
repository's instructions and obtain review when a boundary changes.

Secrets, credentials, private identities, and mutable runtime state remain out of
the portable workspace unless an owning repository explicitly defines a safe,
managed location.

## Portability Check

A workspace checkout is portable when an agent can:

- understand the category roles from tracked files alone;
- discover local contents without a committed inventory;
- receive machine-specific navigation from ignored category guidance;
- work in a child repository without staging it into the root repository; and
- distinguish workspace policy from child-repository authority.

Changes to these principles belong in a reviewed workspace design. Changes to a
current inventory belong in local guidance or the owning repository, not in the
portable root documentation.
