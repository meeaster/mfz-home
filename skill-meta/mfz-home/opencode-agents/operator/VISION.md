# Vision

## Problem

Routine operational mutation currently shares the application implementation lane, spending Luna/max on procedural work and making routing less intention-revealing. A separate role must reduce that mismatch without renaming, weakening, or silently redirecting existing worker callers.

## Intended Behavior

`operator` is a native promptless OpenCode subagent for explicitly authorized, bounded non-application mutation whose requirements and procedures are settled. It owns routine configuration, source-control operations, supported CLI workflows, infrastructure and deployment operations, environment preparation, and external-system or operational state changes. The base profile owns its Luna/high assignment.

Routing follows the primary accepted outcome and complexity, not artifact type or whether the work touches files. Straightforward operational scripts and configuration belong to `operator`, as do settled instruction generation, installation, copying, and upstream refresh as supplied without instruction-content judgment. The operator verifies the procedure and result and surfaces customizations or unresolved decisions rather than silently adapting instructions. Behavioral instruction interpretation, evaluation, design, or revision requires explicitly authorized `agent-author` work; read-only analysis does not authorize adaptation, and no mandatory author review accompanies refreshes. Application implementation, OpenSpec implementation, substantive software behavior, focused remediation, difficult implementation investigation, and novel troubleshooting remain with `worker`, prototypes with `prototype`, read-only current-state work with `inspect`, and reported-symptom diagnosis with `triage`.

The parent supplies a self-contained brief with the accepted outcome, settled procedure, exact authority, mutable systems, exclusions, validation, and stop conditions. The operator may make a bounded correction while evidence keeps narrowing within that procedure. It stops with preserved state when the procedure no longer applies, troubleshooting becomes novel or difficult, software behavior becomes the primary outcome, or scope or authority must expand.

The agent inherits OpenCode's provider prompt and ordinary environment, repository instructions, skills, references, and MCP context. It cannot recursively delegate. Acceptance remains with the parent or invoking workflow.

## Success

Coordinators select the base-owned Luna/high `operator` for bounded procedural mutations, retain Personal Luna/max `worker` for substantive software work, preserve exact human authority, and verify returned state independently. Existing native worker callers continue unchanged unless separately authorized.

## Non-Goals

- Renaming or downgrading `worker`.
- Routing by the presence of a file edit.
- Application or OpenSpec implementation, substantive behavior changes, difficult remediation, or novel troubleshooting.
- Granting mutation authority from a read-only request, diagnosis, design, or continuation request.
- Encoding command-specific procedures or destination-specific credentials in the agent body.
- Recursive delegation, independent acceptance, publication, or adjacent external-system changes beyond explicit authority.
