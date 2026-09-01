# Vision

## Problem

OpenCode V2 plugins have a beta API and separate server and native TUI loading paths. Agents can accidentally apply V1 patterns, misplace plugin-local runtime dependencies, duplicate host-provided dependencies, transfer the server Effect contract to native TUI plugins, register values that fail the host schema, leak event consumers across reloads, recursively react to plugin-owned output, or replace CLI-owned configuration while trying to make a local plugin load.

## Intended Behavior

The skill makes the current official V2 plugin page the source of API and
server-configuration truth, then uses matching release evidence for the native
TUI surface the page does not document. It supplies only the loader, runtime,
dependency, and verification facts needed for creation, migration, diagnosis,
and review of server and native TUI plugins.

## Success

An agent selects the right V2 surface, reads the current API before coding, preserves configuration ownership, makes dependencies resolve from the rendered entrypoint, and verifies fresh server behavior or an executed TUI contribution rather than treating typechecking or plugin status as proof. Plugin-generated values satisfy the matching runtime schema without present-but-undefined optional properties. Event-driven plugins close their exact subscriptions, exclude their own output, remain single-action after reload, and leave model discovery healthy after real execution.

## Non-Goals

- Caching or reproducing the official plugin API documentation.
- Maintaining V1 plugins except where a requested migration needs coexistence.
- Installing arbitrary dependencies without confirming their runtime boundary.
- Replacing a user or CLI-owned configuration file.
