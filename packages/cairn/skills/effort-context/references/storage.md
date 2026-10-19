# Storage

Cairn keeps working files under its root (by default `~/workspace/artifacts/cairn/`) and a catalog of what each one is. Files hold the content; the catalog holds descriptions, efforts and links. The knowledge base and designs are content folders Cairn tracks but doesn't own: its session context names where each is, and their formats belong to the `knowledge-base` and `design-docs` skills. Expand `~` for tools needing absolute paths.

## Choose a location

1. Honor an explicitly assigned permitted path and writer ownership.
2. For a design, knowledge article, source or evidence the knowledge base keeps, use the designs folder or the knowledge base, named for the subject as their skills describe (`articles/aws-environment.md`, `sources/meetings/2026-10-02-network-working-session/`). These outlive every session and effort, so their paths come from the subject. Look for an existing file on the same subject first and add to it.
3. Otherwise call `catalog_location` with your session's catalog ID (injected at session start) and a short topic named for the content, such as `aws-account-structure` or `pr-123-review`. It returns a new path in the root session's folder and never hands out the same path twice.
4. Add `effort` for an effort's records and other material meant to outlive the session. The path is then in that effort's folder.
5. In OpenCode, Cairn saves a subagent's final message in the session tree's folder and names the subagent's learnings path in its context. A parent assigns paths only for other files an assignment must produce, requesting one path per file. Cairn credits each file to the session that writes it, so the path can come from the parent's session.

Create only needed files. Keep writers' session working directories and project worktrees outside the root; report a conflict rather than changing the session directory implicitly.

## Layout

