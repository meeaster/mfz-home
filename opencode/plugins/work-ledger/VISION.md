# Work Ledger Vision

## Purpose

Work Ledger makes a continuing body of work durable beyond any one AI session. A session can identify the work it belongs to and receive a concise map of the relevant material, while the filesystem retains an inspectable account of the evidence, research, activity, and artifacts that shaped the work.

The ledger should let a future person or agent answer:

- What body of work was this session contributing to?
- What source material was collected, and how was it obtained?
- What research and interpretation were derived from those sources?
- What artifacts were produced or changed?
- Which sessions and delegated agents contributed, and what did they contribute?
- Where can the underlying material be inspected?

Work Ledger is a working name. Its domain language should stabilize through use before the project adopts a more distinctive name.

## Principles

### Grow In Useful Layers

Build the smallest useful capability, use it in real work, and add the next layer only after its need and shape become clear. A broad vision does not justify implementing the whole system at once.

Prefer deterministic capture before model-authored interpretation. When OpenCode already exposes a reliable fact, such as a session relationship or tool invocation, the plugin should record it directly. Ask an agent to synthesize material only when judgment or explanation is actually required.

### Keep Work Independent From Sessions

A work unit is the durable subject. Sessions and subagents are contributors to it, not containers for it. Work must remain discoverable and understandable after sessions end, compact, branch, or multiply.

Attaching a session to a work unit should be explicit and visible. The system may help a person find and select a unit, but it must not silently infer a durable association from incidental activity.

Each session has at most one effective ledger, while any number of sessions may contribute to the same ledger. An explicit session binding takes precedence over inherited context.

Child sessions inherit the nearest explicit binding in their parent-session chain. This rule applies recursively to nested subagents and does not depend on recognizing a particular delegation tool. A child session may explicitly select another ledger. Until a child does so, changes to its ancestor's explicit binding change the ledger that the child inherits.

### Preserve Provenance

Keep raw source material distinguishable from interpretation and produced artifacts.

- Raw evidence should be retained faithfully in an appropriate structured or original format, together with enough retrieval provenance to explain where it came from and how it was obtained.
- Synthesized research should remain readable, cite its sources directly, and state uncertainty where the evidence does not support a firm conclusion.
- Produced artifacts should remain distinguishable from both their inputs and the research that informed them.

An index may connect these materials, but it must not flatten their different authority or provenance.

### Keep The Filesystem Authoritative

Use ordinary, inspectable files as the durable record. The ledger may point to material where it naturally belongs instead of forcing every artifact into one directory. Its index should make those locations discoverable without pretending to own unrelated repositories or source systems.

A database, search service, or derived cache may become useful later, but it must not become the only way to recover the work record.

Personal ledgers belong in the private Personal knowledge repository, where Git can preserve and review their durable content alongside other Personal knowledge forms. Work and other protected material require ledger roots inside their own approved storage and processing boundaries. A configured ledger root must not weaken those boundaries.

Active session bindings, locks, caches, and similar runtime state remain machine-local and outside the ledger repository. Selecting a ledger must not create repository churn or turn a current UI choice into accepted knowledge.

### Supply Context, Not Noise

An attached agent should receive enough awareness to know the active work unit and where its indexes live. It should load deeper evidence only when the current task requires it. The ledger is a map into context, not a demand to place the entire history in every model request.

### Record Activity Without Replacing Judgment

The ledger should make consequential activity traceable, including relevant file changes and delegated-agent work. Mechanical records such as session identifiers, prompts, outputs, and changed paths can coexist with concise authored synthesis explaining why that activity mattered.

Automatic capture must have clear limits and must keep private material local. The underlying work should continue when optional indexing fails.

## Scope Boundaries

Work Ledger is intended to coordinate local work and its provenance. It is not a general project manager, a replacement for Git, a transcript archive for every conversation, or an authority that silently publishes or relocates source material across privacy boundaries.

The vision does not prescribe one permanent schema, directory layout, user interface, or storage engine. Those choices should emerge from tested workflows. OpenCode features such as TUI selection and model guidance provide access to the ledger, but the files remain useful without them.

The abandoned `work-context` implementation is archived history, not a design baseline. Work Ledger starts from this vision and may reuse an idea only after it earns a place in the new model.

## Changing The Vision

Revise this document when accepted direction changes the desired outcome, principles, authority boundaries, or durable scope. Keep implementation status, release plans, schemas, and task lists in their owning artifacts rather than rewriting the vision to mirror the current code.
