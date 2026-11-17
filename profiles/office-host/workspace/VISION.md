# Workspace Vision

## North Star

This workspace is a portable coordination surface where people and AI agents can
begin exploration, move between independent bodies of work, develop ideas, and
carry useful context forward. It should make varied work coherent without turning
the workspace into one repository, one authority, or a large control system.

The workspace succeeds when a new person or agent can orient quickly, discover
the relevant local context, reach authoritative sources, and act within clear
boundaries without loading or centralizing everything.

## Principles

### Keep The Foundation Simple

Prefer direct conventions that solve demonstrated needs. Add registries,
orchestration, automation, and policy machinery only when repeated concrete work
justifies their cost. The workspace should be useful before it is sophisticated.

### Preserve Independent Authority

Projects, services, specifications, knowledge repositories, external systems,
and source records retain their own authority, provenance, privacy boundaries,
and history. Placement in one workspace improves navigation; it does not transfer
ownership or make the workspace root authoritative for child content.

Derived knowledge, active work, generated output, and runtime state must remain
distinguishable from their sources. Movement across authority or privacy
boundaries should be explicit and reviewed.

### Disclose Context Progressively

Context is a routed resource, not a payload to load in full. Start with compact
orientation, then descend into local guidance, relevant knowledge, designs,
specifications, and source evidence as the task requires.

The workspace should preserve routes to deeper context without forcing every
detail into every session. No particular index, graph, search tool, or retrieval
order is part of the vision; those mechanisms may evolve through use.

### Preserve The Context That Explains Decisions

Durable context should selectively retain intent, rationale, constraints,
assumptions, evidence, decisions, rejected alternatives, unresolved questions,
and meaningful changes over time. It should point to authoritative material
rather than copy complete histories into every artifact.

Sessions, threads, work units, designs, specifications, knowledge, and source
records serve different purposes. Continuity depends on keeping those roles
clear, not collapsing them into one universal record.

### Keep Consequential Action Human-Controlled

Explicit human requests authorize work within their stated scope. Exploration,
captured ideas, and synthesized knowledge may inform proposals, but they do not
silently become commitments or authorize consequential action.

Durable structural changes, changes across authority boundaries, publication,
deletion, and broad automation should remain visible, reviewable, and subject to
human acceptance. Automation may expand where it proves useful while preserving
meaningful opportunities to intervene.

### Treat Isolation As More Than Git

Isolated branches and worktrees separate files and history, but not necessarily
configuration, credentials, caches, services, or other mutable state. Workflows
should make shared state visible and isolate it when interference or risk makes
that necessary.

### Stay Portable

Shared root documents describe stable purposes and principles, not the contents
of one machine. Local inventories, navigation details, and machine-specific paths
belong in machine-specific guidance or in the systems that own them.

Tools, models, harnesses, and physical locations may change. The workspace's
conceptual boundaries and authority model should remain understandable without
depending on a particular implementation.

## Direction Of Growth

The workspace may develop richer continuity, context routing, discovery,
orchestration, permissions, and workflow tooling. Growth should be incremental:

1. Capture an idea or need without treating it as a commitment.
2. Gather the relevant context and authoritative evidence.
3. Produce a reviewable design, proposal, or bounded experiment.
4. Obtain human alignment at consequential boundaries.
5. Implement within the owning system and validate there.
6. Preserve the decisions and context needed for future continuation.

Mechanisms should earn permanence through observed value. The vision does not
require a universal registry, automatic backlog, autonomous project creation,
complete session archive, or single context-retrieval architecture.

## Evolution

This document is the human-owned north star for the workspace. Proposed changes
to workspace structure or policy should be checked against it. When an accepted
direction intentionally expands or departs from this vision, update this document
so it remains an accurate statement of intent.

Detailed structural decisions and their rationale belong in reviewed documents
under `docs/designs/`. The accepted portable workspace structure is described in
[`docs/designs/workspace-reorganization.md`](docs/designs/workspace-reorganization.md).