| Path | Category | Purpose |
| --- | --- | --- |
| `efforts/<slug>/effort.md` | `record` | Where the work stands, as state, starting from [the template](../assets/effort.md): a `## Summary` first (outcome, where it stands, key decisions); the design and phase it serves (the phase by its heading), or without a design the problem, why it matters, and when it's done; the human's views (leanings, concerns, what they ruled out and why); decisions about the work itself, each with who made it and where; open questions with who was asked, when, and through what; pointers to the design, knowledge articles, and key sources |
| `efforts/<slug>/design.md` | `record` | A design local to the effort: something small, or the detail below a stable design, citing its decisions by ID. One connected document for agents and the human: problem and goals, the approach in prose, how it fits together (parts and flows, with a diagram in text), decisions with their reasoning and the alternatives weighed, open questions, and what it rests on |
| `efforts/<slug>/index.md` | none | The generated effort view. Read it or `catalog_effort` `show`; Cairn rewrites it |
| `designs/<slug>/` | `record`, `deliverable` | A stable design: the agreed record of a body of work (what is being built or changed, why it's worth doing, its phases and decisions), shared by the efforts on it and shown to the people who approve it, in `design.json`, `evidence.json`, `meetings.json` and `changes.md`, and the doc built from them. Owned by `design-docs` |
| The knowledge base | `knowledge`, `source`, `evidence` | Articles, sources, evidence and origins, in the `knowledge-base` skill's format. Cairn files each by its folder; describe none of them |
| `sessions/…/<workstream-key>/` | | A delegated orchestrator's files, kept apart from parallel workstreams |
| `sessions/…/conversation.md` | `conversation` | The root session's conversation, exported by Cairn after each turn |
| Other paths from `catalog_location` | `evidence`, `learning`, `source`, `synthesis`, `deliverable`, `other` | Subagent results Cairn saves, operational lessons, raw captures from our own work such as exports and screenshots (see [raw captures](#raw-captures)), requested fuller synthesis, and finished outputs |

Records describe state: what is settled, the human's views, what was said and by whom, and what is still open. Next steps, to-dos, waiting-on lists, planned meetings, and agendas stay out of them; when the human wants a plan, an agent reads the records and proposes one in the conversation, kept as a dated synthesis only when asked. An effort whose records still carry the earlier names `context.md` and `approach.md` is read the same way; rename them with `cairn mv` the next time you write them.

A file's efforts come from the session that first wrote it, so nothing is copied or moved to join an effort. A design, knowledge article, or source that bears on another effort joins it through `catalog_describe` with `efforts.include`. `catalog_find` returns pointers with titles and descriptions; read the files you need.

## Jira items, Confluence pages and other links

The pages and tickets around the work are pointers, not files: Jira owns the work's tracking and Confluence its shared documents, and Cairn records where they are, how they relate to the work, and what an agent last read about them. The UI shows an effort's Jira items as one lane per epic and its Confluence pages as created or referenced, and lists them all on its Jira and Confluence page.

- **Register one when it bears on the work:** a ticket or page created in a session, one the human names, or one a source or design cites. Use `catalog_describe` with its `url`; `category` `deliverable` when the work created it, `source` when it's someone else's the work relies on; a short `title`; a `description` of one sentence saying why it's here; and `efforts.include` for the efforts it bears on. Including it needs no approval, as with sources.
- **Say what you read.** Having read a Jira item through the Atlassian MCP server, pass `jira`: its `key`, `type`, `status`, `category` (`todo`, `progress` or `done`), `parent` epic and the keys it `blocks`. For a Confluence page, pass `confluence`: its `space`, `version` and when it was last `updated`. Each read replaces the last, timed when you made it.
- **Refresh when asked.** For "refresh the Jira items" on an effort, list them with `catalog_find` (`pointer_type` `jira_issue`, the effort), read each through Atlassian, register the stories now under its epics, and describe each again with what you read. Jira's status stays in Jira and in these reads; never copy it into `effort.md`.
- **Content goes through intake.** A page or ticket whose words settle something (a requirement, a ruling, a decision) is saved as a source in the knowledge base like a message thread, naming the version or comment it was read through, and its candidates go through intake. A page that's only referred to stays a pointer.
- **The plan is the design's.** Which Jira items deliver which plan deliverable is recorded in the design (`design-docs`), never in Cairn or `effort.md`; the UI works it out from the design.

## Sources

Meetings, emails, chats, tickets, and documents someone shared come from outside the work. They are sources in the knowledge base, saved in the shapes the `knowledge-base` skill describes, so any session can find them and cite them by date and subject. Include each one in the efforts it bears on. The raw output of our own investigations is evidence, not a source.

What a source settles reaches an effort's `effort.md`, a design, or a knowledge article only after the human accepts it at intake, citing the source and the message or meeting: `email 2026-10-03 · SEC-12 and customer ingress (Alex, Oct 3)`, `meeting 2026-10-02 · Network working session`. Action items stay in the summary that recorded them, with their owners as stated. A question put to someone is recorded with who was asked, when, and through what: in the design when it's about the system, in `effort.md` when it's about the work.

Sources are never edited, so intake adds to their end:

- **A meeting's summary** keeps apart what was discussed, decided in the meeting (with who decided, as stated), suggested and by whom, left open, and the action items with their owners and dates. Everything decided or suggested is a candidate: a colleague's agreement is not the human's decision. When the meeting touched several efforts or designs, group the candidates by the one they concern. An `## Intake` section added at its end when the human goes through the candidates records each as accepted, deferred, or rejected, and where each accepted item went, so nothing is reviewed twice. Candidates for a stable design become proposals on that design's meeting record instead (`design-docs`); the Intake section names the design and its meeting rather than listing them again.
- **A message thread** gets `## Intake through <date> [time]` added at its end after each intake, naming the last message gone through, with what was accepted, deferred, or rejected under it. The next intake starts after it. Later replies go after it.

Saving a meeting or thread writes only to its own files.

## Raw captures

An export, scrape, or screenshot from our own work stays with the evidence it supports.

- Preserve the requested content and format where practical, with interpretation outside the capture.
- Describe each capture as category `source`, with its source message ID or link as `origin`. Record extraction time, transformations, and omissions in its description or beside the evidence that uses it. Label partial coverage and keep earlier versions when they're still needed. Leave out secrets and unrelated sensitive content.

The root is private working material. Writable storage grants neither project mutation nor publication or promotion authority.
