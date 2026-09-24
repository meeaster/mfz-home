# Workspace and coordination

## Establish the effort

- Establish or resume `~/workspace/scratch/orchestrator-workspaces/<effort>/` when substantive investigation, execution, or decisions worth preserving begin. Name the effort for the human's goal and reuse its directory across phases, sessions, and restarts.
- This is the human-approved persistent scratch root for orchestration. Expand `~` to the user's home directory when supplying absolute paths to tools or child briefs. Confirm that the root is outside each writer's active Location and project worktree. Keep session working directories outside it.
- A direct orchestrator uses the root. The Chief assigns independently coordinated scopes under `workstreams/<scope>/`, with the same internal structure. Individual producer assignments do not need an `assignments/` directory.
- Preserve empty `sessions/<session-id>.md` markers for locating an effort across sessions. Reuse a matching workspace; ask only when the intended effort is ambiguous.
- Keep working evidence private and omit secrets. Writable directories grant neither assignment nor project mutation. Persistent storage does not promote working records to durable knowledge; promotion uses an authorized owning workflow.

## Files by purpose

Create files when needed. Keep a useful working record rather than duplicate logs or mandatory empty documents.

| Location | Contents |
| --- | --- |
| `context.md` | Purpose, background, scope, constraints, accepted decisions, material rationale, and open questions |
| `coordination.md` | Active assignments and session IDs, authority, dependencies, blockers, verification status, next steps, and Scribe ownership |
| `index.md` | Paths, contents, relevance, freshness, qualifications, conflicts, and supersession |
| `design.md` | Accepted technical boundaries, responsibilities, flows, interfaces, invariants, and tradeoffs needed across units; no task list or blanket implementation authority |
| `evidence/` | Task-shaped producer results and supporting evidence |
| `learnings/` | Optional concise operational lessons per producer assignment |
| `synthesis/<topic>.md` | Explicitly requested preservation of discussion, reasoning, decisions, alternatives, and uncertainty |
| `sources/` | Assigned raw source captures, when useful |
| `screenshots/` | Selected rendered evidence, when produced |

- Maintain context when meaning changes and coordination when work state changes, including completion and blocker boundaries. Preserve consequential rationale without reproducing the conversation or repeating research summaries across context, coordination, and index files.
- Keep proposals separate from accepted decisions. Place competing designs in their task artifacts until a direction is accepted; label remaining open details in `design.md`.
- Catalog completed material, not placeholders. Index a trivial direct result only if useful for continuation. Use pointers instead of copying producer findings.
- A missing or partial index must be labeled or rebuilt from surviving material. Do not create a newest-result-only catalog that appears complete.

## Assign ownership

- Give substantial producers unique evidence paths and optional learnings paths per assignment. A trivial lookup or bounded continuity check can return directly without a file.
- Require Task Evidence for assigned production or reuse. Internal helpers return to their parent unless separately assigned shared outputs; the parent preserves useful attributed results.
- Producers own their outputs. If a write is blocked, obtain attributed file-ready content and assign a permitted fallback owner. Never bypass a permission denial.
- Apply [human-facing continuity](human-facing-continuity.md) for Scribe ownership and synchronization. Delegated orchestrators maintain their own state directly.

## Route reusable knowledge

- Read each new concise learnings file and index what later tasks it helps. Mark corrections or supersession without editing another producer's account.
- Select relevant context, accepted design, evidence, requested synthesis, and operational learnings for downstream briefs. State material applicability and authority status.
- Explain the assignment's purpose briefly when sufficient. Point to `context.md` for broader understanding instead of making every agent read it or duplicating it inline.
- Release readers only after writes complete. Serialize later updates with dependent reads. Independent judgments receive selected evidence and explicit exclusions, not an unrestricted invitation to inspect other agents' conclusions.

## Preserve source captures

- Assign an exact owner and path when retaining extracted material. Preserve supplied content and format where practical; keep interpretation outside the capture.
- Record origin, extraction time, and material omissions or transformations in the existing evidence note or index. Label partial captures and preserve earlier versions when needed.
- Apply the [screenshot contract](delegation-and-evidence.md#screenshot-evidence) to selected images. Storage alone proves neither accuracy nor acceptance.

## Requested synthesis

- Recommend synthesis only when fuller preservation has concrete value. Wait for human authorization before creating it.
- Preserve the requested scope's goals, decisions and reasons, rejected approaches, corrections, alternatives, and uncertainty. Distill repetition without treating synthesis as necessarily brief.
- Let the coordinator develop conclusions and Scribe record established content. Assign an authoring agent when the requested artifact warrants that role. Ordinary task answers and automatic working-state updates are not synthesis requests.
