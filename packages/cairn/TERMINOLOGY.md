# Cairn terminology (draft)

This is the vocabulary for Cairn's design, interfaces, code, skills, and tool descriptions. When a term here conflicts with its everyday or orchestration-skill meaning, this meaning applies inside the catalog.

> Every conversation is a session, with its own folder. A session's files are captured as it writes them, and each describes itself with front matter. When work is worth coming back to, sessions are attached to one or more efforts. An effort's index lists everything its sessions produced, so a later session can pick the work up again.

## Definitions

| Term | Meaning | Example |
| --- | --- | --- |
| Cairn | The whole system for doing software work with AI: the catalog, orchestration, and the other workflow skills. The package, CLI, MCP server, plugin, and root carry its name. MCP tools keep the `catalog_` prefix. | `cairn find --effort asa-ingestion` |
| Catalog | Cairn's database of sessions, efforts, artifacts, and their relationships, plus the files it points to. It returns pointers, never file contents. | `catalog_find(effort: "asa-ingestion")` |
| Cairn root | The folder holding Cairn's working state, the agents' plumbing: the catalog, session and effort folders. Set by `CAIRN_ROOT`, otherwise `cairn/` in the XDG state folder. Each profile has its own root. The knowledge base and designs are `knowledge/` and `designs/` in it unless configured elsewhere, as they usually are, since they are the human's content. | `~/.local/state/cairn/` |
| Harness | The agent application a session runs in. | OpenCode, Claude Code |
| Session | One conversation in a harness, identified as `<harness>:<native-id>`. Recorded automatically when it starts. | `opencode:ses_f2b8…` |
| Root session | A session started by the human rather than by another agent. Only root sessions get a conversation export. | The session you type into |
| Child session | A session started by an agent in another session: a subagent, a delegated orchestrator, or a producer. A Claude Code subagent shares its parent's harness session, so the catalog records it by its `agent_id`. | An `explore` subagent; `claude-code:aea9cfe061299bad3` |
| Session tree | A root session and all of its descendant child sessions. The tree's folder is the root session's folder, and each child's folder sits inside it. | Chief, its orchestrators, and their producers |
| Session folder | A session's own folder for its working files. A root session's is `sessions/<harness>/<yyyy-mm>/<native-id>/`; a child's is `subagents/<native-id>/` inside its root's. A file in it is credited to that session however it was written. | `…/ses_lead/subagents/ses_explore/` |
| Conventions | What every session is told about keeping Cairn informed without tool calls: files go in the session folder, Markdown files carry front matter, results and lessons have fixed names. The harness integration adds them to every session. | `src/core/conventions.ts` |
| Front matter | The `title`, `description`, and `category` block at the top of a Markdown file, through which the file describes itself. Cairn reads it on every capture, and it wins over what the catalog held. | `---\ntitle: AWS accounts\n---` |
| Result | A subagent's final message, saved as `result.md` in its folder. | `…/subagents/ses_explore/result.md` |
| Effort | A named outcome you want to be able to come back to, spanning any number of sessions. Sessions attach to efforts, not the other way round. Efforts are flat and grouped with tags. | "Cisco ASA log ingestion", "AWS deployment" |
| Provisional effort | An effort with status `provisional`, created for a task the human hasn't placed in an effort yet: on entering orchestration, or on a capture that names no effort. It works like any effort until the human promotes it (status `active`) or approves merging it into another. | The effort an orchestrator creates for "review the logging PRs" |
| Tag | A `namespace:value` label on an effort, used for filtering. Relationships between efforts are links, not tags. | `initiative:observability-pipeline`, `repo:infra-terraform` |
| Initiative | A larger program that several efforts contribute to. It is usually visible as a cluster of linked efforts, optionally labeled with an `initiative:` tag. It is never a separate entity. | `initiative:observability-pipeline` |
| Effort view | Every artifact from every session attached to an effort, plus explicit members, grouped by category by default. | The Datadog evidence, Jira items, and PRs in one list |
| Attach | Associate a session with an effort. A session can attach to several efforts, and an effort gathers many sessions. An agent recommends an attachment and the human approves it. | A session covering both AWS deployment and ASA ingestion attaches to both |
| Promote | Make a provisional effort a regular one, with the human's approval. | `catalog_effort(action: "update", status: "active")` |
| Unattached session | A session with no effort. This is normal for quick work. | "What does this repo do?", "Commit these changes" |
| Workstream | The part of a Chief session's work delegated to one orchestrator. In the catalog, it is the orchestrator's child session, plus any replacement sessions, sharing one workstream key. | `review-pr-123` |
| Subject | An optional external reference that a session or workstream is about. It lets a loop find earlier work on the same item. | `github:org/repo#123` |
| Artifact | Anything the catalog points to: a file under the root, an external file, or a URL. | An evidence file, a Confluence page |
| Pointer | An artifact that is a URL or a file outside the root. The catalog records it but never copies it. | A Jira issue URL |
| Pointer type | The kind of URL pointer, derived by the service from the URL. | `pull_request`, `jira_issue`, `confluence_page` |
| Category | The one-word kind of an artifact, chosen when it is described: `evidence`, `source`, `synthesis`, `knowledge`, `deliverable`, `record`, `conversation`, `learning`, or `other`. | `evidence` |
| Capture | The plugin's automatic step: recording a file write, its writing session, its hash, and its front matter. It involves no model. | A write tool call succeeds, so the plugin runs `cairn capture` |
| Describe | Giving an artifact a title, a description, and a category: for a file, by writing its front matter; for a URL, with `catalog_describe`. | `category: evidence` in a file's front matter |
| Undescribed | A captured artifact with no description: a Markdown file without front matter, or another file nothing describes. | Notes written without front matter |
| Producer | The agent, in its own session, that wrote an artifact, and gives it its front matter. | The `explore` subagent that wrote the evidence |
| Membership | An artifact's relationship to an effort. It is normally derived: the nearest attached session in the artifact's session tree, starting with its producer, is attached to the effort, or the file sits in the effort's folder. It can also be set explicitly for one artifact. | A file relevant to only one of a session's two efforts |
| Link | A named relationship between two artifacts (`informs`, `supersedes`, `related`) or two efforts (`depends_on`, `split_from`, `related`). Links are read in both directions. | `asa-ingestion depends_on opw-deployment` |
| Split | Creating a new effort from a piece of an existing one, with a `split_from` link. The original loses nothing. Splitting is explicit. | OPW deployment split from Logs archived to S3 |
| Reading scope | What a session reads by default: the full `effort.md` of attached efforts and the designs they work on, the summary of efforts one link away, and more only on demand. It's not a size limit. | |
| Suggestion | A link proposed by the service rather than by an agent or the human. It is hidden until accepted. | Y was written after X was read, so the service suggests "Y informs X" |
| Index | An effort's view, rendered as Markdown from the database. The service generates it, and it is a view only. | `efforts/asa-ingestion/index.md` |
| Knowledge article | What is known about one existing subject, such as an AWS environment, a vendor product, or a codebase, written for a reader who never saw the evidence and kept current. It lives in the knowledge base's `articles/`, named for its subject, in the `knowledge-base` skill's format, and joins the efforts that rely on it or add to it. Its References list names the sources, evidence and origins it rests on. | `knowledge/articles/aws-environment.md` |
| Verification article | The knowledge article for how work in one repository is verified: how to check each kind of change and at what evidence level, and its verification gaps. One per repository, kept in the knowledge base rather than the repository. | `knowledge/articles/infra-terraform-verification.md` |
| Verification gap | Something in a repository that can't be verified with what exists, recorded in its verification article: what can't be checked, the strongest evidence available, an idea that would close it, and its cost. The gap is a fact; the idea is a proposal. Its status (`proposed`, `accepted`, `declined`) changes only when the human decides. Declined gaps stay listed so they aren't proposed again. | "SSM documents can't run before deploy; a sandbox test instance would allow it" |
| Write up | Turn evidence into a knowledge article, or fold new evidence into an existing one. | Writing up the session's AWS evidence |
| Record | A file that holds state rather than findings or instructions: where things stand, the human's views, what was decided and by whom, and what is open, never next steps. Where the work stands lives in the effort's `effort.md`; what is being built and why lives in a design. The skills name records, not the catalog. | `efforts/asa-ingestion/effort.md` |
| Design | What is being built or changed and why. A stable design (`designs/<slug>/`) is the agreed record of a body of work, shared by its efforts and shown to the people who approve it: problem and value, goals, how it works, requirements, phases, and decisions. A local design (`efforts/<slug>/design.md`) is one connected document for small work, or for detail below a stable design. | `designs/log-ingestion/`, `efforts/opw-deployment/design.md` |
| Phase | A stable design's delivery unit: its scope, exit criteria, status, and the effort doing it. Its status lives only in the design. | "Firewall logs through OPW" |
| External input | Material from outside the working sessions: meetings, emails, chats, tickets, other people's notes. It is kept as artifacts under `sources/` and is never validated state by itself. | A meeting transcript, the security lead's email |
| Candidate | A decision, suggestion, or open question found in external input and not yet accepted by the human. It lives in the input's summary. | "Infra engineer suggested the shared services VPC" |
| Proposal | A change a meeting or email could make to a stable design, written on the design's meeting record with what it would change, the words behind it, and a recommendation, and settled by the human (accepted, changed, deferred, or rejected) before anything changes. Accepted proposals become the meeting's outcomes. | "Lean towards a key per customer (D6)", recommended Accept as leaning |
| Action item | A to-do from a meeting or other input, with an owner. It stays in the summary that recorded it, as said; team-tracked items become Jira items. Records don't copy action items. | "Security lead to confirm the IAM scope" |
| Intake | A deliberate session with the human that works through external input's candidates and action items. It moves accepted items into `effort.md`, a design, or a knowledge article, and marks the outcome in the summary. | Reviewing the 2026-10-02 meeting summary |
| Compaction note | The plugin's factual note after compaction, listing the session's attached efforts with their record paths and the stable designs they work on. | "Cisco ASA log ingestion (asa-ingestion): …/effort.md" |
| Conversation export | A root session's user messages and assistant text, written as Markdown and kept up to date after each turn. | `conversation.md` |
| Watermark | The position in a session's source history that the conversation export has reached. | Last exported message sequence and tail hash |
| Backup | A daily copy of the database made with `VACUUM INTO`, used by `cairn restore`. | `backups/catalog-2026-09-25.db` |

