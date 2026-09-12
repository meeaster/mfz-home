# Vision

## Problem

OpenCode plugins have separate server and native TUI loading paths. Familiar V1 or server patterns can appear valid while failing in the current TUI or rendered package. Plugin failures can also break unrelated services, so an active-plugin listing is too weak a completion test.

## Intended Behavior

The skill makes the current official plugin page the source of API and
server-configuration truth, then uses matching release evidence for the native
TUI contract the page does not document. It supplies only the loader, runtime,
dependency, and verification facts needed for creation, migration, diagnosis,
and review of server and native TUI plugins.

## Success

An agent selects the right current API contract, preserves configuration ownership and requested V1 coexistence, and proves the rendered package works in a fresh server or visible TUI. Event-driven behavior remains bounded after reload and leaves unrelated services healthy. Current release evidence takes priority over remembered loader behavior or an error-message guess.

## Non-Goals

- Caching or reproducing the official plugin API documentation.
- Maintaining V1 plugins except where a requested migration needs coexistence.
- Installing arbitrary dependencies without confirming their runtime boundary.
- Replacing a user or CLI-owned configuration file.
