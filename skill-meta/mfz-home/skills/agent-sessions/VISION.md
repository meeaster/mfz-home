# Vision

## Problem

Agent harnesses retain rich session evidence, but their stores are large,
version-sensitive, and shaped differently. Unstructured transcript reads waste
tokens, obscure coverage gaps, and can mistake a supported summary for a complete
reconstruction. Artifact-specific workflows also need a shared way to retrieve
session evidence without inheriting one artifact format or lifecycle.
OpenCode's persisted zero or historical cost also cannot answer what a session
and its recursive subagents would cost under a current published model catalog.

## Intended Behavior

Agent Sessions is the general session-evidence layer. It locates, outlines,
investigates, reconstructs, audits, or incrementally reads sessions through a
common coverage discipline and harness-specific adapters. It begins with cheap
structure, spends transcript tokens according to the requested mode, preserves
evidence locators and topology, and exposes incomplete or mutable state.
For OpenCode it can also derive a body-free, per-turn cost estimate from persisted
usage and an explicit models.dev pricing snapshot. The body-free cost adapter
detects validated V1 and V2 SQLite schemas. OpenCode V2 transcript archaeology
remains API-first; V1 SQLite extraction and V2 service API evidence remain
distinct adapters.

Dependent skills may use its evidence to produce briefs, captures, handoffs,
evaluations, or other artifacts. Those skills retain ownership of synthesis,
format, destination, merging, authority, and lifecycle.

## Portability

The core workflow is harness-neutral. Adapters may depend on local harness stores,
CLIs, or standard runtimes and must confirm their live storage shape. Supporting
scripts are optimizations rather than assumptions that every harness shares one
schema.

## Success

A narrow question receives a bounded evidence-backed answer without broad
transcript ingestion. An exhaustive request cannot finish while requested scope
is silently unverified. A dependent workflow can resume from stable, per-stream
creation and update cursors without rereading prior content or missing changed
messages or running tools.
A cost request receives one total plus main-session, descendant-session, and
per-model breakdowns without reconstructing transcript content or pretending
current catalog prices are a historical invoice.

## Non-Goals

- Owning the format or persistence of Session Briefs, handoffs, captures, or
  maintained knowledge.
- Treating every session request as a complete audit.
- Normalizing every harness into one physical storage schema.
- Reading or exposing hidden reasoning.
- Mutating, migrating, compacting, or repairing harness session stores.
- Reproducing large transcript or tool-output bodies when locators and targeted
  evidence answer the request.
- Treating current models.dev prices as authoritative historical billing records
  or provider invoices.
