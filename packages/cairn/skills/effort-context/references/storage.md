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
| `efforts/<slug>/approach.md` | `record` | How this effort goes about its work: accepted technical boundaries, interfaces, sequence, invariants, and tradeoffs, citing a linked design's decisions by ID; no blanket execution authority |
| `designs/<slug>/` | `record`, `deliverable` | A design: the lasting record of what a system is and why (`design.md`, `changes.md`) and the doc built from it. Owned by `design-docs`, named for its subject, and linked to each effort that changes it by membership rather than stored in one effort's folder |
| `efforts/<slug>/index.md` | none | The generated effort view. Read it or `catalog_effort` `show`; Cairn rewrites it |
| `sessions/<harness>/<yyyy-mm>/<root-id>/coordination.md` | `record` | The run's state: the efforts it serves, assignments and session handles, authority, dependencies, blockers, verification, unaccepted proposals, next steps, active role, and writer ownership |
| `sessions/…/<workstream-key>/` | | A delegated orchestrator's workstream, with its own `coordination.md` |
| `sessions/…/conversation.md` | `conversation` | The root session's conversation, exported by Cairn after each turn |
| Other paths from `catalog_location` | `evidence`, `learning`, `source`, `synthesis`, `deliverable`, `other` | Producer responses, operational lessons, raw captures such as message threads and screenshots, requested fuller synthesis, and finished outputs |

A file's efforts come from the session that wrote it, so nothing is copied or moved to join an effort. `catalog_find` returns pointers with titles and descriptions; read the files you need.

## Message threads

An email thread that bears on the work is a `source`: the people's own words, kept so a later session can check what was said without asking the human. Chat threads and ticket comments use the same shape with their own kind.

- **One file per thread per capturing session.** Get the path from `catalog_location` with a topic such as `email-sec-12-customer-ingress`, and describe it as category `source`, titled `Email · <subject>` (`Chat · …`, `Ticket · …`).
- **Later replies.** In the same session, add them to the end of that file. A later session writes its own file holding only the messages since the last capture, with `Continues:` naming the earlier file, and leaves the earlier session's file as it is. A side thread or a new subject starts its own file that points back.
- **Messages oldest first**, each under `## <date> [time] · <sender> (<team or role>)`, in the sender's words. Trim quoted earlier messages and signatures, keeping what the sender added. Name attachments and excerpt the parts that matter.

```markdown
# Email · SEC-12 and customer ingress
- Kind: email
- Thread: <private link or message id>
- People: Alex (Security GRC), Priya (platform lead), the human
- Continues: <earlier capture, when there is one>

## 2026-10-03 09:14 · Alex (Security GRC)
Customer traffic can't terminate inside Shared Tooling. Section 4.2 of SEC-12 is below.

Attachment: SEC-12 section 4.2 (excerpt)
> Customer-originated traffic shall not terminate in an internal-tools enclave.
```

A capture is the raw record, like a meeting transcript. What it settles reaches an effort's records or a design only after the human accepts it, citing the capture and the message: `email 2026-10-03 · SEC-12 and customer ingress (Alex, Oct 3)`.

The root is private working material. Writable storage grants neither project mutation nor publication or promotion authority.
