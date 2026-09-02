# Vision

## Problem

Agent harnesses retain rich session evidence, but their stores are large, version-sensitive, and shaped differently. Broad transcript reads waste tokens, obscure gaps, and can turn a supported narrative into a false claim of complete coverage. Refreshable consumers need deterministic source positions without forcing ordinary archaeology through one fixed extraction format.

OpenCode also stores usage and aggregate cost separately from current model pricing. A cost request needs body-free recursive attribution rather than transcript reconstruction.

## Intended behavior

Agent Sessions is the general session-evidence layer. It locates, outlines, investigates, reconstructs, audits, incrementally reads, and prices sessions through one coverage discipline and native harness semantics.

For OpenCode, current V2 behavior has two deliberate paths:

- Adaptive bounded SQL or authenticated API analysis owns locate, outline, investigate, reconstruct, and audit.
- A narrow deterministic adapter owns parent-and-direct-child snapshot and append-only delta for refreshable consumers.

The OpenCode SQLite path resolves from an explicit path, `OPENCODE_DB`, or the current channel data filename. SQLite opens read-only with WAL and SHM state visible. Unknown paths and non-filesystem backends route to the authenticated API.

The deterministic adapter preserves `session_message.seq` ordering, ancestry and fork provenance, all-history and active-context boundaries, stable message and content locators, privacy exclusions, and compact source and prefix guards. It accepts only verified pure appends. Historical message change, deletion, replacement, topology change, source replacement, or active-context movement requires a full rebuild.

The cost calculator uses only OpenCode V2 projected usage, recursively follows `parent_id`, guards cycles, and estimates current catalog cost by stored provider, model, and variant without selecting content bodies.

Claude Code and unknown harnesses retain their native stores, locators, and incremental semantics. Dependent workflows own artifact form, synthesis, merge, destination, authority, and lifecycle.

## Invocation and boundaries

The model invokes Agent Sessions for prior-session archaeology or cost. Current-session implementation, conversational summaries, handoffs, durable knowledge, threads, and artifact creation remain with their owning workflows.

The skill reads sources only. It never migrates, repairs, vacuums, edits, or deletes a session store. It excludes reasoning bodies, secrets, and irrelevant content.

## Success

A narrow request gets a bounded answer with native locators. An exhaustive request cannot finish with silent gaps. An OpenCode refresh consumer receives a deterministic checkpoint and either an accepted append-only delta or an explicit rebuild result. Cost output includes recursive per-session and per-model estimates and labels current pricing as an estimate rather than billing evidence.

## Non-goals

- Normalizing every harness into one storage schema.
- Making the snapshot adapter the universal analysis interface.
- Treating optional event payload persistence as a complete mutation stream.
- Reading or exposing hidden reasoning.
- Owning Session Briefs, captures, handoffs, or maintained knowledge.
- Reproducing provider invoices or historical prices.
