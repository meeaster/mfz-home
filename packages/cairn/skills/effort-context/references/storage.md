# Storage

Cairn keeps working files under `~/workspace/artifacts/cairn/` and a catalog of what each one is. Files hold the content; the catalog holds descriptions, efforts, and links. Expand `~` for tools needing absolute paths.

## Choose a location

1. Honor an explicitly assigned permitted path and writer ownership.
2. For a design, knowledge article, meeting, or message thread, use its subject folder from the layout below, named for the subject (`knowledge/aws-environment.md`, `sources/meetings/2026-10-02-network-working-session/`). These outlive every session and effort, so their paths come from the subject. Look for an existing file on the same subject first (`catalog_find`, or the folder itself) and add to it.
3. Otherwise call `catalog_location` with your session's catalog ID (injected at session start) and a short topic named for the content, such as `aws-account-structure` or `pr-123-review`. It returns a new path in the root session's folder and never hands out the same path twice.
4. Add `effort` for an effort's records and other material meant to outlive the session. The path is then in that effort's folder.
5. A parent assigning producer output requests one path per file and gives it in the brief. Cairn credits each file to the session that writes it, so the path can come from the parent's session.

Create only needed files. Keep writers' session working directories and project worktrees outside the root; report a conflict rather than changing the session directory implicitly.

## Layout

| Path | Category | Purpose |
| --- | --- | --- |
| `efforts/<slug>/context.md` | `record` | The work's validated state: a short summary first (outcome, where it stands, key decisions), then purpose, scope, the human's decisions and their rationale, open questions, the human's next actions, and waiting-on items |
| `efforts/<slug>/approach.md` | `record` | How this effort goes about its work: accepted technical boundaries, interfaces, sequence, invariants, and tradeoffs, citing a linked design's decisions by ID; no blanket execution authority |
| `efforts/<slug>/index.md` | none | The generated effort view. Read it or `catalog_effort` `show`; Cairn rewrites it |
| `designs/<slug>/` | `record`, `deliverable` | A design: the lasting record of what a system is and why (`design.md`, `changes.md`) and the doc built from it. Owned by `design-docs` |
| `knowledge/<subject>.md` | `knowledge` | What is known about one existing subject, kept current. A folder `knowledge/<subject>/` when it needs sub-pages or pictures. See [knowledge](knowledge.md) |
| `knowledge/index.md` | none | The generated list of knowledge articles; Cairn rewrites it |
| `sources/meetings/<yyyy-mm-dd>-<subject>/` | `source`, `synthesis` | One meeting: its transcripts and summary. See [meetings](#meetings) |
| `sources/<kind>/<thread>.md` | `source` | One email, chat, or ticket thread (`email/`, `chat/`, `tickets/`). See [message threads](#message-threads) |
| `sessions/<harness>/<yyyy-mm>/<root-id>/coordination.md` | `record` | The run's state: the efforts it serves, assignments and session handles, authority, dependencies, blockers, verification, unaccepted proposals, next steps, active role, and writer ownership |
| `sessions/…/<workstream-key>/` | | A delegated orchestrator's workstream, with its own `coordination.md` |
| `sessions/…/conversation.md` | `conversation` | The root session's conversation, exported by Cairn after each turn |
| Other paths from `catalog_location` | `evidence`, `learning`, `source`, `synthesis`, `deliverable`, `other` | Producer responses, operational lessons, raw captures from our own work such as exports and screenshots, requested fuller synthesis, and finished outputs |

A file's efforts come from the session that first wrote it, so nothing is copied or moved to join an effort. A design, knowledge article, or source that bears on another effort joins it through `catalog_describe` with `efforts.include`. `catalog_find` returns pointers with titles and descriptions; read the files you need.

## Sources

Meetings, emails, chats, tickets, and documents someone shared come from outside the work. They live under `sources/`, so any session can find them and cite them by date and subject. Include each one in the efforts it bears on. The raw output of our own investigations stays with the evidence it supports.

A source is the raw record. What it settles reaches an effort's `context.md`, a design, or a knowledge article only after the human accepts it at intake, citing the source and the message or meeting: `email 2026-10-03 · SEC-12 and customer ingress (Alex, Oct 3)`, `meeting 2026-10-02 · Network working session`. The human's own actions go to `context.md` under next actions, and other people's under waiting-on.

### Message threads

An email thread keeps the people's own words, so a later session can check what was said without asking the human. Chat threads and ticket comments use the same shape with their own kind.

- **One file per thread**, at `sources/email/<thread>.md` named for its subject, described as category `source` and titled `Email · <subject>` (`Chat · …`, `Ticket · …`). A side thread or a new subject starts its own file that names the one it came from.
- **Later replies** go at the end of the same file, whichever session captures them.
- **Messages oldest first**, each under `## <date> [time] · <sender> (<team or role>)`, in the sender's words. Trim quoted earlier messages and signatures, keeping what the sender added. Name attachments and excerpt the parts that matter.
- **Reviewed through** in the header names the last message gone through at intake, so the next intake starts after it.

```markdown
# Email · SEC-12 and customer ingress
- Kind: email
- Thread: <private link or message id>
- People: Alex (Security GRC), Priya (platform lead), the human
- Reviewed through: <date and time of the last message taken through intake, once one has been>

## 2026-10-03 09:14 · Alex (Security GRC)
Customer traffic can't terminate inside Shared Tooling. Section 4.2 of SEC-12 is below.

Attachment: SEC-12 section 4.2 (excerpt)
> Customer-originated traffic shall not terminate in an internal-tools enclave.
```

### Meetings

A meeting gets a folder, `sources/meetings/<yyyy-mm-dd>-<subject>/`, so its summary stays beside the transcripts it summarizes. Register the recording with `catalog_describe` as a `source` pointer by its URL or path; it is never copied.

| File | Category | Holds |
| --- | --- | --- |
| `transcript-raw.md` | `source` | The raw transcript or notes, unchanged |
| `transcript.md` | `source` | Cleaned: speakers labelled by role, filler removed, nothing added. Link it to the raw one with `informs` |
| `summary.md` | `synthesis` | What the meeting means for the work. Its description is a short abstract, so an effort view listing meetings reads as a digest |

The summary keeps apart what was discussed, what was decided in the meeting (with who decided, as stated), what was suggested and by whom, what was left open, and the action items with their owners and dates. Everything decided or suggested is a candidate: a colleague's agreement is not the human's decision. When the meeting touched several efforts or designs, group the candidates by the one they concern. An **Intake** section, filled in when the human goes through the candidates, records each one as accepted, deferred, or rejected, and where each accepted item went, so nothing is reviewed twice.

Saving a meeting writes only to its folder.

The root is private working material. Writable storage grants neither project mutation nor publication or promotion authority.