## Categories

| Category | Meaning |
| --- | --- |
| `evidence` | Findings from an investigation, with their support |
| `source` | Raw input material: email excerpts, meeting notes, exports, screenshots |
| `synthesis` | Distilled discussion, designs, plans, and summaries |
| `knowledge` | A knowledge article: one subject's current state, kept current |
| `deliverable` | Something made to share with people: a Confluence page, a Jira item, a quick shared note |
| `record` | State: an effort's `effort.md`, a local design's `design.md`, or a stable design's `design.json` and `changes.md` |
| `conversation` | A conversation export. Set only by the service. |
| `learning` | A producer's operational lesson, such as how to run a command, kept apart from its response in `learnings.md` |
| `other` | Anything else. Use it rarely. |

## Relationships between the terms

- A session belongs to exactly one session tree. It is attached to zero or more efforts.
- An artifact is produced in exactly one session. Its home folder is that session's folder, unless it was deliberately written to an effort's folder or to one of the root's subject folders: `designs/`, `knowledge/`, or `sources/`.
- An artifact belongs to an effort through its session's attachment (or its nearest attached ancestor's), through its effort folder, or through explicit membership.
- An effort's view covers the artifacts of every session attached to it, plus explicit members, minus explicit exclusions.
- Efforts relate to each other through links. Tags only filter.
- A session attaches to the efforts whose state it changes, and reads others through links.

