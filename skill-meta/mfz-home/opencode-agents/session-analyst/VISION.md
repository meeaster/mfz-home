# Vision

## Problem

Reviewing durable agent sessions needs more than codebase discovery: the agent must load the session-evidence workflow, execute bounded read-only adapters, track coverage across parents and children, and distinguish persisted history from mutable runtime state. Granting these capabilities to `explore` would weaken its intentionally shell-free discovery boundary, while a general execution agent does not reliably select the session-specific workflow.

## Intended Behavior

`session-analyst` is a native OpenCode subagent for locating, outlining, investigating, reconstructing, auditing, comparing, and calculating cost from prior agent sessions. The caller supplies the harness or store, session identity or locating clues, the bounded question, requested coverage, privacy constraints, and expected result.

The agent always loads `agent-sessions`, which owns modes, coverage, harness adapters, privacy, evidence locators, and completion. The agent prompt supplies only the specialist role, read-only evidence boundary, and handoff shape. Permissions deny dedicated mutation tools and delegation while allowing shell composition so the model can adapt queries, pagination, pipelines, and projections to the live source instead of depending on a brittle command allowlist. The prompt and skill govern shell behavior; this is a trusted analytical role, not a shell sandbox.

Luna/high is the initial model policy because deterministic adapters own extraction and the remaining work is bounded evidence analysis. More expensive effort requires representative evidence that High misses material relationships, boundaries, or recommendations.

## Success

Parents can delegate a self-contained session question and receive a compact, evidence-backed result whose inspected scope, completeness, exclusions, mutable state, and gaps are explicit. The child creatively composes the needed read-only evidence path rather than stopping at static instructions or permission syntax, does not ingest irrelevant transcript bodies, and does not create or mutate downstream artifacts.

## Non-Goals

- Replacing `explore` for codebase discovery or `research` for external documentation.
- Editing, deleting, migrating, repairing, vacuuming, or compacting session stores.
- Owning Session Briefs, captures, handoffs, threads, or other artifact lifecycles.
- Recursively delegating work or choosing product and implementation decisions for the parent.
- Defaulting to Luna/max without comparative evidence from representative session tasks.
