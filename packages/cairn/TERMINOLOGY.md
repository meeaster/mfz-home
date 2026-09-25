# Cairn terminology (draft)

This is the vocabulary for Cairn's design, interfaces, code, skills, and tool descriptions. When a term here conflicts with its everyday or orchestration-skill meaning, this meaning applies inside the catalog.

> Every conversation is a session. A session's files are captured as it writes them, and agents describe them. When work is worth coming back to, sessions are attached to one or more efforts. An effort's index lists everything its sessions produced, so a later session can pick the work up again.

## Definitions

| Term | Meaning | Example |
| --- | --- | --- |
| Cairn | The package, CLI, MCP server, and plugin that keep the catalog. MCP tools keep the `catalog_` prefix. | `cairn find --effort asa-ingestion` |
| Catalog | Cairn's database of sessions, efforts, artifacts, and their relationships, plus the files it points to. It returns pointers, never file contents. | `catalog_find(effort: "asa-ingestion")` |
| Cairn root | The one folder Cairn manages, set by `CAIRN_ROOT`. Each profile has its own root. | `~/workspace/artifacts/cairn/` |
| Harness | The agent application a session runs in. | OpenCode, Claude Code |
| Session | One conversation in a harness, identified as `<harness>:<native-id>`. Recorded automatically when it starts. | `opencode:ses_f2b8…` |
| Root session | A session started by the human rather than by another agent. Only root sessions get a conversation export. | The session you type into |
| Child session | A session started by an agent in another session: a subagent, a delegated orchestrator, or a producer. A Claude Code subagent shares its parent's harness session, so the catalog records it by its `agent_id`. | An `explore` subagent; `claude-code:aea9cfe061299bad3` |
| Session tree | A root session and all of its descendant child sessions. Files written anywhere in the tree belong to the root session's folder. | Chief, its orchestrators, and their producers |
| Effort | A named outcome you want to be able to come back to, spanning any number of sessions. Sessions attach to efforts, not the other way round. Efforts are flat and grouped with tags. | "Cisco ASA log ingestion", "AWS deployment" |
| Tag | A `namespace:value` label on an effort, used for filtering. Relationships between efforts are links, not tags. | `initiative:observability-pipeline`, `repo:infra-terraform` |
| Initiative | A larger program that several efforts contribute to. It is usually visible as a cluster of linked efforts, optionally labeled with an `initiative:` tag. It is never a separate entity. | `initiative:observability-pipeline` |
| Effort view | Every artifact from every session attached to an effort, plus explicit members, grouped by category by default. | The Datadog evidence, Jira items, and PRs in one list |
| Attach | Associate a session with an effort. A session can attach to several efforts, and an effort gathers many sessions. | A session covering both AWS deployment and ASA ingestion attaches to both |
| Unattached session | A session with no effort. This is normal for quick work. | "What does this repo do?", "Commit these changes" |
| Workstream | The part of a Chief session's work delegated to one orchestrator. In the catalog, it is the orchestrator's child session, plus any replacement sessions, sharing one workstream key. | `review-pr-123` |
| Subject | An optional external reference that a session or workstream is about. It lets a loop find earlier work on the same item. | `github:org/repo#123` |
| Artifact | Anything the catalog points to: a file under the root, an external file, or a URL. | An evidence file, a Confluence page |
| Pointer | An artifact that is a URL or a file outside the root. The catalog records it but never copies it. | A Jira issue URL |
| Pointer type | The kind of URL pointer, derived by the service from the URL. | `pull_request`, `jira_issue`, `confluence_page` |
| Category | The one-word kind of an artifact, chosen when it is described. | `evidence` |
| Capture | The plugin's automatic step: recording a file write, its writing session, and its hash. It involves no model. | A write tool call succeeds, so the plugin runs `cairn capture` |
| Describe | An agent's step: giving an artifact a title, a description, and a category. | `catalog_describe(path, …)` |
| Undescribed | A captured artifact that no agent has described yet. | A file written through shell redirection |
| Producer | The agent, in its own session, that wrote an artifact. It is normally the one that describes it. | The `explore` subagent that wrote the evidence |
| Membership | An artifact's relationship to an effort. It is normally derived: the nearest attached session in the artifact's session tree, starting with its producer, is attached to the effort, or the file sits in the effort's folder. It can also be set explicitly for one artifact. | A file relevant to only one of a session's two efforts |
| Link | A named relationship between two artifacts (`informs`, `supersedes`, `related`) or two efforts (`depends_on`, `split_from`, `related`). Links are read in both directions. | `asa-ingestion depends_on opw-deployment` |
| Split | Creating a new effort from a piece of an existing one, with a `split_from` link. The original loses nothing. Splitting is explicit. | OPW deployment split from Logs archived to S3 |
| Reading scope | What a session reads by default: the full `context.md` of attached efforts, the summary of efforts one link away, and more only on demand. It's not a size limit. | |
| Suggestion | A link proposed by the service rather than by an agent or the human. It is hidden until accepted. | Y was written after X was read, so the service suggests "Y informs X" |
| Index | The effort view rendered as Markdown. The service generates it from the database, and it is a view only. | `efforts/asa-ingestion/index.md` |
| Record | A file that holds state rather than findings. The work's state (purpose, validated decisions, open questions, next actions, waiting-on, design) lives in the effort's folder. The run's state (assignments, blockers, next steps) lives in the root session's folder. The skills name records, not the catalog. | `efforts/asa-ingestion/context.md`, `sessions/…/coordination.md` |
| External input | Material from outside the working sessions: meetings, emails, other people's notes. It is kept as artifacts and is never validated state by itself. | A meeting transcript, the security lead's email |
| Candidate | A decision, suggestion, or open question found in external input and not yet accepted by the human. It lives in the input's summary. | "Infra engineer suggested the shared services VPC" |
| Action item | A to-do from a meeting or other input, with an owner. At intake it becomes a next action (yours), a waiting-on item (someone else's), or a Jira item. | "Security lead to confirm the IAM scope" |
| Intake | A deliberate session with the human that works through external input's candidates and action items. It promotes accepted items into `context.md` and marks the outcome in the summary. | Reviewing the 2026-10-02 meeting summary |
| Compaction note | The plugin's factual note after compaction, listing the session's attached efforts with their record paths and the session's `coordination.md`. | "Attached to asa-ingestion: context at …/context.md" |
| Conversation export | A root session's user messages and assistant text, written as Markdown and kept up to date after each turn. | `conversation.md` |
| Watermark | The position in a session's source history that the conversation export has reached. | Last exported message sequence and tail hash |
| Backup | A daily copy of the database made with `VACUUM INTO`, used by `cairn restore`. | `backups/catalog-2026-09-25.db` |

## Categories

| Category | Meaning |
| --- | --- |
| `evidence` | Findings from an investigation, with their support |
| `source` | Raw input material: email excerpts, meeting notes, exports, screenshots |
| `synthesis` | Distilled discussion, designs, plans, and summaries |
| `deliverable` | Something made to share with people: a Confluence page, a Jira item, a quick shared note |
| `record` | State: an effort's context and design, or a session's coordination |
| `conversation` | A conversation export. Set only by the service. |
| `other` | Anything else. Use it rarely. |

## Relationships between the terms

- A session belongs to exactly one session tree. It is attached to zero or more efforts.
- An artifact is produced in exactly one session. Its home folder is its root session's folder, unless it was deliberately written to an effort's folder.
- An artifact belongs to an effort through its session's attachment (or its nearest attached ancestor's), through its effort folder, or through explicit membership.
- An effort's view covers the artifacts of every session attached to it, plus explicit members, minus explicit exclusions.
- Efforts relate to each other through links. Tags only filter.
- A session attaches to the efforts whose state it changes, and reads others through links.

## Naming rules

- Say **Cairn** for the system (package, CLI, MCP server, plugin, root) and **catalog** for its database of pointers. MCP tools keep the `catalog_` prefix.
- Say **session** for a conversation and **effort** for the body of work. Don't use "workspace", "work unit", "ledger", or "thread" for either one. Those names belong to other systems.
- Say **attach** for session-to-effort association and **membership** for artifact-to-effort association. Don't say a session "is in" or "belongs to" an effort, because a session can serve several.
- Say **capture** for the automatic step and **describe** for the agent step. Registration is not a separate operation.
- **Artifact** is the general term. **Evidence** is only the category for investigation findings. Don't call every file evidence.
- **Workstream** is a Chief concept represented by sessions. It is not a separate kind of container. Don't create an effort just to represent a workstream.
- Name an **effort** for its outcome ("Cisco ASA log ingestion"), never a phase ("Design ASA ingestion"). Design and implementation belong to the same effort.
- Only validated state goes into `context.md`. Say **candidate** for anything from external input that the human hasn't accepted, and **intake** for the step that accepts it.
- The **index** is generated. Agents never edit it, and it is never the source of truth.
