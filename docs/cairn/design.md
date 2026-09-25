# Cairn design (draft)

This document turns the later storage-service discussion in [modular workflows](../orchestrator/modular-workflows/design.md#later-storage-service) into a design that can be built. Terms follow [TERMINOLOGY.md](../../packages/cairn/TERMINOLOGY.md). The design was worked out in a design-partner session on 2026-09-24 and 2026-09-25. Decisions attributed to the human were stated or accepted by the human in that session. Everything else follows from those decisions. [How the design evolved](#how-the-design-evolved) records the proposals that were replaced, so they aren't proposed again. [Continuation](#continuation) records the working state for the next session.

Cairn is named after the stacked stones that mark a trail: markers that point the way without being the destination. The name covers the package, CLI, MCP server, plugin, environment variable, and storage root. The database of pointers is still called the catalog, and the MCP tools keep the self-describing `catalog_` prefix.

## Purpose

Agents and the human need a shared, queryable record of the work done across sessions: what was produced, what it establishes, and which body of work it serves. The same record has to serve orchestration, Chief, design partnership, and ordinary sessions. The human should be able to come back to an effort weeks later, see everything done for it across many sessions, and continue.

Today that record is `effort-context`'s filesystem layout: effort folders, a hand-maintained `index.md`, `sessions/<id>.md` marker files, `workstreams/<scope>/` folders, and pre-capture `_sessions/` evidence. The catalog replaces the manual parts of that layout with a database. It is designed fresh. Earlier experiments (`mfz work`, the `work-ledger` plugin, `mfz thread`) are out of scope and are neither reused nor migrated.

## What it is

The catalog is a pointer layer over files. Files hold the content. A SQLite database holds sessions, efforts, artifacts, descriptions, tags, and relationships. Three things use it:

- **Harness plugins and hooks** record facts with no model involved: sessions and their tree, file writes and reads, and conversation exports. They use a small CLI.
- **Agents** add meaning. They describe sessions and artifacts, attach sessions to efforts, and query for pointers. They use a stdio MCP server.
- **People** browse through the CLI and generated index files, and later through a UI over the same database.

**The catalog never returns file contents.** Queries return pointers with titles and descriptions. Agents read what they need with their own tools.

## Motivating scenarios

These are the human's own examples. The design is checked against them.

1. **A large work program.** Deploying a Datadog observability pipeline into production AWS. It spans many sessions over weeks and several overlapping areas: AWS deployment, ingesting Cisco ASA logs, routing to both Datadog and S3, and possibly exposing it publicly later. Material includes:
   - evidence about the current AWS infrastructure and its security;
   - email threads with the security lead and meetings with a colleague;
   - Confluence pages written to share with people, and Jira items for scheduled work;
   - PRs, quick Markdown notes shared with someone, and synthesis distilled from back-and-forth with the model.

   The human wants to open this later, see everything done for it, and continue. This is work material, so it belongs in a work profile's catalog, not in the Personal one. [The observability pipeline scenario](scenario-observability-pipeline.md) walks through it step by step, including the security approval, Jira tracking, meetings across efforts, and relationships found late.
2. **A session that spans efforts.** One session covers both AWS deployment and log ingestion.
3. **A quick fix or question.** Triage and fix a bug in a repository, ask what a repository does, or commit some changes. None of these should create an effort.
4. **Chief separating design from delivery.** Most Chief sessions concern one thing. Chief holds the design dialogue, and one orchestrator delivers it.
5. **Chief running and looping workflows.** "Go through these five GitHub issues or PRs, review each, and post a comment." Chief runs several instances of a workflow at once or repeatedly, and must not redo items already handled.
6. **Tracing thinking over time.** Main-session conversations are kept, so the human can later ask how their thinking on a topic evolved across sessions.
7. **A future UI.** A management interface over the same database, for browsing initiatives, efforts, and their combined material.

## Settled decisions

| Decision | Source |
| --- | --- |
| Files hold content. The database owns metadata and relationships. No frontmatter or sidecars written by agents. | Modular workflows, correction 5 |
| A producer describes its own work. The orchestrator is not the catalog clerk. | Correction 6 |
| A conversation is a Markdown export with a database pointer. | Correction 7 |
| MCP runs over stdio, and a small CLI serves plugins, hooks, and people. A network API is optional and comes later. | Correction 8 |
| The service owns the root folder. The model never has to perform a session-start operation. | Correction 9 |
| The catalog is designed fresh around these workflows. `mfz work`, `work-ledger`, and `mfz thread` are out of scope. | Human |
| It is its own package, `packages/cairn/` in `mfz-home`, containing both the CLI and the MCP server, separate from the Mindframe-Z runtime. | Human |
| Plugins do the deterministic work: sessions, captures, and exports. Agents describe. | Human |
| The session comes first. Every session is recorded. Efforts are optional, and a session can attach to several of them. | Human |
| Only scoped work (research, exploration, design, building) gets attached to an effort. Quick questions and one-off commits stay unattached. | Human |
| Efforts are flat and organized with tags. Hierarchy can be added later. | Human |
| An effort view aggregates everything from all of its sessions. Grouping by session is optional. | Human |
| The catalog doesn't prescribe file names. Any file written under the root is captured and then described. Record names belong to the skills. | Human |
| Records split by what they describe. The work's state (`context.md`: purpose, scope, decisions and rationale, open questions; plus an optional `design.md`) lives in the effort's folder. The run's state (`coordination.md`: assignments, blockers, next steps, workstreams) lives in the root session's folder. | Human, 2026-09-25 |
| After compaction, the plugin re-injects the session's attached efforts with their record paths, plus the session's `coordination.md` path. | Human, 2026-09-25 |
| An effort is an outcome, such as a feature or a capability, and not a phase. Design, implementation, review, and follow-up fixes attach to the same effort. Where the work stands lives in `context.md` and in session descriptions, not in a phase field. | Human, 2026-09-25 |
| Work funnels into the current effort. Splitting is explicit, keeps the original's history, and adds `split_from`. There are no parts in the schema. Efforts relate through `depends_on`, `split_from`, and `related` links. Tags are for filtering, and `initiative:` is optional. Sessions attach where the work lands. A reading scope applies: attached efforts are read in full, linked efforts only by summary. See [effort relationships](#effort-relationships-and-splitting). | Human, 2026-09-25 |
| `context.md` holds only validated state: decisions the human made in working sessions, or items the human accepted at intake. External input (meetings, emails, other people's notes) stays in its own artifacts until the human deliberately promotes it. A meeting is kept as its raw source, a cleaned source, and a summary that separates what was decided, suggested, left open, and assigned. | Human, 2026-09-25 |
| Records for v1: the AI maintains `context.md` and `design.md` in the effort's folder, through Scribe or the orchestrator directly, and `coordination.md` in the root session's folder. Cairn generates only `index.md` and doesn't generate an agent brief. There are no size budgets. Size is kept in check by curation (edit in place, remove what's no longer live) and by what each role reads, and the effort view shows record sizes. A curated layer maintained by the human with AI is a future direction. | Human, 2026-09-25 |
| Nothing in `~/workspace/scratch/orchestrator-workspaces/` is moved or imported automatically. Once Cairn works, a trial may bring one effort over to see how it looks. | Human, 2026-09-25 |
| Evidence from before a session attached is found through the catalog (`cairn ls`, the effort index), not moved. | Human |
| The root is `~/workspace/artifacts/cairn/`. Revisit after use. | Human |
| The name is Cairn. MCP tools keep the `catalog_` prefix, because models choose tools by name. | Human, on the assistant's recommendation |
| Durability comes from a daily copy of the database. A text snapshot may come later. | Human, 2026-09-25 (replacing the earlier text-snapshot decision) |
| Vocabulary is fixed in `TERMINOLOGY.md`. | Human |

## Domain model

```text
            attaches (many-to-many)
  session ─────────────────────────▶ effort ──── tags (initiative:…, repo:…, system:…)
  │  ▲                                  ▲
  │  └ parent (session tree)            │ explicit membership (optional)
  │                                     │
  └── produces ──▶ artifact ────────────┘
                  file | external file | URL
                  category, title, description
```

### Sessions

Every session is recorded when it starts, with its parent if it's a child session. Files written anywhere in a session tree have their home in the root session's folder. The root session is described (title and description) once it has substance, and that description labels its conversation export.

The harnesses identify child sessions differently. An OpenCode subagent runs in its own session with a `parentID`. A Claude Code subagent has no session of its own: it shares the parent's `session_id`, and hooks identify it by `agent_id`. The catalog records a Claude Code subagent as a child session `claude-code:<agent_id>` whose parent is `claude-code:<session_id>`, so both harnesses produce the same session tree.

### Efforts

An effort is a named body of work you want to come back to. There is no nesting. A session attaches to any number of efforts, and an effort gathers any number of sessions. A session that covers both AWS deployment and ASA ingestion attaches to both.

An artifact's membership in an effort is derived: the artifact belongs to the efforts of the nearest session in its producer's ancestry that has any attachment, starting with the producer itself. So an unattached explore subagent's evidence joins its root session's efforts, while a delegated orchestrator attached to its own effort doesn't also feed Chief's. A file written into an effort's folder also belongs to that effort. When that's too broad, an agent can set membership explicitly for one artifact, either restricting it to some of the session's efforts or adding another effort.

### Tags instead of hierarchy

Tags are `namespace:value` strings on efforts. Artifacts don't take tags in v1, because their category, efforts, and description already cover the uses that came up. A few namespaces are conventional:

| Namespace | Use | Example |
| --- | --- | --- |
| `initiative:` | Optional label for a larger program. A cluster of linked efforts already forms one. | `initiative:observability-pipeline` |
| `repo:` | Repositories touched | `repo:infra-terraform` |
| `system:` | Systems or services involved | `system:aws`, `system:datadog` |
| `person:` | People involved, by role | `person:security-lead` |

Tags are for filtering. Relationships between specific efforts are [links](#effort-relationships-and-splitting).

**Why tags for v1:** grouping is expected to keep changing, and a session or effort can relate to several groups at once. Tags handle both without schema changes. The UI concern is met by namespaces. A future UI can treat `initiative:` values as a grouping level (initiatives, then their efforts, then aggregated artifacts) without a hierarchy in the schema. If a real parent relationship becomes necessary, and each effort has at most one `initiative:` tag, converting tags to parents is a mechanical migration.

### Effort relationships and splitting

The human settled these on 2026-09-25, from the observability example. Structure emerges as work is explored and can't be planned:
1. "Get logs into S3" became research on the AWS account structure. That found Datadog Observability Pipelines Worker (OPW), then questions about hosting it, then EC2 deployment and security approval.
2. Cisco ASA ingestion arrived separately and turned out to be best served by reusing OPW, which widened OPW's scope to transit gateways and VPCs.
3. Customer-device logs then raised the question of a public OPW behind an authorization layer, or a relay through the product server.

The rules:
1. **Work funnels into the effort you're in.** A new session resumes the matching effort through `catalog_find`, so research, design, and implementation accumulate in one effort. Naming the effort for its outcome ("Logs archived to S3") keeps it stable when the approach changes, because the approach (OPW) is a decision in `context.md`.
2. **No parts in the schema.** Parts are prose in `context.md`. Labeling sessions with parts requires knowing the parts in advance, which you don't.
3. **Splitting is explicit.** An agent may suggest a split, and the human decides. Signs that a piece should split off:
   - it has its own approval or delivery;
   - other efforts need only that piece;
   - its sessions no longer concern the rest of the effort.

   `catalog_effort` with `split` creates the new effort, adds a `split_from` link, and includes the chosen existing sessions and files. It removes nothing from the original. New sessions for that piece attach to the new effort. The original keeps its remaining scope. After the OPW deployment splits off, "Logs archived to S3" still owns the destination design: bucket layout, prefixes and partitioning, retention, encryption, and the permissions that writers get.
4. **Links between efforts carry relationships.** The relations are `depends_on` (A needs B), `split_from`, and `related`. Links are read in both directions, so add a `depends_on` only in the blocking direction and never add the reverse. When two efforts would depend on each other, split out the shared piece if it has its own life. Otherwise keep one direction and let the other effort read through the link. Relationships found late, such as ASA deciding to reuse OPW, become links when they're found.
5. **Attach where the work lands.** A session attaches to every effort whose state it changes, and records each decision in that effort's `context.md`. The ASA session that widened OPW's scope attaches to the OPW deployment effort too. A session that only needs background reads a linked effort without attaching, so its files don't flood that effort's view.
6. **Reading scope.** Each `context.md` opens with a short summary: the outcome, where it stands, and key decisions. A session reads:
   - the full `context.md` of each effort it's attached to;
   - only the summary of efforts one link away;
   - anything further on demand.

   Nothing is copied between efforts. The compaction note lists attached efforts with paths and names linked ones.

```text
Logs archived to S3 ──depends_on──▶ OPW deployment on AWS ◀──depends_on── Cisco ASA log ingestion
  (destination: bucket layout,             │                ◀──depends_on── Customer device logs
   retention, writer permissions)          │                                (once the option is chosen)
        ▲                                  │
        └────────────── split_from ────────┘
```

The OPW deployment's S3 sink configuration needs the destination design. It gets it by reading the S3 effort's summary through the existing link, without a reverse `depends_on`. If the bucket and permission design gains its own approval track, for example a security review of the policies, it splits into its own effort, and the OPW deployment `depends_on` it.

### Artifacts

An artifact is a file under the root, an external file, or a URL. Each has a **category** (`evidence`, `source`, `synthesis`, `deliverable`, `record`, `conversation`, `other`), a title, and a description.

URL artifacts also get a **pointer type**, derived from the URL by the service: `pull_request`, `issue`, `jira_issue`, `confluence_page`, or `url`. That lets an effort view list its PRs, Jira items, and Confluence pages directly. Agents register URLs with `catalog_describe` when they create or rely on them, for example after opening a PR or publishing a page.

Material that isn't a link is handled by where it lives:

| Material | How it's stored | Category |
| --- | --- | --- |
| Email | Saved as a Markdown file in the session folder, through the email connector or pasted in. An optional `origin` field keeps the source message ID or link. | `source` |
| Meeting | The recording as a pointer (external file or URL, never copied). The raw transcript or notes as Markdown. A cleaned transcript, with the raw one kept and linked with `informs`. A summary whose description is a short abstract. See [external input and intake](#external-input-and-intake). | recording and transcripts `source`; summary `synthesis` |
| PR, issue, Jira item, Confluence page | A URL pointer with a derived pointer type | `deliverable`, or `source` when it's input rather than output |

### External input and intake

Some material arrives from outside the working sessions: meetings, emails, a colleague's notes. It carries decisions, suggestions, and to-dos, but none of it is validated. A colleague's "that sounds good" in a meeting isn't an accepted decision. So external input is kept as artifacts, and only a deliberate intake with the human moves any of it into `context.md`.

**Processing a meeting** (a short session after the meeting, attached to the efforts it concerned so the meeting appears in their views):
1. Register the recording as a pointer (`source`).
2. Save the raw transcript or notes (`source`), and keep it unchanged.
3. Write a cleaned transcript (`source`): speaker labels by role, filler removed, nothing added. Link it with the raw one through `informs`.
4. Write the summary (`synthesis`). The artifact's description is a short abstract, so an effort view listing its meetings reads as a digest. The body keeps these apart:
   - **Discussed:** the topics, briefly.
   - **Decided in the meeting:** each with who decided, as stated. These are candidates, not accepted decisions.
   - **Suggested:** proposals and who made them.
   - **Open:** questions raised and not answered.
   - **Action items:** each with its owner (you or another role) and any date.
   - **Intake:** filled in later (see below).

Processing never writes to any `context.md`.

**Intake** is a deliberate session with the human, right after processing or days later, that works through the summary's candidates:
- **Accept** a decision: the agent writes it into the `context.md` of the effort it concerns, citing the meeting summary. Wording may be adjusted as the human confirms it.
- **Adjust or discuss:** talk it through first. What comes out is the human's decision, recorded as above.
- **Reject or defer:** it stays in the summary, marked as such.
- **Open questions:** become open questions in `context.md` only if the human wants to pursue them.
- **Action items:**
  - the human's own items go to the effort's `context.md` under "Next actions";
  - items owned by others go under "Waiting on";
  - team-tracked items become Jira items, registered as `deliverable` pointers.

The intake session attaches to the efforts whose `context.md` it changes ("attach where the work lands"). It records the outcome for each candidate in the summary's Intake section, so nothing is reviewed twice.

The same intake applies to other external input, such as an email thread with questions or a colleague's design notes. Processing an email is lighter: save it as a `source` file, with an optional summary.

Following the conversation content rules, attribution stays explicit throughout: what a person said, what the assistant proposed, and what the human accepted are never merged.

### Workstreams under Chief

A workstream is represented by sessions, not by a separate container. When Chief dispatches an orchestrator, the orchestrator's child session carries a `workstream` key, and optionally a `subject` such as `github:org/repo#123`. A replacement orchestrator for the same workstream uses the same key. A loop asks the catalog whether a subject already has a workstream and what it produced, and doesn't redo finished work.

Chief sets the key and subject in the brief, and the orchestrator records them with `catalog_session` on its own session.

## Lifecycle

```text
session starts ── plugin ──▶ session row (+ parent)
file written   ── plugin ──▶ capture: artifact (undescribed), produced_in
                             tool result note: "describe this with catalog_describe"
producer       ── catalog_describe ──▶ category, title, description
scope clear    ── catalog_session ──▶ session description, attach effort(s),
                                      workstream key/subject (orchestrators)
turn complete  ── plugin ──▶ conversation export updated
any change     ── service ──▶ effort index.md regenerated
compaction     ── plugin ──▶ note: attached efforts + record paths, coordination.md path
meeting/email  ── session ──▶ source + cleaned source + summary (candidates, action items)
intake         ── session with the human ──▶ accepted items into context.md; summary marked
daily          ── service ──▶ database copied to backups/
```

1. **Session start (plugin).** The plugin runs `cairn session start` with the session ID and, for child sessions, the parent ID. The command is an idempotent upsert, and plugins also call it the first time they see a session in any other event, because a start event can be missed. It injects the session ID and one line of guidance into context: "When this work becomes research, design, or building, describe this session and attach it to an effort with `catalog_session`."
2. **File written (plugin).** For a write under the root, the plugin runs `cairn capture`, which upserts the artifact by path with its hash and producing session. The plugin appends a note to the tool result telling the agent to describe the file. Files outside the root are ignored. Capture never blocks or fails the tool.
3. **Describe (producer).** The agent that wrote the file calls `catalog_describe` with a category, title, and one-sentence description. The parent adds `informs` or `supersedes` links as it uses results, and describes a file only if the producer didn't.
4. **Attach (the session's lead agent).** Once the work has scope, the root session's agent calls `catalog_session`. It describes the session and attaches one or more efforts, either existing ones found through `catalog_find` or new ones. Before creating an effort, the service checks for similar active efforts and returns them instead, unless the agent confirms a new one. Attaching later is fine: membership is derived through the session, so earlier files join automatically.
5. **Read (plugin).** For a read under the root, the plugin records `read_in`. This shows which sessions actually used which material. Suggested `informs` links built from these reads are a later experiment.
6. **Turn complete (plugin).** Root sessions only. See [conversation indexing](#conversation-indexing).
7. **Derived views (service).** There is no long-running process, so a change marks each affected effort as dirty in the database. The hot-path commands (`session start`, `capture`, `read`) only mark. Every other command, and the turn-complete `session index`, regenerates the dirty efforts' `index.md` before it exits.
8. **Compaction (plugin).** After compaction, the plugin adds a factual note listing each attached effort with the paths of its `context.md` and `design.md`, plus the session's `coordination.md` path when it exists. The agent rereads what it needs. This replaces relying on the orchestrator to remember where its records are.

## Retrieval

The effort view is the primary way back into work. `catalog_find` and the generated index both provide it.

- **Effort list:** filter by tag (`initiative:observability-pipeline`), status, or text. Each effort shows its title, description, tags, session count, artifact count, and last activity.
- **Effort view:** its `context.md` summary, its linked efforts with their status (`depends_on`, needed by, `split_from`, `related`), then every artifact from every attached session plus explicit members, **grouped by category** by default, with titles, descriptions, paths, and pointer types. PRs, Jira items, and Confluence pages each get their own group. Grouping by session and filtering to one session are options. Each artifact shows its producing session's title so provenance stays visible.
- **Sessions of an effort:** the session titles and descriptions, with links to their conversation exports.
- **Chief loop:** find sessions by `workstream` or `subject`.

The generated `efforts/<slug>/index.md` renders the default effort view as Markdown with relative links. It is a view only. Agents don't edit it, and the database remains the source of truth.

## Data model (v1)

Rows have internal integer IDs. Interfaces use natural keys (see [Stack](#stack)): sessions as `<harness>:<native-id>`, efforts by slug, and artifacts by path or URL.

```text
session     id, harness, native_id, parent_session_id?, root_session_id,
            title?, description?, cwd, agent?, workstream?, subject?,
            started_at, last_activity_at,
            export_artifact_id?, watermark_json?, indexed_at?, last_error?
effort      id, slug, title, description, status(active|paused|done|archived),
            created_at, updated_at, index_dirty
attachment  session_id, effort_id, attached_at, attached_by   -- unique pair
artifact    id, category?, pointer_type?, title?, description?,
            location(managed|external|url), path_or_url, origin?, sha256?, size?,
            status(undescribed|active|superseded|missing|archived),
            producer_session_id?, captured_at, updated_at
membership  artifact_id, effort_id, mode(include|exclude), set_by   -- explicit overrides
link        src_kind(artifact|effort|session), src_id, rel, dst_kind, dst_id,
            origin(explicit|suggested), created_by, created_at
            -- artifact rels: informs|supersedes|related|read_in
            -- effort rels:   depends_on|split_from|related
tag         effort_id, namespace, value                           -- unique triple
```

An artifact's efforts are the attached efforts of the nearest attached session in its producer's ancestry, plus the effort whose folder holds it, plus `include` memberships, minus `exclude` memberships. The `artifact_effort` view computes this.

## Folder layout

```text
~/workspace/artifacts/cairn/
  catalog.db                 SQLite (WAL)
  backups/                   daily database copies (catalog-<date>.db), about 7 kept
  logs/
  sessions/<harness>/<yyyy-mm>/<root-native-id>/
    conversation.md          root-session export
    coordination.md          the run's state, when the session orchestrates
    <workstream-key>/        Chief workstream folders, also the run's state
    …                        anything else written by the session tree; names are up to the skills
  efforts/<slug>/
    index.md                 generated effort view
    context.md               the work's state: purpose, scope, decisions and rationale, open questions
    design.md                optional, when the effort has a design
    …                        other material deliberately written to the effort
```

`catalog_location` returns a path in the root session's folder by default. With `effort` set, it returns a path in that effort's folder, for material meant to outlive the session. Chief's delegated orchestrators get a subfolder named by workstream key inside the root session folder, so parallel workstreams don't collide. Files never move automatically, and `cairn mv` moves a file while keeping its identity.

`catalog_location` records which session each path was handed to, and never hands the same path out twice. A file written there that no capture records, for example by a shell command, is credited to that session when it is first recorded, by a read or by `catalog_describe` without `session`. Provenance then still doesn't depend on the model knowing its own session ID.

### Records and multi-effort sessions

Records are split by what they describe, not by who writes them. `context.md` holds only validated state: decisions the human made or accepted, and the human's next actions and waiting-on items. External input reaches it only through [intake](#external-input-and-intake). The work's state outlives any session, so it belongs to the effort. The run's state belongs to the session running it.

A session attached to several efforts reads the `context.md` of each one. It writes each decision to the effort it concerns, the way you'd keep one notebook per project. A decision that really affects both goes in both, or in the one that owns it with a link from the other. Most sessions attach to only one effort. The session's single `coordination.md` lists the efforts it serves.

Orchestration is scoped work by definition. So selecting `orchestrate` or `orchestrate-chief` attaches the session to an effort, or creates one, before the first decision, and the effort's records exist from the start. Quick, unattached sessions never need a `context.md`. Two sessions editing the same `context.md` at the same time is possible, as it is today. v1 accepts that risk rather than adding locking.

**Who maintains and who reads.** The AI maintains the effort records: Scribe where the harness supports it, otherwise the orchestrator directly. The records are current state, edited in place, so they stay at the size of what's still live. Superseded detail is removed. The conversation exports keep the history. What each role reads by default:

| Reader | Reads by default |
| --- | --- |
| Human-facing orchestrator (direct or Chief), on resume or after compaction | `context.md` of each attached effort in full, the session's `coordination.md`, and the summary of linked efforts. `design.md` when the discussion needs it. |
| Scribe | The human-facing session's context and the records it maintains |
| Delegated orchestrator | Its workstream records, plus what its brief selects from effort records |
| Producers (explore, worker, reviewer, …) | Only the context and pointers their brief supplies |
| Intake session | The input's summary and the `context.md` of each effort it concerns |

Scribe learns the session's attached efforts from `catalog_session` or the compaction note, and routes each established decision to the effort it concerns. The effort view shows each record's approximate token size, so growth is visible. Cairn never warns or blocks on size.

Each profile has its own root and database. Work material stays in a work profile's catalog, and there is no code difference between profiles.

## Durability

The database is the only place descriptions, attachments, links, and tags exist. If it were lost, the files would survive, and `cairn check` could rediscover them, but only as undescribed files with no efforts. Once a day, on the first write of the day, Cairn runs `VACUUM INTO backups/catalog-<yyyy-mm-dd>.db` and keeps about seven copies. `cairn backup` makes a copy on demand. `cairn restore <file>` copies a backup back into place after checking its integrity. A text snapshot (sorted JSONL) is deferred. It only pays off once the root is tracked by git or a sync service.

## Interfaces

### MCP tools

| Tool | Purpose | Returns |
| --- | --- | --- |
| `catalog_session` | Describe a session and set its attachments. Inputs: `session`, optional `title`, `description`, `attach[]` (effort IDs, or `{ create: { title, description, tags[] }, confirm_new? }`), `detach[]`, `workstream`, `subject`. | Session, attached efforts, close-match efforts when creating |
| `catalog_describe` | Describe an artifact, or register a URL or external file. Inputs: `path` or `url`, `category`, `title`, `description`, optional `origin`, `efforts` (`include[]`, `exclude[]`), `informs[]`, `supersedes[]`. Idempotent on path or URL. | Artifact with its efforts |
| `catalog_find` | Pointers. Target `efforts`, `sessions`, or `artifacts`. Filters: `effort`, `session`, `tag`, `category`, `pointer_type`, `workstream`, `subject`, `status`, `text`, `group_by` (`category` or `session`), `limit`. | Pointer entries, never contents. Undescribed artifacts are flagged. |
| `catalog_location` | A collision-free write path. Inputs: `session`, `topic`, optional `effort`. | Absolute path |
| `catalog_effort` | `create` or `show` an effort, or `update` its title, description, status, or tags. Also `rename`, `split` (a new effort with a `split_from` link and chosen sessions and files included, removing nothing from the original), and `merge`. One flat input object, because MCP tool inputs must be objects. | The effort, or for `show` the effort view |
| `catalog_link` | Add or remove links between artifacts (`informs`, `supersedes`, `related`) or between efforts (`depends_on`, `split_from`, `related`). Accept or reject suggestions. | Links |

**Why MCP for agents:** read-only producers such as `explore` often have no shell permission. MCP tools can be allowed for them without granting Bash.

### CLI

```text
cairn session start <h>:<id> [--parent <h>:<id>] [--cwd <dir>] [--agent <name>] [--title <text>]
cairn session describe <h>:<id> [--title] [--description] [--attach <effort>]... [--create <title> ...] [--detach <effort>]...
                                [--workstream <key>] [--subject <ref>]
cairn session context <h>:<id>     compaction note: attached efforts and record paths
cairn session index <h>:<id> [--full]                                        (phase 4)
cairn capture <path> --session <h>:<id>
cairn read <path> --session <h>:<id>
cairn describe <path|url> [--category] [--title] [--description] [--origin] [--session]
                          [--include <effort>]... [--exclude <effort>]... [--informs <ref>]... [--supersedes <ref>]...
cairn find efforts|sessions|artifacts [filters] [--group-by category|session]
cairn location --session <h>:<id> --topic <topic> [--effort <slug>]
cairn effort create|show|update|rename|split|merge ...
cairn link add|remove|accept|reject effort|artifact <src> <rel> <dst>
cairn ls [<effort>] [--by session]                   human browsing
cairn check      mark missing or changed files; find moved files by hash; capture uncaptured files
cairn mv <artifact> <new-path>
cairn index      regenerate every effort's index.md
cairn backup | restore <file>
```

### Harness integration

| Event | OpenCode plugin | Claude Code hook | CLI call |
| --- | --- | --- | --- |
| Session created | First sight in the `context` hook, which runs before a session's first model request: `session.get` supplies `parentID`, `agent`, `title`, and `location` | `SessionStart` for the main session; `SubagentStart` (`agent_id`, `agent_type`) for subagents | `session start` |
| Session ID into context | `context` hook pushes `This session's catalog ID is opencode:<id>.` into `system` | `additionalContext` from `SessionStart`, and from `SubagentStart` for the subagent's ID | none |
| File written | `tool` `execute.after` for `write`, `edit`, and `patch`; the hook appends the capture note to `result.content` | `PostToolUse` on `Write\|Edit\|MultiEdit`, with the note as `additionalContext`; `agent_id` selects the subagent's session | `capture` |
| File read | `execute.after` for `read`, for in-root paths | `PostToolUse` on `Read` | `read` |
| Main turn completed | `session.execution.succeeded`, when `session.get` shows no `parentID` | `Stop`, with `last_assistant_message` | `session index` |
| Compaction completed | The `session.compaction.ended` event marks the session; the next `context` hook reads the note and pushes it into `system` on that and every later request | `SessionStart` with `source: compact`, with the note as `additionalContext` | `session context` |

Plugins and hooks run the CLI fire-and-forget and never block or fail the harness action.

Harness details the implementation depends on:

- **OpenCode paths.** `write` output `target` is absolute. `edit` and `patch` report `files[].file` relative to the session's `location.directory`, so the plugin resolves paths against that directory. Shell writes are invisible to every tool hook; `cairn check` catches them.
- **OpenCode tool results.** A plugin that adds the note must rebuild the base content the way OpenCode normalizes it: a string becomes one text part, a non-empty array stays as it is, and otherwise the output is stringified.
- **OpenCode turn completion.** `session.execution.succeeded` fires once per busy period, after the turn's text is committed. It also fires for child sessions, and not at all when the user interrupts (`session.execution.interrupted`).
- **Claude Code context text.** Phrase `additionalContext` as facts ("The catalog recorded this file as undescribed."). Imperative, system-style wording can trigger prompt-injection defenses.
- **Claude Code `Stop`.** It fires more than once per prompt when a background subagent resumes the parent, never on user interrupt, and before the transcript file necessarily contains the final message.

**Verification results (phase 1, 2026-09-25).** Every item on the original list held, from source and live probes on OpenCode 2.0.16 and Claude Code 2.1.282:

- OpenCode's session-created event carries the parent ID and agent name.
- The tool hook carries the writing child's own session ID.
- A plugin can append text that the model sees.
- `session.execution.succeeded` fires after the text is persisted.
- Claude Code's `PostToolUse` identifies subagent calls by `agent_id`, and its `additionalContext` reaches the model.
- Both harnesses can inject the session ID.
- MCP 2.0 serves over stdio.

The only item not observed live was OpenCode's `session.created` for a root session, because the probe plugin loaded after the session already existed. That is why session registration is an upsert on first sight. Evidence: `~/workspace/scratch/orchestrator-workspaces/_sessions/claude-code/d6a428ab-94c2-4a3c-a3b6-aa98dfcbccfc/evidence/work-catalog-harness-verification--main.md`.

## Conversation indexing

- **Scope.** Root sessions only. Child sessions keep their rows for provenance but get no export.
- **Adapters.** OpenCode ports the `export-session.py` projection to TypeScript: `session_message` ordered by `seq`, user text plus assistant `text` parts, with tool calls, reasoning, synthetic content, and child sessions excluded. Claude Code reads the JSONL at `transcript_path` and keeps user text and assistant text blocks. It skips non-message entries (`queue-operation`, `attachment`, `system`, `last-prompt`, `cost-state`) and synthetic user entries such as subagent completion notifications.
- **Incremental update.** The watermark is `{ last_seq, tail_hash }`, or `{ last_uuid, line_count }` for Claude Code. Append when the stored tail still matches, and do a full rewrite when the source has shrunk or changed. Write to a temp file and rename it into place.
- **Claude Code transcript lag.** At `Stop` the transcript may not yet hold the final assistant message. The export covers what the transcript holds, then adds `last_assistant_message` as a provisional tail outside the watermark, which the next run replaces with the transcript's version. The next `Stop`, a `SessionStart` with `source: resume`, or a sweep reconciles it.
- **Concurrency.** A lock file per session makes duplicate triggers no-ops. SQLite uses WAL and `busy_timeout`, with one connection per process.
- **Failures.** They are logged and recorded as `last_error`. `--full` or a periodic sweep reconciles missed events.

- **Content rules**, carried over from the [modular workflows discussion](../orchestrator/modular-workflows/design.md#main-session-conversation-history):
  - Keep actual human messages and assistant text, including commentary.
  - Exclude hidden reasoning, tool calls and results, injected system or skill instructions, synthetic notifications, and subagent transcripts.
  - Disclose attachment counts rather than presenting a text-only export as complete.
  - Keep native message locators so statements can be cited.
  - An export shows what the assistant claimed, not proof that it verified anything. Evidence files carry the proof.
  - A later analysis of how thinking evolved must keep three things apart: what the human said, what the assistant proposed, and what the analysis infers.

Message-level rows and full-text search wait until cross-session "how did my thinking evolve" queries show a need.

## Skill changes

Skills stay short, because the plugins handle the mechanics and the capture note carries the per-file reminder. `task-evidence` is being renamed `task-output` in parallel work.

| Skill | Change |
| --- | --- |
| `task-output` | "Write to an assigned path, or one from `catalog_location`. Before returning, describe each file you wrote with `catalog_describe`. Return the paths." |
| `effort-context` | Capture means `catalog_session` attaching an effort and writing the effort's `context.md`. Resume means `catalog_find` for efforts, then reading the effort view and the `context.md` of each attached effort, then attaching the new session. `index.md` authoring and `sessions/<id>.md` markers are retired. Name an effort for its outcome, not a phase. |
| `orchestration` | Attach or create an effort before the first decision. Keep the work's state in each effort's `context.md` (and `design.md`), and the run's state in the session's `coordination.md`. Chief puts a `workstream` key and optional `subject` in each orchestrator brief, and checks for existing workstreams by subject before dispatching. Evidence selection uses `catalog_find`. Register PRs and published pages with `catalog_describe`. |
| `design-partner` | Attach an effort once the design has scope. |

## Rationale for key choices

| Choice | Why |
| --- | --- |
| Pointers only, never file contents | It keeps the MCP surface small, and harness file permissions stay authoritative. Large content doesn't pass through tool results twice. The human explicitly didn't want agents reading through the MCP server. |
| Plugins capture facts, agents describe | Facts (path, hash, writing session, parent chain) can be recorded with no model and never forgotten. Only a model can say what a file means. The plugin receives the native session ID from the harness, so provenance never depends on the model knowing its own session ID. That removes the hardest identity problem from capture. |
| The producer describes, not the parent | The producer has read every source, while the parent sees only the return digest. Describing costs the parent's context nothing. The earlier decision was that the orchestrator isn't the catalog clerk. The human noted that the parent reads the files anyway and questioned the cost argument, but accepted that the producer describes and the parent adds relationships. |
| The capture note in the tool result | It reminds the producer at the moment of writing, so the reminder doesn't depend on skill guidance being remembered. |
| Session first, efforts optional and many-to-many | Sessions span several efforts, and quick work has no effort. Resuming work means looking at an effort's sessions and files together. Sessions are the unit the harness gives for free. Efforts are the durable subject you come back to after sessions end. |
| Files live with their session | Attaching, detaching, and regrouping efforts never moves a file. A file relevant to two efforts needs no copy. Membership is derived through the session, so attaching late needs no back-fill. |
| Flat efforts with namespaced tags | Grouping will keep changing, and one effort can relate to several groups. The UI need for an initiative level is met by treating `initiative:` tags as a grouping level. Converting to real parents later is mechanical. |
| No tags on artifacts | Category, effort membership, and description covered every example that came up. |
| Workstreams represented by sessions | A workstream is one orchestrator's delegated work. Its session, and any replacement session with the same key, already carry its files. A separate container duplicated the effort in the common one-to-one case. |
| Chief sets workstream keys explicitly | Chief must check the subject before dispatching ("does PR 123 already have one?"), so it's already making that call. Auto-creating on orchestrator session start would duplicate a workstream when Chief replaces a stale orchestrator. Detecting from new folders would create the container before anything said what it was. |
| Duplicate-effort check on create | Many sessions work on the same thing. Without a check, each would create its own effort. |
| No prescribed file names | The catalog stays loose, so structure can grow later. Anything under the root is captured and described. Record names such as `context.md` belong to the skills. |
| Daily database copy for durability | Relationships exist only in the database, and metadata in files was rejected because agents can't be relied on to write it. A text snapshot is readable and diffable, but nothing tracks the root yet, so a `VACUUM INTO` copy covers the real risk with less code. |
| Records split into the work's state and the run's state | The old per-effort folder mixed state that lives as long as the effort with state that lives only for one run. Once a session can serve several efforts, only this split answers "which design file do I use?". |
| Effort is the outcome | When implementation starts, the design's evidence, decisions, and open questions are already in the same effort. Splitting by phase would force every implementing session to find and attach the design effort as well. |
| Root in `artifacts/`, not scratch | The workspace puts mutable outputs that don't belong to a project in `artifacts/`. Scratch implies disposable, which conflicts with the database holding durable organization. |
| MCP for agents, CLI for plugins | Read-only producers such as `explore` often lack shell access, and MCP tools can be allowed for them without Bash. Plugins and hooks need a fast process call, with no MCP client. |
| Its own package in `mfz-home` | It can be iterated on separately from the Mindframe-Z runtime. Moving it into Mindframe-Z later means relocating `src/core`. |
| Built-in `node:sqlite` and MCP 2.0 packages | There is no native dependency. `mcp/discord` already uses the 2.0 split packages, so this matches the home. |

## How the design evolved

These proposals were made and then replaced. Don't re-propose them without new evidence.

1. **Reusing `mfz work`, `work-ledger`, and `mfz thread`.** The assistant found that these overlapped and proposed unifying on them. The human rejected this: they were unfinished experiments, and the catalog should be designed fresh for orchestration.
2. **`mcp/work-catalog/`.** The human moved the package to a new `packages/` folder that holds both the CLI and the MCP server.
3. **`@modelcontextprotocol/sdk` 1.30.** This was replaced by the 2.0 split packages to match `mcp/discord`.
4. **Producer-only registration.** Replaced by plugin capture plus producer description, after the human proposed a write hook and asked whether the parent or the child should index.
5. **Efforts as a tree, with workstreams as child efforts, initiatives as parents, and projects as tags.** Replaced once the human pointed out that sessions span efforts and quick work has none. That led to the session-first, many-to-many model.
6. **Workstream as a separate, optional entity that Chief creates.** The human first suggested that every orchestrator or ordinary session create both an effort and a workstream. The assistant argued for workstreams only under Chief. Both were superseded by representing workstreams as sessions.
7. **Effort folders as the home for files, with back-fill on attach.** Replaced by session folders and derived membership.
8. **Symlinked effort views, or moving files on capture.** Rejected. Symlinks display poorly in Windows Explorer. Moving files races with writers and breaks quoted paths. The generated `index.md` replaced both.
9. **A single record file per scope.** The human mentioned this simplification, but the committed skills still use `context.md` and `coordination.md`. The human chose to keep both for now and not have the catalog care about names.
10. **Detecting new workstreams from the filesystem, or from orchestrator session creation.** This was the human's idea while thinking aloud. It wasn't adopted, for the reasons under Chief sets workstream keys explicitly.
11. **Tags on artifacts.** Dropped for v1.
12. **Hierarchy versus tags.** The human weighed an explicit initiative-to-effort hierarchy for the future UI, then chose flat efforts with tags, keeping the option to add hierarchy later.
13. **The name "effort".** "Project" and "topic" were considered, as common industry terms. "Effort" is kept for now, and a rename may come later.
14. **Both MCP 2.0 packages.** Phase 1 found that `@modelcontextprotocol/node` provides only Streamable HTTP. Only `@modelcontextprotocol/server` is needed.
15. **Claude Code subagents registered through `SessionStart`.** The first design assumed that each subagent gets its own session and `SessionStart`. Phase 1 showed that subagents share the parent's `session_id`, are identified by `agent_id`, and trigger `SubagentStart` instead.
16. **Session registration only at session start.** Phase 1 showed that the start event can be missed, so registration became an upsert on first sight.
17. **Reading the Claude Code transcript at `Stop` as complete.** Phase 1 caught the final message missing from the file, which led to the provisional tail built from `last_assistant_message`.
18. **The name "work catalog".** Replaced by Cairn, chosen by the human from these candidates:
    - "work catalog", which is accurate but generic;
    - Trail or Worktrail, which read as an audit trail;
    - Docket, which suggests a queue of pending work;
    - Logbook, where "log" is already overloaded.

    Names containing "way" were ruled out because Wayfinder planning already exists. Ledger, thread, work, workspace, and index were ruled out by the terminology rules. "Catalog" remains the name of the database and the MCP tool prefix.

19. **Text snapshot (`snapshot/*.jsonl`) for durability.** This was an earlier decision of the human's. When questioned, it was replaced by daily `VACUUM INTO` copies, with the text snapshot deferred.
20. **Moving old orchestrator folders into `efforts/` during import.** The assistant proposed this. The human declined: nothing is moved, and a trial of one effort may follow once Cairn works.
21. **Records kept wherever the orchestration skills put them.** Replaced by the split into the work's state (effort) and the run's state (session), once multi-effort sessions exposed the question.
22. **`part` labels on attachments, with promotion to an effort.** The assistant proposed these for multi-part efforts. They were replaced by the explicit split and prose parts, because parts aren't known up front.
23. **Efforts related only through shared tags.** This was replaced by effort-to-effort links, once the human's example showed relationships that are specific and discovered late ("ASA reuses OPW").
24. **Attaching a spawned dependency session to both efforts by default.** The human suggested this. It was replaced by "attach where the work lands" and read-only access through links.
25. **Meeting processing that writes decisions straight into each effort's `context.md`.** The assistant proposed this in the first version of the scenario. The human rejected it: meetings produce candidates, not validated decisions, and promotion into `context.md` is a deliberate intake with the human.
26. **Size budgets on records, with capture-note warnings.** The assistant proposed about 1,500 tokens for `context.md`. The human rejected budgets because they would push out valuable information. Curation and reading scopes replaced them.
27. **Five separate record files, then a working and curated layer with a Cairn-generated `brief.md` for agents.** The human rejected the generated brief. For now the AI maintains `context.md` and `design.md`, and the curated layer is a deferred idea.

## Deferred ideas

- Suggested `informs` links built from reads. `read_in` facts are recorded from phase 3, and suggestions follow only after a sample shows most would be correct.
- A plugin drafting session descriptions with a cheap model, through OpenCode plugin text generation.
- Effort hierarchy, if `initiative:` tags stop being enough.
- Message-level rows and full-text search over conversations.
- A management UI and a network API over the same core.
- Moving the package into Mindframe-Z.
- Renaming "effort" to "project" or "topic".
- Ingesting email automatically through the email connector. For now, emails are saved as Markdown `source` files when needed.

- A text snapshot (sorted JSONL) of the database, once the root is tracked by git or a sync service.
- Importing `orchestrator-workspaces`, starting with a trial of one effort.
- **Meeting processing and intake skills.** Processing registers the recording, saves the raw and cleaned transcripts, and writes the summary with candidates and action items. Intake walks the human through the candidates and promotes accepted ones. Build them once the manual version has been used. See the scenario, steps 7 and 8.
- **People on artifacts.** v1 finds people through `person:` tags on efforts and attendees named in descriptions.
- **Structured action items and waiting-on** (see open question 2).
- **A curated layer, maintained by the human with AI.** This was proposed on 2026-09-25 and deferred by the human in favor of AI-maintained `context.md` and `design.md` for now. It separates AI-maintained working material from content the human curates, with explicit promotion as the only path between them. Its parts:
  - **Decisions as a primitive:** one Markdown file each, with the question, a status (open, decided, superseded, dropped), options with pros, cons, and evidence, the chosen option and rationale, and resulting requirements. They're parsed into rows. Decision trees are links: `depends_on` between decisions, an option `raises` or `constrains` another decision (including in other efforts), and a decision `produces` a requirement. A site would draw the tree and order open decisions by what they block.
  - **`requirements.md`**, promoted, or produced by decisions.
  - **`todos.md`**, owned by the human, added only when the human accepts them, and kept out of agent context so "talk to the security reviewer" never reads as an agent task. Waiting-on items are to-dos owned by others.
  - **Knowledge documents** (category `knowledge`): refined, shareable research promoted from evidence ("How OPW works"), which the human may restructure and share.
  - **A working log:** decisions made along the way with who made them, approaches tried and dropped, and candidates AI flags for promotion. Never loaded by default; a cheap Scribe or explore agent summarizes it on demand.
  - **Promotion**, generalizing intake: any working material (meeting summary, log candidate, evidence, conversation) promoted into a decision, requirement, to-do, knowledge document, or context update, citing its source and marking what was promoted or declined.
  - **Items parsed from Markdown:** checkbox bullets under known headings (`## To-dos`, `## Open questions`, `## Candidates`) become `item` rows, with the files remaining the source of truth. Pending intake is then derived from unchecked candidates, and a needs-attention view across efforts becomes possible: open decisions, candidates awaiting review, the human's to-dos, and waiting-on.
- **A cross-effort needs-attention view and an intake inbox**, which depend on parsed items or a curated layer.

## Implementation

### Package placement

| Path | Contents |
| --- | --- |
| `packages/cairn/` | `src/core/` (schema, operations, adapters, views), `src/cli.ts` with a `bin` entry, and `src/mcp.ts`. Add `packages/*` to `pnpm-workspace.yaml`. |
| `opencode/plugins/cairn/` | Session start and context injection, write and read capture, capture notes, and turn-complete indexing, all through the CLI. Follows `opencode/AGENTS.md`. |
| Profile configuration | The mfz-rendered MCP entry (server name `cairn`), `CAIRN_ROOT`, and the Claude Code `SessionStart`, `SubagentStart`, `PostToolUse`, and `Stop` hooks. Mindframe-Z renders configuration only. |

Proposed source layout. Tests sit next to their modules as `*.test.ts`, as elsewhere in the home. Each file is annotated with the phase that creates it.

```text
packages/cairn/
  TERMINOLOGY.md          vocabulary (moved here from docs/cairn/)
  package.json            @mfz/cairn; bin "cairn" → src/cli.ts (#!/usr/bin/env node); exact versions
  tsconfig.json           erasableSyntaxOnly, verbatimModuleSyntax, allowImportingTsExtensions, noEmit
  vitest.config.ts
  README.md
  src/
    cli.ts                entry: parseArgs → command → core; --json output                 (2)
    mcp.ts                entry: serveStdio; registers the catalog_* tools                  (3)
    schemas.ts            zod input schemas shared by the CLI and MCP                       (2)
    core/
      db.ts               open, pragmas (WAL, busy_timeout, foreign_keys), transactions     (2)
      migrations.ts       ordered SQL, PRAGMA user_version                                  (2)
      root.ts             CAIRN_ROOT, folder layout, in-root checks, stored paths           (2)
      lookup.ts           natural key → row ID for sessions, efforts, and artifacts         (2)
      sessions.ts         start upsert, tree and root resolution, describe, attach,
                          workstream and subject, location, compaction note                 (2)
      efforts.ts          create with duplicate check, update, tags, rename, split, merge   (2)
      artifacts.ts        capture, read, describe, URL pointer types, mv                    (2)
      links.ts            artifact links (informs, supersedes, related, read_in) and
                          effort links (depends_on, split_from, related)                    (2)
      find.ts             filters, grouping, and the row loaders the other modules return   (2)
      views.ts            effort view, dirty marking, generated efforts/<slug>/index.md     (2)
      operation.ts        open, run, regenerate indexes, daily backup; failure messages     (3)
      words.ts            significant word stems for find and the duplicate check           (3)
      backup.ts           daily VACUUM INTO copy, restore                                   (2)
      check.ts            missing, changed, and moved files; uncaptured files               (2)
    harness/
      claude-code.ts      `cairn hook claude-code`: stdin JSON → core → hookSpecificOutput  (5)
    conversation/
      export.ts           Markdown rendering, watermark, provisional tail, lock, atomic write (4)
      opencode.ts         OpenCode session_message adapter                                  (4)
      claude-code.ts      Claude Code transcript adapter                                    (5)

opencode/plugins/cairn/   package.json, index.ts, server.ts, server.test.ts, README.md     (3)
```

`pnpm-workspace.yaml` gains `packages/*` and `opencode/plugins/cairn`. Where the profile entries go, `base` or `personal`, and how hooks and environment variables are rendered, follows `mfz guide` when phase 3 wires them.

### Stack

The human accepted these on 2026-09-25, after phase 1.

| Area | Decision | Why |
| --- | --- | --- |
| Language | TypeScript on Node 26. The Python exporter is only a reference. | One stack with the plugins, the MCP SDK, and the rest of the home. |
| Running TypeScript | No build step. Node 26 strips types natively, so hooks and the MCP entry run `node <abs>/packages/cairn/src/cli.ts` and `src/mcp.ts`. `tsconfig` sets `erasableSyntaxOnly`, `verbatimModuleSyntax`, `allowImportingTsExtensions`, and `noEmit`, and imports use `.ts` extensions. | No `dist/` to go stale, matching how plugins load in place. Checked: a plain `.ts` file runs, and `enum` fails, so only erasable syntax is allowed (no enums, namespaces, or parameter properties). This differs from `mcp/discord`, which builds. |
| Database | `node:sqlite` with hand-written SQL and prepared statements. No ORM or query builder. `STRICT` tables, WAL, `busy_timeout`, one connection per process. Migrations are an ordered list of SQL tracked by `PRAGMA user_version`. | About seven tables and simple queries. No native dependency. `require('node:sqlite')` costs about 20 ms. |
| Search | `LIKE` on titles and descriptions in v1. | FTS5 and JSON functions are available in `node:sqlite` (checked), so message-level search can use FTS5 later. |
| Identity | Natural keys at every interface: sessions as `<harness>:<native-id>`, efforts by slug, artifacts by path or URL. Integer row IDs stay internal. `cairn effort rename` updates a slug and its references. | Backups, and any future text snapshot, restore to the same identities, and agents never handle opaque IDs. |
| CLI | Command `cairn`, parsed with `node:util` `parseArgs`. Every command accepts `--json`. | Built in, with fast startup for frequent hook calls. |
| MCP | `@modelcontextprotocol/server` with `serveStdio` (version under Versions). Server name `cairn`. Tool names keep the `catalog_` prefix. | Stdio was confirmed in phase 1. `@modelcontextprotocol/node` is HTTP-only. |
| Validation | `zod` at the MCP and CLI boundaries. | `registerTool` takes zod schemas. Importing zod costs about 40 ms, which is acceptable for fire-and-forget calls. |
| Claude Code hooks | One TypeScript entry point, `cairn hook claude-code`, reads the hook JSON from stdin and dispatches on `hook_event_name`. It prints `hookSpecificOutput` JSON when there is context to add. No bash or `jq` scripts. | The event mapping is written once and tested with vitest. |
| OpenCode plugin | The plugin runs the CLI as a detached subprocess. It doesn't import core in process. It builds the capture note itself from a path check, without waiting for the database. | OpenCode runs on Bun 1.4.2 (checked). Bun exposes `node:sqlite`, so in-process use is possible, but a subprocess keeps one runtime, Node, as the only database writer. It costs about 50 ms per call, and nothing waits for it. Revisit if spawning becomes a problem. |
| Tests | Vitest behavior tests through the CLI and MCP, against a temporary `CAIRN_ROOT`. No change-detector or tautological tests. | Matches the home. No test touches the real root. |
| Versions | The latest stable exact versions that are at least three days old, checked in the npm registry on 2026-09-25:<br>- `typescript` 7.0.2 (2026-07-08)<br>- `@types/node` 26.6.2 (2026-09-19, matching Node 26)<br>- `vitest` 5.0.1 (2026-09-15)<br>- `zod` 4.6.5 (2026-09-13)<br>- `@modelcontextprotocol/server` 2.0.0<br><br>`@modelcontextprotocol/server` 2.1.0 was published 2026-09-23 and becomes eligible on 2026-09-26. Recheck the registry when scaffolding. | This is the human's instruction to use the latest exact versions rather than match the root. pnpm's `minimumReleaseAge` enforces the three-day rule. TypeScript 7 is the native compiler. It still ships `tsc`, and the package uses it only for `tsc --noEmit`. |
| Latency | `session start`, `capture`, and `read` load only `core` and do one transaction each. | They run on every session start and in-root file access. |

### Implementation notes from phase 1

These are the API details and working methods the phase 1 probes established. The evidence file listed under [continuation](#continuation) has the source line references and captured data.

**OpenCode plugin API (`@opencode/plugin` 2.0.16).** Declare the plugin package's `@opencode/plugin` version as 2.0.16, matching the installed OpenCode.
- A plugin is `export default Plugin.define({ id, setup(ctx) })`, where `Plugin.define` is the identity function. `setup` returns a dispose function. `skill-continuity/server.ts` is the closest model.
- `ctx.tool.hook("execute.after", fn)` delivers `tool`, `sessionID` (the executing session, so a child's own ID), `agent`, `messageID`, `id`, `input`, and either `status: "completed"` with a replaceable `result` (`output`, `content`, `metadata`) or `status: "error"`. Failed writes arrive here too, so filter on `status`.
- `ctx.session.hook("context", fn)` runs before every model request. Pushing `{ type: "text", text }` onto `event.system` adds system text. The session ID line is constant per session, so the prompt cache stays warm.
- `ctx.event.subscribe()` is a live async iterator; it doesn't replay past events. Consume it in a detached loop, as `omp-advisor` does. The events the catalog needs are `session.created` and `session.execution.succeeded`. `session.text.ended` and `session.tool.success` are also available.
- `ctx.session.get({ sessionID })` returns `parentID`, `agent`, `title`, and `location` for lazy registration. `ctx.session.context({ sessionID })` returns the projected messages. `ctx.storage` gives the plugin key-value state if it needs any.
- Tool inputs and outputs:
  - `write`: input `{ path, content }`, output `{ target (absolute), resource (relative), existed }`.
  - `edit`: input `path`, output `files[].file` (relative).
  - `patch`: output `files[].file` (relative).
  - `read`: input `path`.
  - The `subagent` tool creates the child session with `parentID`, `title` set to the task description, and `agent`. Subagent depth is capped by `experimental.subagent_depth`, which is 3 in this profile.
- Other plugins append to tool results too; `session-usage` adds its own part. The catalog note is appended after whatever is already in `content` and never replaces it.

**OpenCode plugin loading and testing.**
- The rendered config lists plugins as `file://` directories in `plugins`. Each directory has a `package.json` whose `exports["."]` points at the entry file.
- A project-level `opencode.jsonc` in a session's directory adds plugins on top of the global ones. This makes an isolated live test possible without touching the profile: put a test `opencode.jsonc` in a temporary directory and run `opencode run --standalone --auto --format json "<steps>"` there.
- A plugin loaded from project config starts after the root session already exists, so its root `session.created` is missed. That is another reason registration is an upsert.
- `opencode/AGENTS.md` still requires the final check on the rendered plugin through `opencode run --format json`.

**Claude Code hooks (2.1.282).**
- Every hook receives `session_id`, `transcript_path`, `cwd`, and `hook_event_name` on stdin. Inside a subagent it also receives `agent_id` and `agent_type`.
- `PostToolUse` has `tool_name`, `tool_input` (file paths are always absolute), `tool_response`, and `tool_use_id`. It returns `{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"…"}}`.
- `SessionStart` has `source` (`startup`, `resume`, `clear`, `compact`, or `fork`) and optionally `session_title`. It can return `additionalContext` and `sessionTitle`. It runs before Claude's first response, so it must be fast. It does not fire for subagents.
- `SubagentStart` has `agent_id` and `agent_type` and can return `additionalContext` into the subagent. It also fires when a subagent is resumed; the context is re-injected only if missing.
- `Stop` has `last_assistant_message`, `stop_hook_active`, and `background_tasks`. `SubagentStop` adds `agent_transcript_path`.
- `SessionEnd` has `reason` and a 1.5-second default budget. It is optional for a final flush, which must be a detached process.
- Subagent transcripts live at `~/.claude/projects/<cwd-slug>/<session_id>/subagents/agent-<agent_id>.jsonl`. A sibling `.meta.json` holds `agentType`, `description` (usable as the child session's title), `toolUseId`, and `spawnDepth`.
- `additionalContext` is phrased as facts. Values over 10,000 characters are spilled to a file.
- Claude Code refuses writes under `~/.claude/`, so the Cairn root or test output can't live there.
- **Isolated test method:** `claude -p --model haiku --settings <test-settings.json> --setting-sources "" --allowedTools "Write,Agent" --permission-mode acceptEdits "<steps>"`, run in a temporary directory outside `~/.claude`. The hook script appends its stdin to a log. Asking the model to quote marker words back proves that the context arrived.

**MCP stdio server.** `serveStdio(() => { const server = new McpServer({ name, version }); server.registerTool(name, { description, inputSchema: z.object({…}) }, handler); return server; })`, with `zod/v4`. It answers `initialize` for protocol `2025-06-18`. Test it by piping JSON-RPC lines (`initialize`, `notifications/initialized`, `tools/list`, `tools/call`) into the process.

### Phase 2 results

Built in `packages/cairn/`, 2026-09-25. `src/cli.test.ts` holds 24 behavior tests that drive the CLI in process against a temporary root, with an injected clock for the daily backup. Typecheck and the anti-slop check are clean. The real root at `~/workspace/artifacts/cairn/` hasn't been created.

Choices made while building, beyond what the sections above state:
- **Stored paths.** Managed files are stored relative to the root, external files as absolute paths, and URLs as given. Interfaces always show absolute paths. This makes effort renames and the effort-folder membership rule simple queries.
- **Undescribed until meaningful.** An artifact becomes `active` when it has a category and a title or description. A category alone leaves it `undescribed`.
- **A read of an unrecorded file** records it with no producer, so the reader isn't credited and the file joins no effort through the reader's session. Since phase 3, a file at a path from `catalog_location` is credited to the session that path was handed to instead.
- **Split** copies the original's tags onto the new effort, adds any given tags, attaches the chosen sessions, and includes the chosen files.
- **Merge** moves attachments, memberships, tags, and links to the target, includes the files in the merged effort's folder, and deletes the merged effort. Its records aren't merged. The command lists them so an agent can fold their content into the target's records.
- **Duplicate check.** A new effort is refused, with the matches returned, when an active or paused effort's title shares at least half of the shorter title's significant words, or has the same slug. `confirm_new` overrides.
- **Summaries.** The effort view takes a linked effort's summary from a `## Summary` section of its `context.md`, or failing that, the first paragraph.
- **`cairn index`** regenerates every index, for use after a manual database change.
- **Latency.** A hot-path command takes about 140 ms, mostly module loading (zod alone is about 60 ms). With `NODE_COMPILE_CACHE` set, it drops to about 85 ms. Phase 3 should set it where plugins and hooks spawn the CLI. Claude Code's `PostToolUse` hook waits for its command, so this matters most in phase 5.

Not in phase 2: `session index` (phase 4), `hook claude-code` (phase 5), and `src/mcp.ts` (phase 3).

### Phase 3 results

Built 2026-09-25: `src/mcp.ts` in the package and the plugin in `opencode/plugins/cairn/`. The package has 32 behavior tests (8 through an MCP client) and the plugin 7. Typecheck and the anti-slop check are clean. The personal profile is wired for OpenCode. The skill changes come last, after phases 4 and 5 (human decision).

MCP server:
- **Tools.** The six `catalog_*` tools take the CLI's zod schemas directly, except `catalog_effort` and `catalog_link`, whose discriminated inputs become one flat object, because MCP clients expect an object schema. Results are compact JSON text. Errors come back as tool errors that name the field. Each call opens the catalog, runs, regenerates dirty indexes, and takes the daily backup through the same `withCairn` wrapper the CLI uses. Opening per call means a `restore` never leaves the server holding a replaced file.
- **Version.** `@modelcontextprotocol/server` 2.0.0. 2.1.0 is under three days old.
- **Stdio.** Checked by piping JSON-RPC into `node src/mcp.ts`.

OpenCode plugin:
- **Registration on first sight.** A session is registered from the first `context` hook, which runs before its first model request, using `session.get` for the parent, agent, and directory. That covers roots whose `session.created` the plugin missed, so the plugin doesn't need that event. A root session's title isn't passed, because it is a placeholder until OpenCode generates one. The agent sets it with `catalog_session`.
- **Capture note.** Written files under the root, other than Cairn's own files, get `cairn capture`. The note is appended once per file per session, so repeated edits don't repeat it. Effort records (`context.md`, `design.md`) are captured without a note. Reads under the root get `cairn read`. Paths from `edit` and `patch` resolve against the session's directory.
- **Compaction note stays.** System text isn't kept in a session's history, so a note pushed once would vanish on the next request. After `session.compaction.ended`, the plugin reads `session context` once, then pushes the note on every later request. It doesn't change between compactions, so the prompt cache stays warm.
- **Subprocesses.** Each call spawns `node <package>/src/cli.ts` detached, with `NODE_COMPILE_CACHE` set to a folder under the temp directory unless already set. Only the compaction note waits for output, with a 5-second timeout. Failures are logged and never fail the tool call or the request.
- **Root rules shared.** The plugin imports `resolveRoot`, `relativeInsideRoot`, `isCairnOwned`, and `isEffortRecord` from `@mfz/cairn/root`, so the plugin and the CLI agree on what's inside the root.

Found in live runs:
- **Search by meaning, roughly.** A resuming agent searched for "archiving logs to S3" and the phrase match found nothing, because the effort is titled "Logs archived to S3". `find` now ranks by how many significant word stems match, with crude suffix stripping (`archiving`, `archived`, and `archive` all stem to `archiv`). The duplicate check uses the same stems.
- **Tool names.** OpenCode exposes the tools as `cairn_catalog_*`. The agents found them either way, though they sometimes searched with code mode first. The test project set `codemode: false` for the server.

Live acceptance, in an isolated project with a temporary root (`opencode run --standalone --auto`, OpenCode 2.0.16, `openai/gpt-6-luna#high`):
- A `general` subagent took a path from `catalog_location`, wrote evidence, got the capture note, and described the file.
- The lead attached two new efforts and registered a PR URL. The evidence and the PR appear in both effort views, the PR under "Pull requests".
- A fresh session found the effort, opened its view, read the evidence, and attached itself.
- Restricting a file to one effort and finding a Chief workstream by subject are covered by the MCP tests.
- Several runs stalled in OpenCode's startup. The one run with logs stopped at "cli starting", before any plugin or MCP server loaded, and identical setups completed on other attempts. Another session was running OpenCode evals at the same time. The final plugin revision was confirmed live for registration and the injected catalog ID. Its capture-note path, which changed only in how the base content is parsed, is covered by unit tests; the previous revision passed it live.

Profile wiring and the real root, 2026-09-25:
- **Wiring.** `catalog/mcp.yml` has a `cairn` entry (`type: local`, `transport: stdio`, `command: [node, <repo>/packages/cairn/src/mcp.ts]`). The `personal` profile enables it for OpenCode only and adds the `cairn` plugin, which OpenCode loads by `file://` URL from the repository. `mfz apply` rendered both and `mfz doctor` is clean. The root is the default, `~/workspace/artifacts/cairn/`, created by the first live run.
- **Code mode.** This machine sets `OPENCODE_EXPERIMENTAL=1`, which puts every MCP server behind code mode. Cairn goes through it like the others (human decision). In the live run the agent found the tools with one `search` in the `cairn` namespace and called them as `tools.cairn.catalog_*`.
- **Live run against the real root** (`opencode run --standalone --auto`, `openai/gpt-6-luna#medium`, in `~/workspace/scratch/cairn-live`). The agent took a path from `catalog_location`, wrote a note, described it, created and attached the effort `cairn-live-check`, and showed its view. It wrote the note with a `shell` heredoc, so the plugin never captured it, and described it without `session`, so the note had no producer and the effort listed no files until the agent described it again with `session`. The location grant (see [folder layout](#folder-layout)) closes that gap. The effort and its note are test data.

### Phase 4 results

Built 2026-09-25: `src/conversation/export.ts` and `src/conversation/opencode.ts` in the package, `cairn session index`, and the plugin's turn trigger. The package has 37 behavior tests (5 for conversations, driven through the CLI against a fixture OpenCode database) and the plugin 8. Typecheck and the anti-slop check are clean.

- **Trigger.** The plugin handles `session.execution.succeeded` from the event stream. For a root session it fires `cairn session index` detached; a subagent's turn fires nothing.
- **Source.** The adapter opens OpenCode's database read-only in one read transaction and selects only user text (with the attachment count) and assistant `text` parts, as `export-session.py` does. `--source` names the database; otherwise the CLI asks `opencode debug paths db`, which takes about 0.2 seconds, off the hot path.
- **Export.** `conversation.md` in the root session's folder. Its header is fixed, so appends never touch earlier bytes: it says what's included and left out, but carries no counts or title. Each body has its time, a native locator (`seq`, message ID, and content index), a SHA-256, and for user messages the number of attachments left out. The artifact is category `conversation`, titled from the session's catalog title or else OpenCode's, and described with the session's description. Its producer is the root session, so it joins that session's efforts. The effort index links it from the session's line as well as listing it under "Conversations".
- **Watermark.** `{ last_seq, tail_hash }`, where the hash covers the bodies at `last_seq`. OpenCode's `seq` comes from a per-session event sequence and isn't reused, and a committed revert deletes the boundary message and everything after it (`session/revert.ts`, `session/projector.ts` in OpenCode 2.0.16). So a revert that reaches exported messages removes the tail, the hash no longer matches, and the file is rewritten. A message still streaming at the last export changes the tail the same way. A file whose hash differs from the catalog's, because someone edited it, is rewritten too. A staged revert that isn't committed yet stays in the export until the commit.
- **Lock.** `locks/<session>.lock` under the root, created exclusively. A second export while one runs returns without writing. A lock older than ten minutes is taken over. `locks/` is Cairn's own and never captured.
- **Failures.** Recorded in the session's `last_error`, logged, and cleared by the next successful export. `--full` rewrites from the start.

Live acceptance, against a temporary root (`opencode run --standalone --auto`, `openai/gpt-6-luna#medium`): a first turn that dispatched a `general` subagent produced a root export and none for the subagent. A second turn, run with `--session`, appended two bodies and left the first turn's bytes unchanged. The revert path was checked against OpenCode's source and by the fixture tests, not live.

### Phases

1. **Verify harness facts.** Done 2026-09-25; see the verification results under [harness integration](#harness-integration).
2. **Core and CLI.** Done 2026-09-25; see [phase 2 results](#phase-2-results). Schema, sessions and trees, capture, describe, attach, derived membership, tags, effort links, split and merge, pointer types, find with grouping, generated indexes, backup and restore, check, and the compaction note (`session context`).
3. **OpenCode plugin and MCP.** Built and wired into the personal profile 2026-09-25; see [phase 3 results](#phase-3-results). The skill changes moved to the end (step 6). Acceptance:
   - An explore subagent writes evidence in an unattached session and describes it after the capture note.
   - The lead agent then attaches two efforts, and the evidence appears in both effort views.
   - One file is restricted to a single effort.
   - A PR URL is registered and shows up under the effort's pull requests.
   - A fresh session resumes from the effort view.
   - A Chief loop finds an existing workstream by subject.
4. **Conversation indexing** through OpenCode. Built 2026-09-25; see [phase 4 results](#phase-4-results). Acceptance: two turns produce an appended export, a revert triggers a full rewrite, and child sessions produce no export.
5. **Claude Code hooks and adapter.** The `SessionStart`, `SubagentStart`, `PostToolUse`, and `Stop` hooks, `agent_id`-based child sessions, and the transcript adapter with its provisional tail.
6. **Skills.** The [skill changes](#skill-changes), last, once both harnesses have Cairn (human decision, 2026-09-25). Re-run the orchestration evals in `openevals/` afterwards.
7. **Trial import.** Deferred. Once Cairn works, bring one existing effort over by hand to see how it looks. Nothing is moved automatically.
8. **Later.** Read-based suggestions, plugin-drafted descriptions, effort hierarchy if tags stop being enough, message-level search, and a UI.

## Open questions

None open. Code mode and the profile wiring were settled on 2026-09-25; see [phase 3 results](#phase-3-results).

## Continuation

State after phase 4, 2026-09-25:

- **Implementation intent.** The human asked for phase 2, then phase 3, then to continue with the next changes, with the skill changes last.
- **Documents.** This file, [the observability pipeline scenario](scenario-observability-pipeline.md), and [TERMINOLOGY.md](../../packages/cairn/TERMINOLOGY.md). The design lives in `docs/cairn/`, the terminology at the package root, as OpenEval does it.
- **Commits.** The package, plugin, and docs were committed in `0cf5925`. The profile wiring, the location grant, phase 4, and this update are uncommitted.
- **Parallel work.** The orchestrator eval work and the `task-evidence` to `task-output` rename landed in `2df1a2d` and `807cccc`.
- **Storage root.** `~/workspace/artifacts/cairn/` exists and holds the live-run test effort `cairn-live-check`. The catalog is at schema version 2.
- **Existing storage.** `~/workspace/scratch/orchestrator-workspaces/` holds about 16 effort folders and `_sessions/opencode/`, in `effort-context`'s current layout. It stays where it is and isn't moved (human decision).
- **Facts checked on this machine:**
  - Node is v26.10.0, and `node:sqlite` loads without warnings (SQLite 3.53.4).
  - `pnpm-workspace.yaml` sets `minimumReleaseAge: 4320`, which is three days.
  - OpenCode is v2.0.16. The newest local plugins declare `@opencode/plugin` 2.0.16, and `omp-advisor` still declares 2.0.0.
  - Claude Code is 2.1.282.
  - `@modelcontextprotocol/server` 2.0.0 is installed for `mcp/discord`, and its `serveStdio` works (phase 1 probe).
- **Phase 1 evidence.** `~/workspace/scratch/orchestrator-workspaces/_sessions/claude-code/d6a428ab-94c2-4a3c-a3b6-aa98dfcbccfc/evidence/work-catalog-harness-verification--main.md`. It has source locations, live probe payloads, probe methods, and the six design changes already applied here.
- **References:**
  - OpenCode source at `~/workspace/references/opencode`. Its `packages/plugin` is 2.0.16, matching the installed version.
  - Local plugins under `opencode/plugins/`, especially `skill-continuity` (tool and context hooks) and `omp-advisor` (event stream), and `opencode/AGENTS.md`.
  - Claude Code hooks reference: `https://code.claude.com/docs/en/hooks.md`.
- **Conversation exporter reference.** `docs/orchestrator/modular-workflows/export-session.py` and [exporter.md](../orchestrator/modular-workflows/exporter.md).
- **Live test setup.** A temporary project with an `opencode.jsonc` that loads the plugin by `file://` URL and adds the MCP server under `mcp.servers.cairn` (`type: local`, `command: ["node", "<repo>/packages/cairn/src/mcp.ts"]`, `environment.CAIRN_ROOT`, `codemode: false`). Run `CAIRN_ROOT=<root> opencode run --standalone --auto --format json` in it, and inspect the result with the CLI against the same root. Since the profile wiring, the global configuration already loads Cairn, so a test needs only `CAIRN_ROOT` set in the environment; without it, the run writes to the real root.
- **Next step.** Phase 5, the Claude Code hooks and transcript adapter, then the skill changes.
