# Vision

## Problem

Agent harnesses retain rich session evidence, but their stores are large, version-sensitive, and shaped differently. Broad transcript reads waste tokens, obscure gaps, and can turn a supported narrative into a false claim of complete coverage. Refreshable consumers need deterministic source positions without forcing ordinary archaeology through one fixed extraction format.

OpenCode also stores usage and aggregate cost separately from current model pricing. A cost request needs body-free recursive attribution rather than transcript reconstruction.

## Intended behavior

Agent Sessions is the general session-evidence layer. It locates, outlines, investigates, reconstructs, audits, incrementally reads, and prices sessions through one coverage discipline and native harness semantics.

For OpenCode, current behavior has two deliberate paths:

- Adaptive bounded SQL or authenticated API analysis owns locate, outline, investigate, reconstruct, and audit.
- A narrow deterministic adapter owns parent-and-direct-child snapshot and append-only delta for refreshable consumers.

Refresh safety takes priority over salvaging incremental state. A changed historical projection, source, topology, or active-context boundary requires a rebuild rather than a plausible but incomplete merge. Cost requests use body-free usage evidence and current catalog prices.

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