## Naming rules

- Say **Cairn** for the whole system and name its parts for what they do: the **catalog** for the record of sessions, efforts, and pointers, and **orchestration** for `orchestrate` and `design-partner`. When describing the database itself (its contents, queries, and pointers), say catalog. MCP tools keep the `catalog_` prefix.
- Say **session** for a conversation and **effort** for the body of work. Don't use "workspace", "work unit", "ledger", or "thread" for either one. Those names belong to other systems.
- Say **attach** for session-to-effort association and **membership** for artifact-to-effort association. Don't say a session "is in" or "belongs to" an effort, because a session can serve several.
- Say **capture** for the automatic step and **describe** for what front matter or `catalog_describe` does. Registration is not a separate operation.
- **Artifact** is the general term. **Evidence** is only the category for investigation findings. Don't call every file evidence.
- Say **knowledge article** for what is known about a subject, and **evidence** for the investigation output it is written from. A design records what is being built and why; a knowledge article records what exists. Cairn's knowledge articles are working material in the catalog, separate from any personal knowledge base.
- **Workstream** is a Chief concept represented by sessions. It is not a separate kind of container. Don't create an effort just to represent a workstream.
- Name an **effort** for its outcome ("Cisco ASA log ingestion"), never a phase ("Design ASA ingestion"). Design and implementation belong to the same effort.
- Only validated state goes into `effort.md` and designs. Say **candidate** for anything from external input that the human hasn't accepted, and **intake** for the step that accepts it.
- The **index** is generated. Agents never edit it, and it is never the source of truth.
