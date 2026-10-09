# Cairn design (draft)

This document turns the later storage-service discussion in [modular workflows](../archive/orchestrator/modular-workflows/design.md#later-storage-service) into a design that can be built. Terms follow [TERMINOLOGY.md](../../packages/cairn/TERMINOLOGY.md). The design was worked out in a design-partner session on 2026-09-24 and 2026-09-25. Decisions attributed to the human were stated or accepted by the human in that session. Everything else follows from those decisions. [How the design evolved](#how-the-design-evolved) records the proposals that were replaced, so they aren't proposed again. [Continuation](#continuation) records the working state for the next session.

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
| Records split by what they describe. Where the work stands lives in the effort's `effort.md`. What is being built and why lives in a design: a stable design at the root when others review it or several efforts share it, or a local `design.md` in the effort's folder for small work and for detail below a stable design. What already exists lives in knowledge articles. A run keeps no record of its own: the catalog's session tree, the repository, and the conversation export already hold it. See [records](#records-and-multi-effort-sessions). | Human, 2026-09-29, replacing the split into `context.md` and a session's `coordination.md` |
| After compaction, the plugin re-injects the session's attached efforts with their record paths. | Human, 2026-09-25; `coordination.md` dropped 2026-09-29 |
| An effort is an outcome, such as a feature or a capability, and not a phase. Design, implementation, review, and follow-up fixes attach to the same effort. Where the work stands lives in `effort.md` and in session descriptions, not in a phase field. A stable design's phases are delivery units, each done by an effort. | Human, 2026-09-25 |
| Work funnels into the current effort. Splitting is explicit, keeps the original's history, and adds `split_from`. There are no parts in the schema. Efforts relate through `depends_on`, `split_from`, and `related` links. Tags are for filtering, and `initiative:` is optional. Sessions attach where the work lands. A reading scope applies: attached efforts are read in full, linked efforts only by summary. See [effort relationships](#effort-relationships-and-splitting). | Human, 2026-09-25 |
| `effort.md` holds only validated state: decisions the human made in working sessions, or items the human accepted at intake. External input (meetings, emails, other people's notes) stays in its own artifacts until the human deliberately promotes it. A meeting is kept as its raw source, a cleaned source, and a summary that separates what was decided, suggested, left open, and assigned. | Human, 2026-09-25 |
| Records for v1: the AI maintains `effort.md` and any local `design.md` in the effort's folder, through Scribe or the orchestrator directly. Cairn generates only `index.md` and doesn't generate an agent brief. There are no size budgets. Size is kept in check by curation (edit in place, remove what's no longer live) and by what each role reads, and the effort view shows record sizes. A curated layer maintained by the human with AI is a future direction. | Human, 2026-09-25 |
| Records describe state: what is settled, the human's views, what was said and by whom, and what is open. They hold no next steps, to-dos, waiting-on lists, planned meetings, or agendas, because those go stale silently and read as instructions to the agents that maintain the files. When the human wants a plan, an agent reads the records and proposes one in the conversation. | Human, 2026-09-29 |
| The stable design is the agreed record of a body of work, not only of a system: the problem and its business value, goals and non-goals, how it works, requirements, phases (each with scope, exit criteria, status, and the effort doing it), and decisions. What changes daily stays in the effort. The test for what goes in the design: would changing it mean telling the people who approved it? | Human, 2026-09-29 |
| A local `design.md` is one connected document written for agents and the human, not the stable design's record format, because records split the understanding from the facts and agents never read the pages that join them. The stable design's `design.md` gains a prose "How it works" that the overview shows. Promoting a local design is a write-up for reviewers, and the stable design supersedes it. | Human, 2026-09-29 |
| Design and effort stay in step by recording each fact once, where it lands, and referring to it by ID everywhere else. `changes.md` is the log a resuming session reads for what changed since the effort's last session. | Human, 2026-09-29 |
| Nothing in `~/workspace/scratch/orchestrator-workspaces/` is moved or imported automatically. Once Cairn works, a trial may bring one effort over to see how it looks. | Human, 2026-09-25 |
| Evidence from before a session attached is found through the catalog (`cairn ls`, the effort index), not moved. | Human |
| The root is `~/workspace/artifacts/cairn/`. Revisit after use. | Human |
| The name is Cairn. MCP tools keep the `catalog_` prefix, because models choose tools by name. | Human, on the assistant's recommendation |
| Durability comes from a daily copy of the database. A text snapshot may come later. | Human, 2026-09-25 (replacing the earlier text-snapshot decision) |
| Vocabulary is fixed in `TERMINOLOGY.md`. | Human |
| Efforts are the human's choice. Agents look up existing efforts and recommend one; the human approves attaching a session, creating a regular effort, promoting, detaching, splitting, and merging. Naming an effort in a request ("capture this into the S3 effort", "resume the S3 effort") counts as approval. See [provisional efforts and approval](#provisional-efforts-and-approval). | Human, 2026-09-25 |
| Orchestration, and a capture that names no effort, create a provisional effort for the task, so its records exist from the first decision. The human promotes it or approves merging it into an existing effort. Default-mode sessions get no effort; their files stay in the session folder. | Human, 2026-09-25 |
| Operational learnings get their own artifact category, `learning`, so later assignments can find them. | Human, 2026-09-25 |
| Cairn is enabled in the `base` profile, beside the skills that use it. | Human, 2026-09-25 |
| What is known about a subject is kept in a knowledge article: one Markdown document per existing subject (an AWS environment, a vendor product, a codebase), written for a reader who never saw the evidence and edited in place as evidence arrives. Evidence stays organized by the question each assignment answered; the article reorganizes it by subject. See [knowledge articles](#knowledge-articles). | Human, 2026-09-29, replacing the assistant's proposal of per-claim findings in the effort |
| Knowledge articles live at the root in `knowledge/`, beside `designs/`, and join efforts through membership, because several efforts rely on one subject and it outlives each of them. Cairn generates `knowledge/index.md`. | Human, 2026-09-29 |
| External input lives at the root in `sources/`: a folder per meeting holding its transcripts and summary, and one file per email, chat, or ticket thread that grows as replies arrive. | Human, 2026-09-29, replacing the session-folder placement and one file per thread per session |
| Cairn is the system for managing the human's work, and the UI is organized around what the human reads: efforts, designs, and the Jira items and Confluence pages around them. Sessions, knowledge and sources are agent material, one step away. See [work tracking](#work-tracking-jira-confluence-and-the-plan). | Human, 2026-10-06 |
| Cairn holds pointers, relationships and descriptions, and nothing that needs curating. Anything curated (the plan, which Jira epic delivers which deliverable) lives in a design, which agents maintain and other people read. | Human, 2026-10-06 |
| A Confluence page or Jira item is a URL pointer: `deliverable` when the work created it, `source` when it's someone else's the work relies on. A page's content goes through intake only when it states something the work must take in. | Human, 2026-10-06 |
| Jira owns work tracking. Cairn stores each registered item's key, type, title, status, parent epic and blocks links as read by an agent, with the time it was read, and never treats them as its own state. | Human, 2026-10-06 |
| A design's phases become its plan: deliverables with what each follows, an optional group, the goals they serve and their Jira items. The plan is a breakdown, not a mirror of Jira: a deliverable can have no Jira item or several. Efforts have no phases, and a design never names an effort. | Human, 2026-10-06 |
| A design doc is published, so nothing in it names or links to an effort, an initiative tag or anything else local to Cairn. | Human, 2026-10-06 |

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

Every session is recorded when it starts, with its parent if it's a child session. Files written anywhere in a session tree have their home in the root session's folder. The root session is described (title and description) once it has substance, and that description labels its conversation export. Until then, the title the harness gives the session, or the first line of its first prompt, stands in; each conversation export refreshes it. A session started by `claude -p` or `opencode run` is a CLI run, linked to the session whose shell started it. That link isn't parentage: the run keeps its own folder and efforts, and the sessions list hides CLI runs by default. Each export also records the session's and its subagents' model usage, priced at models.dev API rates, so a session's cost can be totaled with its subagents and CLI runs.

The harnesses identify child sessions differently. An OpenCode subagent runs in its own session with a `parentID`. A Claude Code subagent has no session of its own: it shares the parent's `session_id`, and hooks identify it by `agent_id`. The catalog records a Claude Code subagent as a child session `claude-code:<agent_id>` whose parent is `claude-code:<session_id>`, so both harnesses produce the same session tree.

### Efforts

An effort is a named body of work you want to come back to. There is no nesting. A session attaches to any number of efforts, and an effort gathers any number of sessions. A session that covers both AWS deployment and ASA ingestion attaches to both.

An artifact's membership in an effort is derived: the artifact belongs to the efforts of the nearest session in its producer's ancestry that has any attachment, starting with the producer itself. So an unattached explore subagent's evidence joins its root session's efforts, while a delegated orchestrator attached to its own effort doesn't also feed Chief's. A file written into an effort's folder also belongs to that effort. When that's too broad, an agent can set membership explicitly for one artifact, either restricting it to some of the session's efforts or adding another effort.

### Provisional efforts and approval

Which efforts exist, and which sessions belong to them, is the human's organization of their work, so agents recommend and the human decides:

- **Look up, then recommend.** Once a conversation has a clear subject, the agent searches with `catalog_find` (text and tags) and names the match and why it fits: "This looks like part of *Logs archived to S3*. Attach it?" With no match, it offers a new effort with a title named for the outcome. It asks once, and again only when the subject changes. Work continues while the question is open: the session's files already live in its folder, and attaching later brings them along.
- **Approval.** The human approves attaching a session, creating a regular effort, promoting a provisional one, detaching, splitting, merging, and excluding a file from an effort. Naming an effort in a request counts as approval. Subagents inherit the efforts of their root session, and Chief's workstream keys group sessions without being efforts, so neither needs a question.
- **Provisional efforts.** Orchestration needs its records from the first decision, before the human has answered. So entering orchestration, or capturing work without naming an effort, creates an effort with status `provisional` for the task and attaches the session to it. It spans sessions like any other effort, so a later session can resume it. The human then either promotes it (status `active`, renamed if the title needs it) or approves merging it into an existing effort. Before a merge, the agent folds the provisional `effort.md` into the target's, since `merge` moves sessions, files, tags, and links but leaves record files behind. A provisional effort that is never promoted stays as history.
- **Default mode.** Sessions that aren't orchestrating get no effort unless the human asks for one or approves a recommendation. Their evidence stays in the session folder and is described like any other file.

`catalog_find` and the effort list label provisional efforts, and the duplicate check on create includes them. Recommendations prefer regular efforts. The tools don't enforce approval; the skills carry the rule.

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
1. **Work funnels into the effort you're in.** A new session finds the matching effort through `catalog_find` and recommends it, and once the human approves, research, design, and implementation accumulate in one effort. Naming the effort for its outcome ("Logs archived to S3") keeps it stable when the approach changes, because the approach (OPW) is a decision in its design.
2. **No parts in the schema.** Parts are prose in `effort.md`, or phases in a stable design. Labeling sessions with parts requires knowing the parts in advance, which you don't.
3. **Splitting is explicit.** An agent may suggest a split, and the human decides. Signs that a piece should split off:
   - it has its own approval or delivery;
   - other efforts need only that piece;
   - its sessions no longer concern the rest of the effort.

   `catalog_effort` with `split` creates the new effort, adds a `split_from` link, and includes the chosen existing sessions and files. It removes nothing from the original. New sessions for that piece attach to the new effort. The original keeps its remaining scope. After the OPW deployment splits off, "Logs archived to S3" still owns the destination design: bucket layout, prefixes and partitioning, retention, encryption, and the permissions that writers get.
4. **Links between efforts carry relationships.** The relations are `depends_on` (A needs B), `split_from`, and `related`. Links are read in both directions, so add a `depends_on` only in the blocking direction and never add the reverse. When two efforts would depend on each other, split out the shared piece if it has its own life. Otherwise keep one direction and let the other effort read through the link. Relationships found late, such as ASA deciding to reuse OPW, become links when they're found.
5. **Attach where the work lands.** A session belongs to every effort whose state it changes, and records each decision where it lands: about the work in that effort's `effort.md`, about the system in its design. The agent recommends each attachment and the human approves it. The ASA session that widened OPW's scope attaches to the OPW deployment effort too. A session that only needs background reads a linked effort without attaching, so its files don't flood that effort's view.
6. **Reading scope.** Each `effort.md` opens with a short summary: the outcome, where it stands, and key decisions. A session reads:
   - the full `effort.md` of each effort it's attached to, and the designs it works on;
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

An artifact is a file under the root, an external file, or a URL. Each has a **category** (`evidence`, `source`, `synthesis`, `deliverable`, `record`, `conversation`, `learning`, `other`), a title, and a description. A `learning` is a producer's operational lesson, such as how to run a command or a gotcha in the code, kept apart from its response so coordinators can pass it to later assignments.

URL artifacts also get a **pointer type**, derived from the URL by the service: `pull_request`, `issue`, `jira_issue`, `confluence_page`, or `url`. That lets an effort view list its PRs, Jira items, and Confluence pages directly. Agents register URLs with `catalog_describe` when they create or rely on them, for example after opening a PR or publishing a page.

Material that isn't a link is handled by where it lives:

| Material | How it's stored | Category |
| --- | --- | --- |
| Email, chat, or ticket thread | One Markdown file per thread at `sources/<kind>/<thread>.md`, through a connector or pasted in, with later replies appended. An optional `origin` field keeps the source message ID or link. | `source` |
| Meeting | A folder at `sources/meetings/<date>-<subject>/`. The recording as a pointer (external file or URL, never copied). The raw transcript or notes as Markdown. A cleaned transcript, with the raw one kept and linked with `informs`. A summary whose description is a short abstract. See [external input and intake](#external-input-and-intake). | recording and transcripts `source`; summary `synthesis` |
| What is known about a subject | A knowledge article at `knowledge/<subject>.md`. See [knowledge articles](#knowledge-articles). | `knowledge` |
| PR, issue, Jira item, Confluence page | A URL pointer with a derived pointer type | `deliverable`, or `source` when it's input rather than output |

### Knowledge articles

Evidence is organized by the question each assignment answered: one file per assignment, in the order the questions came up. A session that explored an AWS environment can leave ten such files. A later session, or a design, needs the same understanding organized by subject, and reading every file again to rebuild it doesn't scale. A knowledge article is that subject-organized document.

- **What earns one.** An article describes one existing thing as it is: an AWS environment, a vendor product, a codebase, another team's service. The test is whether a later session would otherwise have to reread the evidence, or redo the research, to understand it. Single facts don't earn a file. Lists of separate claims were considered and rejected, because they can't carry a connected model such as how accounts, VPCs, and routing fit together.
- **Depth.** As deep as the subject needs: tables, diagrams, the layout, the boundaries, the unknowns. Each section says when it was last known true and which evidence supports it. Raw detail, such as full route table dumps, stays in the evidence and is linked.
- **Current state.** It is edited in place when new evidence arrives. Superseded content comes out, since the evidence keeps the history. Disagreement between sources is stated where it applies rather than resolved silently.
- **Designs and articles.** A design records what is being built and why, with decisions. An article records what exists, and decides nothing. A design's evidence item copies the claim it rests on, because the design must stand alone, and cites the article's section in `Recorded from`.
- **Where it lives.** `knowledge/<subject>.md` at the root, or a folder when it needs sub-pages or pictures (`cairn mv` keeps its identity). It joins the efforts of the session that first wrote it, and an agent adds other efforts with `efforts.include` when their work relies on it or adds to it. Reading an article for background adds nothing.
- **Writing up.** On the human's request, an agent writes up evidence into an article: it looks for an existing article on the subject first, then writes or updates it, and links each evidence file it used with `informs`. A large write-up can be a dispatched assignment whose output file is the article.
- **Finding them.** `catalog_find` with category `knowledge`, the effort view's Knowledge group, and the generated `knowledge/index.md`, which lists each article with its efforts, how many files inform it, and when it last changed. In the effort view, each file that informs an article says which one, so evidence that hasn't been written up yet stands out.
- **Origins and references.** Evidence says which investigation found something; it doesn't say where to look to check it again. An **origin** is a system knowledge comes from (an AWS account, a Datadog org, a repository, a Confluence space, a documentation site), described once in the catalog with its kind, identifier, and access methods: how to reach it from here, such as an AWS CLI profile or an MCP server, never a credential. A **reference** records what one article looked at inside an origin: a locator precise enough to look again, the sections it supports, and when and at which version it was observed. Origins are shared, so one look at an account can serve several articles, and an origin's references show which articles to re-check when it changes. Kinds are an open list that grows as agents register origins, each saying what its identifiers are. A system you reach as one place is the origin; a page, ticket, resource, or path inside it is a reference's locator.
- **Re-checking.** On request, an agent lists an article's references oldest observed first, looks at each again through its origin's access methods, corrects the article where the origin changed, and records the new look. Nothing between re-checks claims an article is current: freshness is the dates and versions on its references, and origins carry none.

Articles are working material in the catalog. Promotion into a personal knowledge base is a separate step with its own authority.

### External input and intake

Some material arrives from outside the working sessions: meetings, emails, a colleague's notes. It carries decisions, suggestions, and to-dos, but none of it is validated. A colleague's "that sounds good" in a meeting isn't an accepted decision. So external input is kept as artifacts, and only a deliberate intake with the human moves any of it into `context.md`.

**Processing a meeting** (a short session after the meeting, attached to the efforts it concerned so the meeting appears in their views). Its files go in one folder, `sources/meetings/<date>-<subject>/`, so the summary, which intake works from and designs cite, stays beside the transcripts it summarizes:
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

Processing never writes to any effort's or design's records.

**Intake** is a deliberate session with the human, right after processing or days later, that works through the summary's candidates:
- **Accept** a decision: the agent writes it into the `effort.md` of the effort it concerns when it's about the work, or into the design it concerns with a `changes.md` entry, citing the meeting summary. Wording may be adjusted as the human confirms it.
- **Accept** a stated fact about an existing system: it goes into that subject's knowledge article, citing the summary.
- **Adjust or discuss:** talk it through first. What comes out is the human's decision, recorded as above.
- **Reject or defer:** it stays in the summary, marked as such.
- **Open questions:** become open questions in the design or `effort.md` only if the human wants to pursue them, with who was asked, when, and through what.
- **Action items:** stay in the summary with their owners, as said. Records don't copy them; team-tracked items become Jira items, registered as `deliverable` pointers.

The intake session attaches to the efforts whose records it changes ("attach where the work lands"). It records the outcome for each candidate in the summary's Intake section, so nothing is reviewed twice.

The same intake applies to other external input, such as an email thread with questions or a colleague's design notes. Processing an email is lighter: save it as a `source` file at `sources/email/<thread>.md`, appending later replies to the same file, with an optional summary.

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
human approves ── catalog_session ──▶ session description, attach effort(s),
                                      workstream key/subject (orchestrators)
turn complete  ── plugin ──▶ conversation export updated
any change     ── service ──▶ effort index.md regenerated
compaction     ── plugin ──▶ note: attached efforts + record paths
meeting/email  ── session ──▶ source + cleaned source + summary (candidates, action items)
intake         ── session with the human ──▶ accepted items into the design or effort.md; summary marked
daily          ── service ──▶ database copied to backups/
```

1. **Session start (plugin).** The plugin runs `cairn session start` with the session ID and, for child sessions, the parent ID. The command is an idempotent upsert, and plugins also call it the first time they see a session in any other event, because a start event can be missed. It injects the session ID into context. The attached efforts come later, with the compaction note, or from `catalog_find` when a session resumes an effort.
2. **File written (plugin).** For a write under the root, the plugin runs `cairn capture`, which upserts the artifact by path with its hash and producing session. The plugin appends a note to the tool result telling the agent to describe the file. Files outside the root are ignored. Capture never blocks or fails the tool.
3. **Describe (producer).** The agent that wrote the file calls `catalog_describe` with a category, title, and one-sentence description. The parent adds `informs` or `supersedes` links as it uses results, and describes a file only if the producer didn't.
4. **Attach (the session's lead agent, with the human's approval).** Once the work has scope, the root session's agent looks up efforts with `catalog_find` and recommends one (see [provisional efforts and approval](#provisional-efforts-and-approval)). On approval it calls `catalog_session`, which describes the session and attaches one or more efforts, existing or new. Orchestration creates a provisional effort instead of waiting. Before creating an effort, the service checks for similar active, paused, or provisional efforts and returns them instead, unless the agent confirms a new one. Attaching later is fine: membership is derived through the session, so earlier files join automatically.
5. **Read (plugin).** For a read under the root, the plugin records `read_in`. This shows which sessions actually used which material. Suggested `informs` links built from these reads are a later experiment.
6. **Turn complete (plugin).** Root sessions only. See [conversation indexing](#conversation-indexing).
7. **Derived views (service).** There is no long-running process, so a change marks each affected effort as dirty in the database. The hot-path commands (`session start`, `capture`, `read`) only mark. Every other command, and the turn-complete `session index`, regenerates the dirty efforts' `index.md` before it exits.
8. **Compaction (plugin).** After compaction, the plugin adds a factual note listing each attached effort with the paths of its `effort.md` and local `design.md`, and the stable designs it works on. The agent rereads what it needs. This replaces relying on the orchestrator to remember where its records are.

## Retrieval

The effort view is the primary way back into work. `catalog_find` and the generated index both provide it.

- **Effort list:** filter by tag (`initiative:observability-pipeline`), status, or text. Each effort shows its title, description, status (so provisional efforts stand out), tags, session count, artifact count, and last activity.
- **Effort view:** its `effort.md` summary, its linked efforts with their status (`depends_on`, needed by, `split_from`, `related`), then every artifact from every attached session plus explicit members, **grouped by category** by default, with titles, descriptions, paths, and pointer types. PRs, Jira items, and Confluence pages each get their own group. Grouping by session and filtering to one session are options. Each artifact shows its producing session's title so provenance stays visible.
- **Sessions of an effort:** the session titles and descriptions, with links to their conversation exports.
- **Chief loop:** find sessions by `workstream` or `subject`.
- **Knowledge:** `knowledge/index.md` lists every article with its efforts, how many files inform it, and when it last changed.

The generated `efforts/<slug>/index.md` renders the default effort view as Markdown with relative links. It is a view only. Agents don't edit it, and the database remains the source of truth.

## Data model (v1)

Rows have internal integer IDs. Interfaces use natural keys (see [Stack](#stack)): sessions as `<harness>:<native-id>`, efforts by slug, artifacts by path or URL, and origins as `<kind>:<identifier>`.

```text
session     id, harness, native_id, parent_session_id?, root_session_id,
            title?, description?, cwd, agent?, workstream?, subject?,
            started_at, last_activity_at,
            export_artifact_id?, watermark_json?, indexed_at?, last_error?
effort      id, slug, title, description, status(provisional|active|paused|done|archived),
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
jira_item   artifact_id, issue_key, issue_type?, status?, status_category?, parent_key?, blocks, read_at
confluence_page artifact_id, space?, version?, page_updated?, read_at   -- what an agent last read
origin_kind id, name, identifier, description, created_by, created_at      -- identifier says what the kind's identifiers are
origin      id, kind_id, identifier, title, description, created_by, created_at, updated_at   -- unique (kind, identifier)
origin_access    origin_id, method, detail                                  -- how to reach it from here
origin_reference id, artifact_id (a knowledge article), origin_id, locator, title, sections,
                 observed_at, version?, recorded_by                         -- unique (article, origin, locator)
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
    <workstream-key>/        a delegated orchestrator's files, apart from parallel workstreams
    …                        anything else written by the session tree; names are up to the skills
  efforts/<slug>/
    index.md                 generated effort view
    effort.md                where the work stands: summary, its design and phase, views, decisions, open questions
    design.md                optional: a design local to the effort, one connected document
    …                        other material deliberately written to the effort
  designs/<slug>/            a stable design, named for its subject (owned by the design-docs skill)
  knowledge/
    index.md                 generated list of articles
    <subject>.md             a knowledge article, or <subject>/ when it needs sub-pages
  sources/
    meetings/<date>-<subject>/
      transcript-raw.md      the raw transcript or notes, unchanged
      transcript.md          cleaned
      summary.md             candidates and action items, with the Intake outcome
    email/<thread>.md        one thread, replies appended (chat/ and tickets/ alike)
```

`designs/`, `knowledge/`, and `sources/` are named for their subjects rather than the work, because each outlives the sessions and efforts that touch it, and their paths are composed from the subject. `catalog_location` returns a path in the root session's folder by default. With `effort` set, it returns a path in that effort's folder, for material meant to outlive the session. Chief's delegated orchestrators get a subfolder named by workstream key inside the root session folder, so parallel workstreams don't collide. Files never move automatically, and `cairn mv` moves a file while keeping its identity.

`catalog_location` records which session each path was handed to, and never hands the same path out twice. A file written there that no capture records, for example by a shell command, is credited to that session when it is first recorded, by a read or by `catalog_describe` without `session`. Provenance then still doesn't depend on the model knowing its own session ID.

### Records and multi-effort sessions

Records are split by what they describe, not by who writes them, and they describe state, never next steps. `effort.md` holds where the work stands: a summary, the design and phase it serves, the human's views, decisions about the work, and open questions with who was asked and when. What a system is and why goes in its design, and what exists in knowledge articles. External input reaches any of them only through [intake](#external-input-and-intake). A run keeps no record of its own: its sessions and their files are in the catalog, its code is in the repository, and its conversation is exported.

A session attached to several efforts reads the `effort.md` of each one. It writes each decision to the effort it concerns, the way you'd keep one notebook per project. A decision that really affects both goes in both, or in the one that owns it with a link from the other. Most sessions attach to only one effort.

Orchestration is scoped work by definition. So selecting `orchestrate` or `orchestrate-chief` attaches the session to an effort before the first decision: one the human named or approved, otherwise a new provisional effort (see [provisional efforts and approval](#provisional-efforts-and-approval)). The effort's records exist from the start. Quick, unattached sessions never need an `effort.md`. Two sessions editing the same `effort.md` at the same time is possible, as it is today. v1 accepts that risk rather than adding locking.

**Who maintains and who reads.** The AI maintains the effort records: Scribe where the harness supports it, otherwise the orchestrator directly. The records are current state, edited in place, so they stay at the size of what's still live. Superseded detail is removed. The conversation exports keep the history. What each role reads by default:

| Reader | Reads by default |
| --- | --- |
| Human-facing orchestrator (direct or Chief), on resume or after compaction | `effort.md` and any local `design.md` of each attached effort in full, each linked stable design's `design.json` with the `changes.md` entries since the effort's last session, and the summary of linked efforts |
| Scribe | The human-facing session's context and the records it maintains |
| Delegated orchestrator | Its workstream's files, plus what its brief selects from effort records and designs |
| Producers (explore, worker, reviewer, …) | Only the context and pointers their brief supplies |
| Intake session | The input's summary, and the `effort.md` and design of each effort it concerns |

Scribe learns the session's attached efforts from `catalog_session` or the compaction note, and routes each established decision to the effort it concerns. The effort view shows each record's approximate token size, so growth is visible. Cairn never warns or blocks on size.

Each profile has its own root and database. Work material stays in a work profile's catalog, and there is no code difference between profiles.

### Stable and local designs

Efforts come in every size, from a feature built in one session to one phase of an initiative that needs approvals, so a design lives in one of two places:

- **Stable design** (`designs/<slug>/`, `design-docs`): the agreed record of a body of work, shared by the efforts on it and shown to the people who approve it. Its `design.json` holds prose (the problem and business value, goals and non-goals, how it works) and then the records: facts, requirements, phases, decisions with their options, parts, risks and questions; `evidence.json` and `meetings.json` hold the evidence and the meetings, each meeting with the proposals the human settled and the outcomes they became. Each phase names the effort doing it, and its status lives only there.
- **Local design** (`efforts/<slug>/design.md`): the design of something small, or the detail below a stable design. It is one connected document for agents and the human (problem and goals, the approach, how it fits together with a diagram in text, decisions with their reasoning, open questions, and what it rests on), because a local design's readers are agents and the human, not reviewers.

A local design is promoted by writing it up as a stable design once others need to see it, another effort needs it, or it outlives the effort. The stable design supersedes it. The readers change, so it is a write-up, not a move.

**Keeping them in step.** A settled question or decision is recorded once, where it lands: about the system, in the design with a `changes.md` entry citing the session or meeting; about the work, in `effort.md`. Everything else refers to it by ID. A session picking an effort up reads the `changes.md` entries since the effort's last session and checks anything in the effort that cites a changed ID.

### Bringing existing material in

Material from before an effort had records, such as earlier sessions' notes, evidence, meeting notes, and exported email, is usually too large to read in one context. The `effort-context` import operation brings it in through passes, each reading only what the one before selected and each ending with the human:

1. **Inventory:** copy the files into the session folder and describe every one, so the effort view becomes the map.
2. **Framing:** from the syntheses and notes, draft the problem, why it matters, goals, scope, and candidate requirements, attributed to whoever said them, and take them through intake. Accepted framing becomes the lens for the later passes.
3. **Sources and knowledge**, in parallel: meetings and threads into `sources/` with their candidates, and evidence written up into knowledge articles.
4. **Design:** options, decisions, open questions, and phases, citing the articles and accepted sources.

## Work tracking: Jira, Confluence and the plan

Decided with the human on 2026-10-06, from the redesign mocked in `cairn_design.pen` ("Cairn redesign" and the design doc's Plan and Links pages).

**The split.** Cairn records where things are and how they relate; a design records what has been agreed. Cairn's share must stay cheap for agents to keep current: registering a link is one `catalog_describe`, and Jira details are re-read only when someone asks. The design's share is curated, because its agents maintain it carefully and other people read it.

**Confluence pages and Jira items** are URL artifacts with a pointer type, as before. The category says the role: `deliverable` for what the work created (a design published for review, a runbook, a ticket you opened), `source` for someone else's page or ticket the work relies on. Each carries a description of why it's there. A page's content becomes evidence or goes through intake only when it states something the work has to take in; most pages are just listed.

**Jira details.** When an agent reads a Jira item (through the Atlassian MCP server, since Cairn can't reach Atlassian), it records on the pointer the item's key, type (epic, story, task, bug), title, status and status category, parent epic, and the keys it blocks, with the time it read them. Cairn shows these as read, labelled with that time, and never as its own state. Dependencies between items use Jira's own "blocks" links.

**The plan.** A design's phases become its plan: deliverables `P1`, `P2`… each with scope, exit criteria, status, the deliverables it follows, an optional group, the goals it serves, and its Jira items (usually an epic, any number, or none). The plan is how the work is broken down, not a copy of Jira, and stories come and go under their epics as the work is found. The design names no effort. Which deliverables an effort works on is derived: a deliverable whose Jira items are included in the effort. The design doc gets a Plan page (goals, the dependency map of deliverables, and the deliverables table, each opening in a modal) and a shared Links page (Confluence pages by role, the Jira items grouped by deliverable as last read, and other links).

**The UI.**
- **Sidebar.** Work: Efforts, Designs, Jira and Confluence. Agent material: Sessions, Knowledge, Sources. No list of initiatives and no usage page; a session's cost shows on the session.
- **Effort page.** An Overview tab first: where the effort stands, the designs it delivers with their plan progress, its Jira items as a canvas with one lane per epic (stories inside, "blocks" arrows between them, a lane for stories with no epic), its Confluence pages as created and referenced, other links, and related efforts. A lane names the plan deliverable its epic delivers when a design links that epic, worked out at display time. The Material tab holds the effort's files as before, and Sessions its sessions.
- **Jira and Confluence.** One page, tabbed, listing every registered Confluence page and Jira item across efforts, filtered by created or referenced and grouped by effort.

## Durability

The database is the only place descriptions, attachments, links, and tags exist. If it were lost, the files would survive, and `cairn check` could rediscover them, but only as undescribed files with no efforts. Once a day, on the first write of the day, Cairn runs `VACUUM INTO backups/catalog-<yyyy-mm-dd>.db` and keeps about seven copies. `cairn backup` makes a copy on demand. `cairn restore <file>` copies a backup back into place after checking its integrity. A text snapshot (sorted JSONL) is deferred. It only pays off once the root is tracked by git or a sync service.

## Interfaces

### MCP tools

| Tool | Purpose | Returns |
| --- | --- | --- |
| `catalog_session` | Describe a session and set its attachments. Inputs: `session`, optional `title`, `description`, `attach[]` (effort IDs, or `{ create: { title, description, tags[] }, confirm_new? }`), `detach[]`, `workstream`, `subject`. | Session, attached efforts, close-match efforts when creating |
| `catalog_describe` | Describe an artifact, or register a URL or external file. Inputs: `path` or `url`, `category`, `title`, `description`, optional `origin`, `efforts` (`include[]`, `exclude[]`), `informs[]`, `supersedes[]`, and for a Jira item's or Confluence page's URL what an agent read about it: `jira` (key, type, status, category, parent, blocks, read_at) or `confluence` (space, version, updated). Idempotent on path or URL; each read replaces the last. | Artifact with its efforts |
| `catalog_find` | Pointers. Target `efforts`, `sessions`, or `artifacts`. Filters: `effort`, `session`, `tag`, `category`, `pointer_type`, `workstream`, `subject`, `status`, `text`, `group_by` (`category` or `session`), `limit`. | Pointer entries, never contents. Undescribed artifacts are flagged. |
| `catalog_location` | A collision-free write path. Inputs: `session`, `topic`, optional `effort`. | Absolute path |
| `catalog_effort` | `create` or `show` an effort, or `update` its title, description, status, or tags. Also `rename`, `split` (a new effort with a `split_from` link and chosen sessions and files included, removing nothing from the original), and `merge`. One flat input object, because MCP tool inputs must be objects. | The effort, or for `show` the effort view |
| `catalog_link` | Add or remove links between artifacts (`informs`, `supersedes`, `related`) or between efforts (`depends_on`, `split_from`, `related`). Accept or reject suggestions. | Links |
| `catalog_origin` | `kinds` lists kinds and what their identifiers are; `find` searches origins by kind or text; `register` adds an origin (`<kind>:<identifier>`, title, description, `access[]`, and `new_kind` for a kind not yet listed), or returns the existing one and adds any new access methods; `update` changes its title, description, or access methods. One flat input object. | Kinds, or origins with access methods and how many articles and references use them |
| `catalog_reference` | `record` a reference from a knowledge article to an origin (`locator`, `title`, `sections[]`, `observed_at`, `version`), or a new look at an existing one, which replaces its observed time and version; `list` an article's references oldest observed first, or every reference to an origin; `remove` one. One flat input object. | References, and for `list` their origins with access methods |

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
cairn origin kinds | find [--kind] [--text] | register <kind:identifier> ... | update <kind:identifier> ...
cairn reference record <article> <kind:identifier> <locator> ... | list --article <path>|--origin <key> | remove ...
cairn ls [<effort>] [--by session]                   human browsing
cairn check      mark missing or changed files; find moved files by hash; capture uncaptured files;
                 report reference sections an article no longer has
cairn mv <artifact> <new-path>
cairn index      regenerate every effort's index.md
cairn backup | restore <file>
```

### Harness integration

| Event | OpenCode plugin | Claude Code hook | CLI call |
| --- | --- | --- | --- |
| Session created | First sight in the `context` hook, which runs before a session's first model request: `session.get` supplies `parentID`, `agent`, `title`, and `location` | `SessionStart` for the main session; `SubagentStart` (`agent_id`, `agent_type`) for subagents, with the title and nested parent from the subagent's `.meta.json` on every later subagent event, including `SubagentStop` | `session start` |
| Session ID into context | `context` hook opens the request's messages with `This session's catalog ID is opencode:<id>.` (a message, so the system text stays the same in every session), and for a child session, where its result is saved and the learnings path it was granted | `additionalContext` from `SessionStart`, and from `SubagentStart` for the subagent's ID | none |
| File written | `tool` `execute.after` for `write`, `edit`, and `patch`; the hook appends the capture note to `result.content`, except for a subagent's learnings file | `PostToolUse` on `Write\|Edit\|MultiEdit\|NotebookEdit`, with the note as `additionalContext`; `agent_id` selects the subagent's session | `capture` |
| File read | `execute.after` for `read`, for in-root paths | `PostToolUse` on `Read` | `read` |
| Subagent returned | `execute.after` for `subagent` in the foreground; a `synthetic` item in `session.inbox.enqueued` with `metadata.source: "subagent"` in the background. The plugin writes the result to a granted path, credits the child, describes the result and any learnings with a small model through `generate.text`, and for a background result adds its saved-path note to the result itself in the parent's `context` hook, after the `<subagent>` element | none | `location`, `capture`, `describe` |
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
- **Format.** Each message is a `##` heading followed by its text. The heading gives the role, the time in UTC, the seq, and the message ID. When they apply, it adds the part index (only when the message has more than one text part), OpenCode's phase, the context, and the number of attachments left out.
- **Context.** The tokens in the context window once the message was in it. For an assistant message, that is its model call's prompt (fresh input plus cache reads and writes) plus the call's output. A human message is first read by the next model call, so its figure is that call's prompt. Claude Code records usage on each assistant entry, and each OpenCode assistant message is one model call with its `tokens`. The context window's size isn't recorded, so there is no percentage.
- **Compactions.** A heading with no body marks each compaction, with its trigger (`manual` or `auto`). Claude Code's `compact_boundary` records the context before and after (`context 236,390 → 16,951`). For OpenCode, whose `compaction` message has no counts, the heading gives the last assistant message's context as the figure before. Failed OpenCode compactions are left out, since they left the context as it was. The summary stays out. The first version copied the reference exporter's HTML comment markers around each body, with the body's SHA-256. Nothing read them, so they were dropped (human decision, 2026-09-25). A message whose own text has a `##` heading therefore reads at the same level as the message headings. Claude Code wraps pasted text in `<pasted_content id="…">` tags, whose ID only pairs the opening and closing tags; the export keeps the pasted text and drops the tags.
- **Incremental update.** The watermark is `{ last_seq, tail_hash, length, format }` for both harnesses. For Claude Code, `seq` is the transcript line number. Append when the stored tail still matches, and do a full rewrite when the source has shrunk or changed, or when the file was written in an older format. Write to a temp file and rename it into place.
- **Claude Code transcript lag.** At `Stop` the transcript may not yet hold the final assistant message. The export covers what the transcript holds, then adds `last_assistant_message` as a provisional tail outside the watermark, which the next run replaces with the transcript's version. The next `Stop`, a `SessionStart` with `source: resume`, or a sweep reconciles it.
- **Concurrency.** A lock file per session makes duplicate triggers no-ops. SQLite uses WAL and `busy_timeout`, with one connection per process.
- **Failures.** They are logged and recorded as `last_error`. `--full` or a periodic sweep reconciles missed events.

- **Content rules**, carried over from the [modular workflows discussion](../archive/orchestrator/modular-workflows/design.md#main-session-conversation-history):
  - Keep actual human messages and assistant text, including commentary.
  - Exclude hidden reasoning, tool calls and results, injected system or skill instructions, synthetic notifications, and subagent transcripts.
  - Disclose attachment counts rather than presenting a text-only export as complete.
  - Keep native message locators so statements can be cited.
  - An export shows what the assistant claimed, not proof that it verified anything. Evidence files carry the proof.
  - A later analysis of how thinking evolved must keep three things apart: what the human said, what the assistant proposed, and what the analysis infers.

Message-level rows and full-text search wait until cross-session "how did my thinking evolve" queries show a need.

## Skill changes

This table is the phase 6 plan. The [records revision](#records-revision) later replaced `context.md` with `effort.md` and `approach.md` with a local `design.md`, and removed `coordination.md`.

Skills stay short, because the plugins handle the mechanics and the capture note carries the per-file reminder. `effort-context` owns the effort rules and the storage layout once, and the other skills point to it.

| Skill | Change |
| --- | --- |
| `effort-context` | Storage: the parent gets paths from `catalog_location`, in the session folder by default or with `effort` for material that outlives the session. Records: `context.md` and `design.md` in the effort folder, `coordination.md` and Chief workstream folders in the session folder; `index.md` is generated, and the `sessions/<id>.md` markers are retired. The effort rules: look up and recommend, the human approves, provisional efforts for orchestration and unnamed captures, promotion and merge. Capture: attach or create a provisional effort, write validated state to `context.md` and the run's state to `coordination.md`, describe existing files. Resume: `catalog_find`, the effort view, each attached effort's `context.md`, then attach the new session. A line for reading efforts still in the old `orchestrator-workspaces` layout. Claude Code continuity reads `conversation.md` before the raw transcript. |
| `learnings` | What a lesson records. A subagent writes to the learnings path its context names; the plugin describes it as category `learning`. Replaced `task-output`, whose response files the plugin now writes. |
| `orchestration` | On entry, attach the named or approved effort, or create a provisional one, before the first decision. Keep the work's state in each effort's `context.md` (and `design.md`), and the run's state in the session's `coordination.md`. Chief puts a `workstream` key and optional `subject` in each orchestrator brief, and checks for existing workstreams by subject before dispatching. Evidence selection uses `catalog_find`. Register PRs and published pages with `catalog_describe`. |
| `design-partner` | Once the design has a subject, recommend an effort. Attaching creates no records unless a capture is requested. |
| Agents | `research`, `architect`, and `pr-reviewer` return their result in their final message, which the plugin saves. `base` lets `architect` and `inspect` edit under the Cairn root. |

## Rationale for key choices

| Choice | Why |
| --- | --- |
| Pointers only, never file contents | It keeps the MCP surface small, and harness file permissions stay authoritative. Large content doesn't pass through tool results twice. The human explicitly didn't want agents reading through the MCP server. |
| Plugins capture facts, agents describe | Facts (path, hash, writing session, parent chain) can be recorded with no model and never forgotten. Only a model can say what a file means. The plugin receives the native session ID from the harness, so provenance never depends on the model knowing its own session ID. That removes the hardest identity problem from capture. |
| The producer describes, not the parent | The producer has read every source, while the parent sees only the return digest. Describing costs the parent's context nothing. The earlier decision was that the orchestrator isn't the catalog clerk. The human noted that the parent reads the files anyway and questioned the cost argument, but accepted that the producer describes and the parent adds relationships. |
| The capture note in the tool result | It reminds the producer at the moment of writing, so the reminder doesn't depend on skill guidance being remembered. |
| The plugin saves subagent results, and a small model describes them | The parent read every response file in full, so a result in the tool output costs it nothing more, and the saved copy is only the record. Subagents need no output skill or reply format, and the built-in Explore agent, whose prompt forbids writing reports, is covered too. Describing a finished response is an easy task for a cheap model, and runs in the background. Relationships such as `supersedes` and `informs` still come from agents that know them. |
| Session first, efforts optional and many-to-many | Sessions span several efforts, and quick work has no effort. Resuming work means looking at an effort's sessions and files together. Sessions are the unit the harness gives for free. Efforts are the durable subject you come back to after sessions end. |
| Files live with their session | Attaching, detaching, and regrouping efforts never moves a file. A file relevant to two efforts needs no copy. Membership is derived through the session, so attaching late needs no back-fill. |
| Flat efforts with namespaced tags | Grouping will keep changing, and one effort can relate to several groups. The UI need for an initiative level is met by treating `initiative:` tags as a grouping level. Converting to real parents later is mechanical. |
| No tags on artifacts | Category, effort membership, and description covered every example that came up. |
| Workstreams represented by sessions | A workstream is one orchestrator's delegated work. Its session, and any replacement session with the same key, already carry its files. A separate container duplicated the effort in the common one-to-one case. |
| Chief sets workstream keys explicitly | Chief must check the subject before dispatching ("does PR 123 already have one?"), so it's already making that call. Auto-creating on orchestrator session start would duplicate a workstream when Chief replaces a stale orchestrator. Detecting from new folders would create the container before anything said what it was. |
| Duplicate-effort check on create | Many sessions work on the same thing. Without a check, each would create its own effort. |
| No prescribed file names | The catalog stays loose, so structure can grow later. Anything under the root is captured and described. Record names such as `effort.md` belong to the skills. |
| Daily database copy for durability | Relationships exist only in the database, and metadata in files was rejected because agents can't be relied on to write it. A text snapshot is readable and diffable, but nothing tracks the root yet, so a `VACUUM INTO` copy covers the real risk with less code. |
| Records split into the work's state and the run's state | The old per-effort folder mixed state that lives as long as the effort with state that lives only for one run. Once a session can serve several efforts, only this split answers "which design file do I use?". |
| Effort is the outcome | When implementation starts, the design's evidence, decisions, and open questions are already in the same effort. Splitting by phase would force every implementing session to find and attach the design effort as well. |
| Root in `artifacts/`, not scratch | The workspace puts mutable outputs that don't belong to a project in `artifacts/`. Scratch implies disposable, which conflicts with the database holding durable organization. |
| MCP for agents, CLI for plugins | Read-only producers such as `explore` often lack shell access, and MCP tools can be allowed for them without Bash. Plugins and hooks need a fast process call, with no MCP client. |
| Its own package in `mfz-home` | It can be iterated on separately from the Mindframe-Z runtime. Moving it into Mindframe-Z later means relocating `src/core`. |
| Built-in `node:sqlite` and MCP 2.0 packages | There is no native dependency. `mcp/discord` already uses the 2.0 split packages, so this matches the home. |
| Origins shared, references per article | Re-checking and impact both work per system: one look at an account can refresh several articles, and when a system changes, its references list the articles to check. Copies per article would drift into different names for the same place. What each article looked at differs, so that lives on the reference (human decision, 2026-10-06). |
| Origins and references in the catalog, not files | They are relationships and metadata, which the catalog owns. Agents need lookups ("is this account registered?"), several sessions write them at once, and JSON files beside the catalog would be a second authority (human decision on the assistant's recommendation, 2026-10-06). |
| No status on origins or references | A stored "current" or "changed" is only true at the moment of a re-check and goes stale silently between them. References carry what was actually known, the observed date and version; origins carry nothing time-based, because a system isn't true or false (human decision, 2026-10-06). |
| Open origin kinds | Kinds grow as agents meet new systems, such as Sentry, with no code change. Each kind says what its identifiers are, and agents check existing kinds and origins before registering, which keeps one system from being registered twice (human decision, 2026-10-06). |
| Jira and Confluence pointers stay separate from origins | They track the work around efforts and are first-class there. Origins point only at what knowledge articles rest on (human decision, 2026-10-06). |

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
28. **Agents attaching sessions to efforts on their own, and orchestration attaching or creating a regular effort on entry.** The human replaced this with recommendation and approval: agents know which efforts exist and suggest, and the human decides. Orchestration's need for records from the first decision is met by provisional efforts, which the human later promotes or merges. The human first considered an effort for every session; the assistant argued that session folders already cover default-mode work, and provisional efforts were limited to orchestration and unnamed captures.

29. **`context.md` as the effort's record.** The name said nothing about the file and collided with "context" as the model's context window and with a domain glossary's `CONTEXT.md`. Renamed `effort.md` (human, 2026-09-29), matching `design.md` in a design folder.
30. **Next actions, waiting-on, planned meetings, and agendas in `context.md`, and intake routing action items there.** The human rejected prescriptive content in files agents maintain: it goes stale silently and reads as instructions. Records describe state; plans are proposed in the conversation on request.
31. **`coordination.md` for the run's state.** No effort had one in practice. The catalog's session tree, the repository, and the conversation export hold what it was for. Removed (human, 2026-09-29).
32. **`approach.md`, then a local design in the stable design's record format so promotion would be a move.** The record format splits the connected understanding into records and pages, and agents read only the records. Replaced by a local `design.md` written as one connected document, with promotion as a write-up (human, 2026-09-29).
33. **Every effort that builds something links a stable design.** The assistant proposed this to remove the two homes for design material. The human pointed out that efforts range from a single-session feature to an approval-heavy initiative, and the stable design is for the latter. Replaced by stable and local designs.
34. **A separate preferences file for the human's views.** Considered and not adopted: firm preferences become requirements or constraints, leanings sit on the decisions they bear on, ruled-out options sit in the design's Also considered, and views about the work sit in `effort.md`.

35. **Confluence pages as their own kind of source, like meetings.** Replaced by URL pointers with a role (created or referenced); only a page whose content has to be taken in goes through intake (human, 2026-10-06).
36. **Grouping an effort's Jira items by plan deliverable, stored in Cairn.** Replaced by grouping by epic, as Jira does, with the deliverable worked out from the design, so Cairn stores no mapping it would have to maintain (human, 2026-10-06).
37. **Phases on efforts.** Rejected: the design's plan holds the breakdown, as deliverables in a dependency map rather than sequential phases, and an effort just works on some of them (human, 2026-10-06).
38. **A usage and cost page, and initiatives listed in the sidebar.** Dropped from the redesign: cost shows on each session, and the sidebar keeps to the work (human, 2026-10-06).
39. **Subagents writing and describing their own response file through `task-output`.** Each dispatch cost a write, a describe call, a reply naming the file, and a read by the parent, which read the whole file anyway. Replaced by the plugin saving the result and a small model describing it; Claude Code subagent results go unsaved until its hooks do the same (human, 2026-10-08).
40. **Orchestration creating a provisional effort on entry, and Chief.** Replaced by the [orchestrate redesign](../orchestrate/design.md): efforts are opt-in through `effort-context` when the human asks to capture, attach, or resume, and Chief is archived. The `workstream` and `subject` fields stay for a future multi-session mode (human, 2026-10-08).

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
- Importing `orchestrator-workspaces` with the import operation, starting with a trial of one effort.
- **Meeting processing and intake skills.** Processing registers the recording, saves the raw and cleaned transcripts, and writes the summary with candidates and action items. Intake walks the human through the candidates and promotes accepted ones. Build them once the manual version has been used. See the scenario, steps 7 and 8.
- **People on artifacts.** v1 finds people through `person:` tags on efforts and attendees named in descriptions.
- **Structured action items** from meeting summaries, for a view across efforts. Records hold no waiting-on lists, so this would read the summaries.
- **A curated layer, maintained by the human with AI.** This was proposed on 2026-09-25 and deferred by the human in favor of AI-maintained `context.md` and `design.md` for now. It separates AI-maintained working material from content the human curates, with explicit promotion as the only path between them. Its parts:
  - **Decisions as a primitive:** one Markdown file each, with the question, a status (open, decided, superseded, dropped), options with pros, cons, and evidence, the chosen option and rationale, and resulting requirements. They're parsed into rows. Decision trees are links: `depends_on` between decisions, an option `raises` or `constrains` another decision (including in other efforts), and a decision `produces` a requirement. A site would draw the tree and order open decisions by what they block.
  - **`requirements.md`**, promoted, or produced by decisions.
  - **`todos.md`** (not adopted: records hold no next steps, 2026-09-29), owned by the human, added only when the human accepts them, and kept out of agent context so "talk to the security reviewer" never reads as an agent task. Waiting-on items are to-dos owned by others.
  - **Knowledge documents**: built on 2026-09-29 as [knowledge articles](#knowledge-articles), kept at the root rather than in the effort.
  - **A working log:** decisions made along the way with who made them, approaches tried and dropped, and candidates AI flags for promotion. Never loaded by default; a cheap Scribe or explore agent summarizes it on demand.
  - **Promotion**, generalizing intake: any working material (meeting summary, log candidate, evidence, conversation) promoted into a decision, requirement, to-do, knowledge document, or context update, citing its source and marking what was promoted or declined.
  - **Items parsed from Markdown:** checkbox bullets under known headings (`## To-dos`, `## Open questions`, `## Candidates`) become `item` rows, with the files remaining the source of truth. Pending intake is then derived from unchecked candidates, and a needs-attention view across efforts becomes possible: open decisions, candidates awaiting review, the human's to-dos, and waiting-on.
- **A cross-effort needs-attention view and an intake inbox**, which depend on parsed items or a curated layer.

## Implementation

### Package placement

| Path | Contents |
| --- | --- |
| `packages/cairn/` | `src/core/` (schema, operations, adapters, views), `src/cli.ts` with a `bin` entry, and `src/mcp.ts`. Add `packages/*` to `pnpm-workspace.yaml`. |
| `packages/cairn/src/opencode/` | The OpenCode plugin: session start and context injection, write and read capture, capture notes, and turn-complete indexing, all through the CLI. It ships in the same package as the CLI (see [packaging](#packaging)). |
| Profile configuration | The mfz-rendered MCP entry (server name `cairn`), `CAIRN_ROOT`, and the Claude Code `SessionStart`, `SubagentStart`, `PostToolUse`, and `Stop` hooks. Mindframe-Z renders configuration only. |

Proposed source layout. Tests sit next to their modules as `*.test.ts`, as elsewhere in the home. Each file is annotated with the phase that creates it.

```text
packages/cairn/
  TERMINOLOGY.md          vocabulary (moved here from docs/cairn/)
  package.json            @mfz/cairn; bins "cairn" → dist/cli.js, "cairn-mcp" → dist/mcp.js; exact versions
  build.ts                esbuild bundle of the three entries into dist/; --watch rebuilds in place
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
    opencode/
      server.ts           the OpenCode plugin; built to dist/opencode/server.js             (3)
```

`pnpm-workspace.yaml` gains `packages/*`. Where the profile entries go, `base` or `personal`, and how hooks and environment variables are rendered, follows `mfz guide` when phase 3 wires them.

### Stack

The human accepted these on 2026-09-25, after phase 1.

| Area | Decision | Why |
| --- | --- | --- |
| Language | TypeScript on Node 26. The Python exporter is only a reference. | One stack with the plugins, the MCP SDK, and the rest of the home. |
| Running TypeScript | In the repository, Node 26 runs the source directly (`node src/cli.ts`). The installed package runs a bundle built by esbuild (see [packaging](#packaging)). `tsconfig` sets `erasableSyntaxOnly`, `verbatimModuleSyntax`, `allowImportingTsExtensions`, and `noEmit`, and imports use `.ts` extensions. | Tests and quick runs need no build. Node refuses to strip types under `node_modules` (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`, checked), so an installed package must ship JavaScript. Only erasable syntax is allowed (no enums, namespaces, or parameter properties). |
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
- `ctx.session.hook("context", fn)` runs before every model request. The plugin puts the session ID line in a user message at the start of `event.messages` rather than in `event.system`: in the system text it made every session's prompt differ from the start, so subagents started from one session couldn't share a cache entry. The line is constant per session, so each session's own cache stays warm.
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
- **Compaction note stays.** The opening message isn't kept in a session's history, so a note added once would vanish on the next request. After `session.compaction.ended`, the plugin reads `session context` once, then adds the note to the opening message on every later request. It doesn't change between compactions, so the prompt cache stays warm.
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

### Phase 5 results

Built 2026-09-25: `src/harness/claude-code.ts` (`cairn hook claude-code`) and `src/conversation/claude-code.ts` in the package, and Claude Code support in `cairn session index`. The package has 44 behavior tests (4 for the hooks and 3 for Claude Code exports). Typecheck and the anti-slop check are clean.

Hooks:
- **One entry point.** Every event runs the same command, which reads the event on stdin and prints `hookSpecificOutput` when there is context to add. It takes about 85 ms with `NODE_COMPILE_CACHE` set. It always exits 0 and logs failures to `logs/cairn.log`, so it never fails the harness action.
- **Subagents.** A subagent is `claude-code:<agent_id>`. Claude Code writes its `.meta.json` just after `SubagentStart`, so the live run's subagents had no title at first. Every subagent event (`SubagentStart`, `PostToolUse`, `SubagentStop`) reads the file. Registration fills in the Agent tool's description as the title, and moves a nested subagent under the subagent named by `parentAgentId`. `SubagentStop` is handled for that alone, so a subagent that touches no files still gets its title and parent.
- **Capture note.** Without a plugin's memory between calls, the note goes with the capture that creates the file's catalog entry. Later edits of the same file get none. Reads run as an async hook, because they add no context.
- **Stop.** The hook starts `cairn session index` as a detached process and passes `last_assistant_message` on its stdin. An async hook wouldn't do: `claude -p` kills async hooks still running at teardown. `SessionStart` with `source: resume` starts the same export without a last message.

Transcript adapter:
- **Live chain.** Claude Code appends every entry to the transcript and links each to its parent by `parentUuid`. The conversation is the chain back from the last entry. A rewind leaves the abandoned branch in the file, off the chain. A compaction boundary has no parent but a `logicalParentUuid`, which the walk follows to the messages before the compaction. On this session's own transcript (4,200 lines, six compactions) the walk found every human message in about 100 ms.
- **Human messages.** A user entry counts when its `turnOrigin` is `human` (typed in the terminal) or `sdk` (a `claude -p` prompt). Task notifications carry `task_notification`, and tool results, compaction summaries, and command output carry none. The first live run found `claude -p` prompts missing, because the adapter then required `origin.kind: human`, which only terminal prompts carry.
- **Assistant text.** The `text` blocks of the main agent's entries, except the harness's `<synthetic>` messages. Thinking and tool calls are left out, and subagents have their own transcripts.
- **Provisional tail.** When `last_assistant_message` doesn't match the text of the transcript's last assistant message, it is written after the watermarked records under "Assistant · provisional". The watermark's `length` marks where the tail starts, so the next export cuts it off before appending. Neither live run needed one: the transcript already held the final message when the export ran.
- **Title.** The latest `custom-title` entry (from `/rename`), otherwise the latest `ai-title`.

Live acceptance, in an isolated run (`claude -p --model haiku --settings <test settings> --setting-sources "" --strict-mcp-config --mcp-config <cairn only>`, Claude Code 2.1.282, temporary root):
- A subagent wrote a file under the root, quoted its own catalog ID and the capture note back, and described the file. The file's producer is the subagent's session, whose parent is the main session.
- A second run exported turn 1, then turn 2 through `--resume`, appended with turn 1's bytes unchanged. The subagent's title came from its metadata.
- The auto-mode classifier blocked adding the hooks to the personal profile and running `mfz apply` from this session, because it changes the settings of the harness the session runs in. With auto mode off, the human approved both; see [packaging](#packaging).

### Packaging

Built 2026-09-25, at the human's request, so that configuration names commands instead of repository paths and nothing is published remotely.

- **One package.** `@mfz/cairn` holds the CLI, the MCP server, and the OpenCode plugin, which moved from `opencode/plugins/cairn/` to `src/opencode/`. `build.ts` bundles `dist/cli.js`, `dist/mcp.js`, and `dist/opencode/server.js`, each with its dependencies, so the installed package has none. The runtime libraries are dev dependencies. The plugin takes only types from `@opencode/plugin`, whose entry would otherwise pull its schema modules into the bundle. It runs the CLI beside it in `dist/`, so the plugin and the CLI are always the same version.
- **Local install.** `mise run cairn:install` (in the repository's `mise.toml`) packs the package and installs the tarball into `~/.local/share/mfz-packages/`, a pnpm project outside the repository. pnpm copies it into `node_modules` as it would a registry package. A same-version tarball needs `pnpm update` after `pnpm add` to replace the installed copy. The task links `cairn` and `cairn-mcp` into `~/.local/bin`, so the MCP entry is `command: [cairn-mcp]` and the hooks run `cairn hook claude-code`. A PATH entry in the profile's `mise.toml` didn't reach the OpenCode service: its unit sets PATH to `~/.local/bin` and mise's shims, and shims cover only mise-managed tools. pnpm's command wrappers resolve symlinks, so the links work.
- **Plugin path.** mfz renders only plugins in the home's `opencode/plugins/`, as `file://` directories, and a plugin in `opencode.config.plugins` is overwritten by the rendered list. The install task therefore makes `opencode/plugins/cairn` a symlink (ignored by Git) to the installed `dist/opencode/`, and the profile keeps enabling `cairn` by name. The whole folder has to be the link: OpenCode loads a plugin folder only when its entry file, symlinks resolved, is inside the folder, and skips it silently otherwise, so a real folder holding a symlinked `server.js` doesn't load. The cost is one logged error at startup (`failed to subscribe … Not a directory`): OpenCode's watch on the configured folder, which rescans the plugin list, can't watch a symlink. Reloading on a rebuild uses the separate watch on the entry file.
- **Iteration.** `mise run cairn:link` replaces the installed package with a `link:` to `packages/cairn`, and `cairn:dev` also runs the build in watch mode. OpenCode resolves the plugin's entry file to `packages/cairn/dist/opencode/server.js` and watches that file, and esbuild's watch mode rewrites it in place. Checked in a standalone `opencode run`: a source edit was rebuilt at 22:15:45.196 and the plugin reloaded at 22:15:45.349. `pnpm update` replaces the installed folder, and a switch between modes changes the symlink target, so both need a plugin reload or an OpenCode restart. `cairn-mcp` runs until its client restarts it.
- **Startup.** The bundled CLI answers a hook in about 66 ms, and about 79 ms through pnpm's `.bin` shim. The source with `NODE_COMPILE_CACHE` took about 84 ms.
- **Checked.** The installed `cairn hook claude-code` answers `SessionStart`, its `Stop` export runs detached from `dist/cli.js` and writes `conversation.md`, and `cairn-mcp` lists the six tools over stdio, also with the OpenCode service's PATH. `cairn:link` and `cairn:install` switch the installed package both ways. After `mfz apply`, `opencode mcp list` shows `cairn` connected, and Claude Code's settings carry the five hook events. 52 package tests pass, including the plugin's 8.
- **Live check.** After `mfz apply` and a restart of `opencode-serve`, the service runs `dist/mcp.js` from the installed package. A `claude -p --model haiku` run with the user's rendered settings and a temporary `CAIRN_ROOT` registered the session and its subagent as a child, titled from the Agent tool's description. The subagent received its catalog ID and the capture note, wrote a file from `catalog_location`, and described it; the file's producer is the subagent. `Stop` exported `conversation.md`, and nothing was logged as a failure. A test folder under `~/.claude/` first blocked the write, since Claude Code refuses edits there even with `acceptEdits`. A `claude -p` call that exits before its prompt still fires `SessionStart`, which leaves an empty session row.

### Knowledge and sources

Built 2026-09-29.
- **Schema version 4** adds the `knowledge` category, rebuilding the artifact table the way version 3 did.
- **Knowledge index.** `knowledge/index.md` is Cairn's own file and never captured. It has no dirty flag: every non-hot command renders it and writes it only when the content changed, which costs one query.
- **Written up.** The effort view gives each artifact the knowledge articles it `informs` (`written_up_in`), and the index shows them after the producer.
- **Record names.** Cairn's record list was still `context.md` and `design.md` after the skills renamed the effort's technical record to `approach.md`, so `approach.md` got a capture note, was missing from the compaction note, and wasn't listed after a merge. The list is now `context.md` and `approach.md`; no effort folder held a `design.md`.
- `sources/` and `designs/` need no code: any folder under the root is captured and described like the rest.

### Origins and references

Built 2026-10-06.
- **Schema version 9** adds `origin_kind`, `origin`, `origin_access`, and `origin_reference`. A reference attaches only to an artifact of category `knowledge`.
- **Tools.** `catalog_origin` and `catalog_reference`, with flat inputs parsed into discriminated ones like `catalog_effort`. The CLI has the same operations under `cairn origin` and `cairn reference`, with access methods as JSON.
- **Sections.** `cairn check` reads each referenced article's Markdown headings and reports sections it no longer has.
- **UI.** An Origins page groups origins by kind with their access methods and use. A knowledge article opens on its own page (`#/knowledge/<path>`) with Article, References, and Efforts tabs; references group by origin or by section in the article's heading order, oldest observed first. The UI shows only what was observed and when, and offers no re-check action, because re-checking is an agent's work.

### Records revision

Built 2026-09-29.
- **Record names.** Cairn's record list is `effort.md` and `design.md`, with `context.md` and `approach.md` still recognized so existing efforts keep their summaries and capture behavior until they are renamed with `cairn mv`. The effort view's summary comes from `effort.md`, or `context.md` when an effort hasn't been renamed.
- **Compaction note.** It lists the attached efforts with their record paths and the stable designs each works on, and no longer looks for `coordination.md`.
- **design-docs.** `design.md` gains prose sections (Problem, Goals, How it works) and Phases records. The overview's `goals` and `scope-note` components show design.md's Goals when they have no body of their own, a new `design-section` component shows a prose section with its text diagrams left out, and a `## Phases` section on a page shows the phases table. Questions gain an `Asked` field for who was asked, when, and through what.
- **Skills.** `effort-context` describes `effort.md` and the local `design.md`, drops `coordination.md`, records decisions where they land, and adds the import operation. `orchestration` and the continuity references find Scribe and workstreams through the catalog instead of `coordination.md`.

### End-to-end test and fixes

Four subagents ran the new skills end to end on 2026-09-29: two gathered evidence, one wrote a stable design with design-docs, and one resumed the effort cold. The test found these, fixed the same day:
- **Code spans with `<…>`.** `render.mjs` stashed tags before code spans, so `designs/<slug>/` rendered as `designs/0/` and left NUL bytes in the built doc. Code spans now go first in both renderers, and terms render code spans.
- **Partial builds.** `build --pages` without `-o` overwrote the full doc without its change stamp; it now writes `published/<slug>-<page ids>.html`.
- **The resume cutoff.** "Changes since the effort's last session" is defined in effort-context: the latest activity among the effort's sessions outside the resuming session's tree; entries from elsewhere dated that day count; the effort's own `session` entries don't.
- **Stable designs after compaction.** The compaction note lists the stable designs each attached effort works on.
- **Smaller gaps.** A Proposed phase status and `Proposed from research` requirements, an `effort.md` template, the resume procedure's slug lookup, attach, and dispatched report, and documented section ids, `Who` tags, `context`, inline markup, and the escape for example IDs.

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
5. **Claude Code hooks and adapter.** Built 2026-09-25; see [phase 5 results](#phase-5-results). Packaged with the CLI and plugin and wired into the personal profile; see [packaging](#packaging).
6. **Skills.** The [skill changes](#skill-changes), last, once both harnesses have Cairn (human decision, 2026-09-25). Written 2026-09-25 with provisional efforts, the approval rule, and the `learning` category (schema version 3), and Cairn moved into `base`. Re-run the orchestration evals in `openevals/` afterwards; the eval environment needs Cairn's MCP server and a temporary `CAIRN_ROOT`.
7. **Trial import.** Deferred. Once Cairn works, bring one existing effort over with the import operation to see how it looks. Nothing is moved automatically.
8. **Later.** Read-based suggestions, plugin-drafted descriptions, effort hierarchy if tags stop being enough, message-level search, and a UI.

## Open questions

None open. Code mode and the profile wiring were settled on 2026-09-25; see [phase 3 results](#phase-3-results).

## Continuation

State after phase 6 (skills), 2026-09-25:

- **Implementation intent.** The human asked for phase 2, then phase 3, then to continue with the next changes, with the skill changes last.
- **Documents.** This file, [the observability pipeline scenario](scenario-observability-pipeline.md), and [TERMINOLOGY.md](../../packages/cairn/TERMINOLOGY.md). The design lives in `docs/cairn/`, the terminology at the package root, as OpenEval does it.
- **Commits.** The package, plugin, and docs were committed in `0cf5925`; the profile wiring, the location grant, and phase 4 in `f713293`, `004452d`, and `a5bc5c7`; phase 5 and packaging in `98dfeda` and `00a54f9`. Phase 6 (the skills, schema version 3, and the move into `base`) is uncommitted, and so are the authoring-record updates in `personal-knowledge`.
- **Parallel work.** The orchestrator eval work and the `task-evidence` to `task-output` rename landed in `2df1a2d` and `807cccc`.
- **Storage root.** `~/workspace/artifacts/cairn/` exists and holds the live-run test effort `cairn-live-check`. The catalog moves to schema version 3 on the first command after the install; a copy of the real catalog migrated with identical row counts, clean integrity, and no broken references.
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
- **Conversation exporter reference.** `docs/archive/orchestrator/modular-workflows/export-session.py` and [exporter.md](../archive/orchestrator/modular-workflows/exporter.md).
- **Live test setup.** A temporary project with an `opencode.jsonc` that loads the plugin by `file://` URL and adds the MCP server under `mcp.servers.cairn` (`type: local`, `command: ["cairn-mcp"]`, `environment.CAIRN_ROOT`, `codemode: false`). Run `CAIRN_ROOT=<root> opencode run --standalone --auto --format json` in it, and inspect the result with the CLI against the same root. Since the profile wiring, the global configuration already loads Cairn, so a test needs only `CAIRN_ROOT` set in the environment; without it, the run writes to the real root.
- **Installed state.** `~/.local/share/mfz-packages/` holds the installed tarball, `~/.local/bin` links its commands, and `opencode/plugins/cairn` points at it. The `base` profile now enables Cairn's MCP server, plugin, and Claude Code hooks, and grants the evidence agents edits under the Cairn root; `personal` no longer repeats them. MCP servers started before the schema change refuse the version 3 catalog until they restart.
- **Next step.** Re-run the orchestration evals with Cairn in the eval environment, then the trial import.
