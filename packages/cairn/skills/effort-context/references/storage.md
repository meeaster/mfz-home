# Storage

Cairn keeps working files under `~/workspace/artifacts/cairn/` and a catalog of what each one is. Files hold the content; the catalog holds descriptions, efforts, and links. Get paths from Cairn rather than composing them, and expand `~` for tools needing absolute paths.

## Choose a location

1. Honor an explicitly assigned permitted path and writer ownership.
2. Otherwise call `catalog_location` with your session's catalog ID (injected at session start) and a short topic named for the content, such as `aws-account-structure` or `pr-123-review`. It returns a new path in the root session's folder and never hands out the same path twice.
3. Add `effort` for material meant to outlive the session, such as an effort's records. The path is then in that effort's folder.
4. A parent assigning producer output requests one path per file and gives it in the brief. Cairn credits each file to the session that writes it, so the path can come from the parent's session.

Create only needed files. Keep writers' session working directories and project worktrees outside the root; report a conflict rather than changing the session directory implicitly.

## Layout

| Path | Category | Purpose |
| --- | --- | --- |
| `efforts/<slug>/context.md` | `record` | The work's validated state: a short summary first (outcome, where it stands, key decisions), then purpose, scope, the human's decisions and their rationale, open questions, the human's next actions, and waiting-on items |
| `efforts/<slug>/design.md` | `record` | Accepted shared technical boundaries, responsibilities, flows, interfaces, invariants, and tradeoffs; no blanket execution authority |
| `efforts/<slug>/index.md` | none | The generated effort view. Read it or `catalog_effort` `show`; Cairn rewrites it |
| `sessions/<harness>/<yyyy-mm>/<root-id>/coordination.md` | `record` | The run's state: the efforts it serves, assignments and session handles, authority, dependencies, blockers, verification, unaccepted proposals, next steps, active role, and writer ownership |
| `sessions/…/<workstream-key>/` | | A delegated orchestrator's workstream, with its own `coordination.md` |
| `sessions/…/conversation.md` | `conversation` | The root session's conversation, exported by Cairn after each turn |
| Other paths from `catalog_location` | `evidence`, `learning`, `source`, `synthesis`, `deliverable`, `other` | Producer responses, operational lessons, raw captures and screenshots, requested fuller synthesis, and finished outputs |

A file's efforts come from the session that wrote it, so nothing is copied or moved to join an effort. `catalog_find` returns pointers with titles and descriptions; read the files you need.

The root is private working material. Writable storage grants neither project mutation nor publication or promotion authority.
