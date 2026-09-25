# Filesystem storage

This home uses `~/workspace/scratch/orchestrator-workspaces/` as persistent scratch storage. Expand `~` for tools needing absolute paths. Keep writers' session working directories and project worktrees outside the storage root; report a conflict rather than changing the session directory implicitly.

## Choose a location when needed

1. Honor an explicitly assigned permitted path and writer ownership.
2. For an established effort, reuse `<root>/<effort>/`. Locate it from a supplied path or `sessions/<session-id>.md` marker. Ask only when the intended effort is ambiguous.
3. Before effort capture, use `<root>/_sessions/<harness>/<session-id>/evidence/<topic>--<producer-id>.md`. Use the parent session as the storage session when supplied; keep the actual producer identity in the filename or note. Resolve an unavailable session identity from the harness, or choose and return a collision-free local identifier without claiming it is a native session ID.
4. For capture, name a new effort for the human's goal. Reference existing session evidence in its index instead of moving or copying producer files. Preserve prior session markers and add the current one.

Create only needed directories and files. Evidence-only storage creates no `context.md`, `coordination.md`, or ongoing index. Assign unique producer paths and check for existing ownership before writing. Internal helpers need no additional shared path unless independently assigned output.

## Effort layout

| Path | Purpose |
| --- | --- |
| `context.md` | Purpose, scope, constraints, accepted decisions and material rationale, open questions |
| `coordination.md` | Active assignments and session handles, authority, dependencies, blockers, verification, next steps, active role and writer ownership |
| `index.md` | Completed artifacts, paths, relevance, freshness, qualifications, conflicts, supersession, and catalog coverage |
| `design.md` | Accepted shared technical boundaries, responsibilities, flows, interfaces, invariants, and tradeoffs; no blanket execution authority |
| `evidence/` | Task-shaped producer results |
| `learnings/` | Optional operational lessons per producer assignment |
| `synthesis/` | Explicitly requested fuller preservation of discussion and reasoning |
| `sources/`, `screenshots/` | Selected raw captures and rendered evidence |
| `sessions/<session-id>.md` | Empty native-session markers for locating an effort |
| `workstreams/<scope>/` | Independently coordinated scope using the same internal layout |

Use the effort root for direct orchestration and Chief records. Chief assigns workstream directories to delegated orchestrators. Individual producer assignments do not need another directory wrapper.

The root's historical name does not select a workflow. Persistent scratch remains private working material. Writable storage grants neither project mutation nor publication or promotion authority. The future database and MCP catalog are not present; use files and the effort index now.
