# Digest — ai-workspace

## Current State
`~/workspace` is the primary shared launch point for human and AI work. It contains root guidance plus `repos/`, `knowledge/`, and `scratch/`, with a metadata-only root Git repository tracking guidance while excluding nested repositories and working content. Existing repositories remain physically under `~/code`.

The workspace is intentionally minimal. Permissions infrastructure, orchestration, repository migration and discovery, automatic project creation, workspace CLI commands, approval ledgers, broad-home access, and OpenWiki runtime integration remain deferred. OpenCode CLI is the current execution substrate.

## Components
- **Workspace shell** — Root guidance and directories provide the shared operating environment · initialized and synchronized with `origin/main` at commit `d04a91e`
- **Repository placement** — `repos/` is available within the workspace while existing repositories remain under `~/code` · migration is deferred
- **Knowledge** — `knowledge/` is reserved for future Core and Personal wiki repositories, with Work knowledge remaining separate · repository setup and runtime integration are deferred
- **Scratch work** — `scratch/` is freely organizable by agents · available now
- **Continuity** — Mutable session records, inactivity snapshots, threads, and workstreams provide continuity without double-counting sessions · conceptual operating model established
- **Governance** — Explicit tasks authorize work within scope, while agent-initiated consequential work requires planning and final acceptance · operating boundary established
- **Cross-cutting** — Prefer a simple workspace and human approval at consequential boundaries over engineered registries, automation, or broad autonomous authority.

## Direction
Continue using `~/workspace` as the shared launch point without moving existing repositories. Add the planned Core and Personal wiki repositories under `knowledge/` when that knowledge structure is ready. Revisit permissions, orchestration, migration, discovery, workspace commands, automatic project creation, approval ledgers, broad-home access, and OpenWiki integration only when concrete needs justify them.

Use workstreams to organize progress, leave action extraction to a downstream backlog/action agent, and compile task context from relevant wiki content, Core knowledge, source records, and current system state.

## Open Questions
None.

## Key Decisions
- Keep the workspace simple rather than introducing an engineered registry or approval system.
- Use `~/workspace` as the primary shared human/AI launch point, organized around root guidance, `repos/`, `knowledge/`, and `scratch/`.
- Track workspace guidance and metadata in the root Git repository while ignoring nested repositories and working content.
- Keep existing repositories under `~/code` rather than migrating them into the workspace.
- Reserve `knowledge/` for future Core and Personal wiki repositories; keep Personal, Core, and Work knowledge separate.
- Treat raw voice-note transcripts as authoritative over synthesized wiki content, with Core holding reviewed reusable knowledge.
- Allow agents to organize `scratch/` freely.
- Treat explicit human tasks as authorization within their stated scope.
- Require a plan and final acceptance review for agent-initiated durable work, durable reorganizations, repository moves, new projects, deletion, and broad cross-repository changes.
- Maintain sessions as mutable records through watermarks, use inactivity for snapshots rather than permanent closure, and use threads for charter-specific continuity without double-counting sessions.
- Organize progress through workstreams and delegate action extraction to a downstream backlog/action agent rather than ingestion.
- Retain human approval between knowledge-derived proposals and consequential actions.
- Use OpenCode CLI as the current execution substrate while leaving room for a future workflow system.

## Design
```text
~/workspace
├── AGENTS.md
├── README.md
├── repos/       shared repository location
├── knowledge/   future Core and Personal wiki repositories
└── scratch/     agent-organized working area

Existing repositories
└── ~/code       remain physically external

Execution and continuity
OpenCode CLI
    ↓
task-specific context
    ↓
explicit task or approved plan
    ↓
consequential action
    ↓
final human acceptance
```

## Intent
The workspace should become the common place from which human and AI side-project work begins, especially on a computer dedicated to AI development and increasingly autonomous agent work. It should provide enough structure, context, and approval discipline to make that work coherent without requiring a large control system before concrete needs emerge.

## Vision
The workspace may grow into a richer environment with separated knowledge repositories, compiled task context, workstream continuity, repository discovery, orchestration, permissions, and workflow tooling. The vision shifted from a more elaborate architecture toward achieving those capabilities incrementally through a deliberately simple foundation.

## Perspective
The user prefers direct implementation and practical conventions over specifications and infrastructure created in anticipation of future needs. Simplicity is a design constraint: autonomy should expand where it provides clear value, while durable or consequential changes retain explicit human review.

Knowledge should preserve provenance and separation of concerns. Raw transcripts remain authoritative, reviewed reusable material belongs in Core, and Personal and Work knowledge should not be collapsed together. Ingestion should preserve continuity rather than absorb every downstream responsibility.

## Sources
- mindframe-z-specs — `/home/mark/.mindframe-z/stores/mindframe-z-specs`
- voice-notes — `/home/mark/code/voice-notes`
- mindframe-z-personal-home — `/home/mark/code/mindframe-z-personal-home`
- openwiki — https://github.com/langchain-ai/openwiki.git
- wiki-architecture-vision — `/home/mark/code/voice-notes/analysis/wiki-architecture-vision.md`
