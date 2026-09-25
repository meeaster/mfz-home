# Modular agent workflows and shared work storage

## Purpose and reading context

This document preserves the design discussion about separating design partnership, evidence gathering, persistence, and orchestration into reusable capabilities. It also describes a later storage service that combines file-backed content with database-owned metadata and relationships.

The immediate work is the skill reorganization. The database, stdio MCP server, CLI, and automatic conversation indexing are a later phase. Existing filesystem persistence remains in place during the skill reorganization.

The discussion took place in OpenCode session `ses_f2b89474effegUqNBZS9NymYdT`. The accompanying [conversation transcript](conversation.md) preserves the human requests and assistant text directly from the session database. It includes the original wording, repetitions, corrections, and assistant proposals. This document organizes their meaning for continuation. The transcript remains the reference for exact wording and attribution.

The human established the goals and corrected several initial proposals. After this record was written, the human requested implementation of the modular system. This document preserves the discussion and proposals as they stood; the [usage guide](README.md) points to the resulting runtime owners. Future database and service proposals remain separate from the skill reorganization.

## Why the existing package needs to change

The existing Orchestrator Mode package supports a valuable way of working. A human-facing session thinks with the human while other agents absorb source-heavy investigation and execution. A Chief can retain high-level dialogue while orchestrators coordinate workstreams. Evidence and working context survive individual agent assignments and session compaction.

The concern is how these useful behaviors are packaged. Design partnership, evidence gathering, coordination, and persistence currently arrive as parts of an orchestration system. The human wants to use them in other combinations, including sessions with no orchestration at all.

The motivating examples include:

- Making a small change directly with a capable model.
- Investigating a question and then making a small change.
- Brainstorming or designing without intending to implement anything.
- Designing and implementing in the same ordinary session.
- Keeping the design conversation in the main session while delegating implementation.
- Capturing work after discovering that a small change has become a larger effort.
- Continuing the same effort across sessions or across OpenCode and Claude Code.
- Coordinating a full lifecycle through implementation, verification, review, repairs, and an authorized pull request.
- Managing several independently useful outcomes through Chief-level coordination.

The human described good results from capable models handling small changes directly, including recent use of Claude Code. That experience motivates a lightweight ordinary path. It is not a comparative model benchmark or a permanent assignment of particular models to particular roles.

An agent often discovers scope while working. The system should not require the human to predict at the beginning whether a request will remain small, need research, or become a multi-session initiative. It should preserve useful work as it happens and allow more structure to be added later.

### Existing behavior worth preserving

The current instructions already contain several proportionality rules:

- Reuse adequate current evidence rather than repeat discovery for every operation.
- Create workspace files only when needed.
- Allow trivial findings and bounded continuity checks to return directly.
- Keep ordinary design dialogue in the human-facing session.
- Use expensive consultation and specialist authoring when they provide a concrete benefit.
- Keep producer completion, coordinator acceptance, independent review, and human acceptance distinguishable.
- Preserve full actionable artifacts instead of repeatedly replacing them with parent summaries.
- Carry accepted authority forward without repeatedly requesting permission for ordinary steps.

The proposed reorganization preserves these useful distinctions while removing orchestration as the prerequisite for unrelated capabilities.

### Existing coupling that motivates extraction

The current package requires role bundles that combine design, routing, workspace, acceptance, recovery, and continuity instructions. It delegates implementation-source investigation even when only one file is involved. Human-facing orchestration uses Scribe and a specific session-history mechanism. Its storage root and Task Evidence skill are named after orchestration.

These choices can make sense within an explicitly selected orchestration workflow. They should not become requirements of every design conversation, investigation, or context capture.

## Ordinary sessions and explicitly selected workflows

### Default means ordinary harness operation

The human corrected an earlier proposal that treated default mode as a third designed workflow. Default means the harness operating normally under its existing instructions. There is no new default-mode skill, prescribed sequence, or special execution policy to load.

In an ordinary session, the system should not instruct the model how to investigate, implement, delegate, or verify every request. Existing harness and repository rules still apply. The modular system adds available capabilities and a narrow evidence-output convention.

This is a distinction between knowing that a capability exists and activating an ongoing workflow. A request that sounds substantial should not automatically attach an effort, start a Scribe, or enter orchestration.

An ordinary session may use a requested subagent without becoming an orchestrator. Similarly, asking the agent to explore a problem does not necessarily mean spawning the specifically named `explore` agent.

### Orchestrator mode changes execution routing

In explicitly selected orchestrator mode, the human-facing session remains the thinking and design partner. It delegates investigation and execution through the relevant agents, manages assignments and dependencies, integrates results, and accepts or challenges the returned work.

For example, an authorized request to design and implement a change keeps the design conversation in the main session while delegating implementation to a worker or another appropriate execution role.

### Chief mode adds a coordination layer

In explicitly selected Chief mode, the human-facing session retains high-level thinking, advice, and consequential decisions. It asks orchestrators for outcomes and supporting evidence. Each delegated orchestrator coordinates agents within its assigned workstream.

Chief describes the outcome and constraints. The orchestrator owns the subordinate investigation and dispatch plan within that assignment. Several independent workstreams can exist when the human authorizes the split. Different technologies or research topics do not automatically require separate workstreams.

### Selection and transitions remain explicit

The human wants the ability to begin with ordinary work and later enter orchestration, including a combined request such as "capture this and move into orchestrator mode."

Capturing work and selecting a workflow remain separate actions even when requested together. Capturing does not itself authorize execution, delegation, or publication.

The assistant proposed explicit transitions back to ordinary operation and between orchestration roles. This extends the existing role-selection design and needs a precise implementation contract. The latest explicit selection should govern subsequent routing, while accounting for already active assignments and preserving the effort's evidence and context.

Loading a skill does not erase earlier instructions. A practical transition contract must address that fact rather than assume skills behave like reversible runtime switches. It must also survive continuation without pretending that a departed role's running agents have disappeared.

The exact exit interface, the handling of in-flight work, and whether any transition recommendations should be allowed remain open. The current instructions prohibit agents from switching modes or recommending a switch. The discussion authorizes considering user-directed transitions, not silently broadening agent discretion.

## Design partnership as an independent capability

The human wants to start an ordinary OpenCode or Claude Code session and work with a design partner without adopting the full orchestration lifecycle.

Design partnership combines:

- Evidence about the current situation and likely consequences.
- The human's goals, opinions, vision, preferences, and corrections.
- Judgment about alternatives and tradeoffs.
- Taste about which feasible outcome is desirable.

Evidence can constrain a design and support predictions. It does not decide every preference. A useful partner recognizes when more research can change the decision and when the remaining choice belongs to the human's priorities or taste.

The proposed capability keeps the collaboration in the human-facing session. That session retains the evolving intent, including corrections and partially formed ideas. A separate architect or interface specialist can contribute expertise or an independent perspective when the task warrants it. A specialist is not a prerequisite for ordinary design dialogue.

The design partner should understand the desired outcome, challenge consequential assumptions, develop credible options, explain a recommendation, and identify the remaining questions. Existing code and instruction structures are evidence about migration cost and constraints, not proof that the existing approach is best.

The assistant recommended explicit activation for the standalone design-partner workflow because the human is concerned about broad skill descriptions loading unexpectedly. Ordinary agents remain free to brainstorm using their native behavior. Selecting the named skill applies a particular collaboration method.

Design partnership should not require implementation, a formal design document, an effort workspace, or a standing Scribe. An orchestration entry point can compose design partnership into its human-facing role.

## Evidence judgment, investigation, and output

### Evidence judgment belongs in design

The design partner needs to ask what is known, what is assumed, which uncertainty matters, and what would change the recommendation. It should recognize existing sufficient evidence and avoid research that cannot resolve the actual decision.

Investigation mechanics are reusable beyond design. Debugging, implementation, review, and operations also need bounded factual questions, relevant sources, applicability checks, and useful results.

This motivated separate proposed owners for investigation and evidence output. One capability decides how to answer a question. The other preserves what the investigation established.

### A deliberate investigation leaves an artifact

The human's final clarification is that automatic evidence preservation is acceptable in ordinary sessions. It changes the output of an investigation without prescribing how the model does its job.

The working convention is:

> When an agent performs a deliberate investigation, it saves the substantive findings to an evidence file and returns the useful answer with a pointer to the file.

This applies to a main session and to evidence-producing subagents. It does not require more investigation, delegation, a formal design stage, or activation of orchestration.

The unit is one coherent investigation. It is not one file for each tool call, source read, or observed fact. Reading neighboring code to make a small edit remains ordinary task inspection. Investigating why a behavior occurs, exploring alternatives, or researching a factual question produces a reusable result.

The exact boundary between ordinary inspection and deliberate investigation needs concrete examples during implementation. The distinction should not become an elaborate classification exercise before every read.

### Why preserve results when they are produced

The human repeatedly returned to a practical concern: if the agent already gathered the evidence, reconstructing it later is unnecessary work and may lose detail. A task that appears small may grow or encounter compaction before the human asks to capture it.

Saving the result at production time preserves source pointers, qualifications, and details while the investigator still knows them. It allows later capture to reuse existing evidence rather than replay an investigation.

File creation still has costs. Duplicate prose, stale findings, excessive logs, and poor discovery can burden later work. The proposed output convention therefore favors task-shaped evidence, concise descriptions in chat, and source pointers beside claims. It avoids mandatory report sections and attempt-by-attempt histories unless those details matter.

Operational learnings are optional incidental discoveries, such as an environment prerequisite or the command that worked after a relevant failure. They should not duplicate the investigation result or turn a local workaround into universal guidance.

### Investigation and delegation are separate

The evidence method can support direct reads, local source exploration, external research, runtime inspection, and bounded experiments. Delegation follows the active workflow and applicable authority.

The existing rule that implementation-source investigation must be delegated can remain an explicit orchestration policy. It should not be embedded in the standalone design-partner or evidence capability.

### Producer ownership

The producer owns its evidence artifact. The parent receives a useful answer and the artifact location. Full actionable detail remains accessible to downstream consumers without being replaced by a series of parent summaries.

Corrections and acceptance stay distinguishable from the producer's account. A stored finding is not automatically an accepted design decision, a verified implementation result, or permission to act.

## Evidence retention and capturing the wider effort

An effort can be a small change, a feature, an investigation, or an initiative. The term does not imply a minimum size or a fixed sequence of phases.

Saved evidence and a captured effort solve different problems. Evidence preserves what an investigation established. Capturing an effort preserves why the work matters, what the human decided, what happened, and how to continue.

### Lightweight evidence before an effort is established

An investigation should have somewhere to save its result before a named effort exists. The assistant proposed session-associated scratch storage. It should not automatically create the broader working records.

Persistent scratch was recommended over an operating-system temporary directory because the human wants to recover material after compaction, restart, or a later session. The exact pre-effort folder convention remains to be defined. This recommendation does not imply durable knowledge promotion.

### Capture is a bounded operation

"Capture this" preserves the recoverable work already performed. It can include:

- The current goal and relevant background.
- Scope, constraints, and the human's preferences.
- Decisions, rationale, alternatives, and corrections.
- Evidence already gathered and its accessible locations.
- Changes already made and verification actually performed.
- Unresolved questions, blockers, unfinished commitments, and next steps.

Capture does not restart discovery or fabricate records that would have existed under a more formal workflow. If a source result is no longer recoverable, the record should identify the gap. Rechecking should be targeted to material continuation needs.

The assistant initially leaned toward automatic ongoing maintenance after capture. The later discussion moved to a bounded operation. Capture alone does not establish indefinite maintenance or a standing Scribe. An explicitly selected workflow can assign maintenance separately.

Capturing may establish a named effort or associate the material with an existing one. The physical handling of pre-effort files, whether adoption, movement, or reference, remains open. The requirement is to reuse existing evidence without losing its identity or provenance.

### Resume and maintenance

Resuming reads enough of the relevant records to establish useful continuation context. It should not load an entire evidence corpus by default.

Maintenance updates assigned working records when an active workflow requires it. The current orchestration workflows can retain that obligation. A bounded capture or a request for an evidence directory should not inherit it merely because both use the same persistence skill.

### Concerns about current working files

The human is comfortable with evidence files but hesitant about maintaining `context.md` and `design.md`. The broader concern is whether the file structure fits a work item of any size without creating continuous bookkeeping.

The current definitions overlap at the edges. `context.md` includes accepted decisions and rationale. `design.md` includes accepted technical boundaries and tradeoffs. `coordination.md` tracks ongoing work, and `index.md` catalogs supporting material. A material change can touch several records.

The assistant initially proposed one small `work.md` entry point, with separate design, coordination, and index files only when they become useful. That was an exploratory recommendation, not an accepted replacement schema.

The human later separated the work into phases and asked to retain current persistence for the skill reorganization. The first phase therefore keeps the existing layout rather than introduce `work.md`. The underlying concern about duplication remains relevant to the later storage design.

## Skills as reusable capabilities and entry points

The human identified skills as the natural unit for reusable capabilities. Skills let an agent load a specific method when it needs one. The same mechanism can expose slash-invoked workflow entry points in both OpenCode and Claude Code.

The initial statement that Claude Code has skills instead of commands was refined during discussion. Claude Code still supports command files, but a skill-based design avoids maintaining separate behavioral command implementations for these workflows.

### Availability must not become implicit activation

The human is concerned that broad descriptions cause models to load optional workflows unexpectedly. A description such as "use when designing or implementing an effort" would match almost every coding task.

The proposed activation design distinguishes:

- Minimal standing guidance, including the evidence-output convention and discovery of saving or capture capabilities.
- Bounded operations such as saving evidence, capturing current work, or resuming an effort.
- Explicit ongoing workflows such as design partnership, orchestration, and Chief.

An action skill needs a bounded completion condition as well as a loading trigger. Its presence in conversation history must not imply a permanent behavioral change.

### Human-only entry points and reusable procedures

The human should explicitly select orchestrator or Chief mode. Their entry skills should use the harness's manual-invocation controls.

The underlying orchestration procedure must remain usable by authorized callers. When Chief dispatches an orchestrator, the child needs the procedure without another human slash invocation. A human-only wrapper and a reusable internal skill can share instructions without duplicating the workflow.

During this discussion, OpenCode V2 documentation described `metadata.opencode/autoinvoke: false` as hiding a skill from the model's available list while allowing explicit loading by ID. Claude Code documentation described `disable-model-invocation: true` as preventing automatic invocation and subagent preloading. These are different controls, not interchangeable security guarantees. Configuration should be checked against the installed versions before implementation.

### Portable behavior and harness-specific mechanics

Shared instructions can define design collaboration, evidence quality, assignment outcomes, artifact preservation, acceptance, and authority. Harness-specific references own dispatch mechanics, background completion, resumption, model selection, permissions, skill loading, and session-history access.

The current OpenCode Scribe synchronization depends on `session_context`, including `previousCompaction`. That is one implementation of continuity. It should not be presented as a capability that Claude Code already has.

Current Claude Code documentation inspected during the discussion supported nested subagents. The design should not assume the older prohibition on nested delegation. The installed version and actual configuration still need checking before adopting a topology.

Model assignments should remain configurable. The architecture should not encode a permanent association between a role and a particular model's price, context capacity, or writing quality.

## Proposed skill and folder structure

The latest proposal contains five reusable capability skills and two explicit workflow entry skills. Names and exact reference boundaries remain open to revision before authoring.

Each skill stays directly under `skills/active/`, matching the repository's current layout. Supporting references belong inside the owning skill. The proposal does not introduce another nested skill-discovery convention.

```text
skills/active/
  design-partner/
    SKILL.md
    references/
      design-and-prototypes.md

  evidence-gathering/
    SKILL.md
    references/
      investigation-and-routing.md

  task-evidence/
    SKILL.md
    references/
      evidence-and-learnings.md

  effort-context/
    SKILL.md
    references/
      capture-and-resume.md
      filesystem-storage.md
      record-maintenance.md
      continuity/
        opencode.md
        claude-code.md

  orchestration/
    SKILL.md
    references/
      assignments-and-dependencies.md
      routing-and-roles.md
      acceptance-and-review.md
      execution-and-delivery.md
      chief-workstreams.md
      harnesses/
        opencode.md
        claude-code.md

  orchestrate/
    SKILL.md

  orchestrate-chief/
    SKILL.md
```

References are procedures owned by their containing skill. They are not additional skills or a requirement to load every file. Shared requirements should have one owner, with relevant references loaded as needed.

### `design-partner`

This skill owns goals, preferences, constraints, assumption challenges, options, recommendations, and the identification of useful investigations. It owns the human-facing design dialogue and the decision to seek authorized specialist advice or a prototype.

It is explicitly selected by the human or composed into a selected orchestration workflow. It can use evidence gathering without prescribing whether the work is direct or delegated. It does not require persistence merely to think with the human.

### `evidence-gathering`

This skill owns bounded factual questions, relevant source selection, applicability and freshness, reuse, uncertainty, and a stopping judgment. It can select direct investigation or appropriate evidence agents when delegation is available and authorized.

It is discoverable for deliberate investigations. Ordinary inspection during an edit does not trigger it solely because files were read. The skill should remain small enough that an investigation does not become a fixed research lifecycle.

It uses `task-evidence` for the resulting artifact.

### `task-evidence`

This is the proposed portable successor to `orchestrator-task-evidence`. It owns evidence-writing quality, source pointers, qualifications, optional operational learnings, producer ownership, and the useful return to the caller.

It applies to deliberate investigation results and explicitly assigned evidence. It obtains storage instructions from `effort-context` rather than duplicating a root path or layout.

The later producer-side registration operation belongs at this boundary. The producer writes the artifact, registers it through MCP, and returns its identity and location.

### `effort-context`

This skill owns bounded storage-location lookup, capture, resume, and assigned maintenance. Calling one operation does not activate the others.

`filesystem-storage.md` is the single owner of the current root, directory selection, file purposes, pre-effort storage convention, and index mechanics. `record-maintenance.md` owns updates to established working records and their writer ownership. Capture and resume describe bounded continuation operations.

Harness-specific continuity references isolate OpenCode's current mechanisms and any separately verified Claude Code mechanism. A Claude Code reference must not assert equivalence before that behavior exists and has been checked.

Scribe remains available for existing orchestration maintenance. A bounded capture does not automatically establish a standing Scribe lifecycle.

### `orchestration`

This skill owns assignments, agent routing, dependencies, overlapping work, integrated results, acceptance, verification, review, remediation, and authorized delivery.

It supports human-facing orchestrator, delegated orchestrator, and Chief roles through selected references. Shared briefing, authority, and acceptance rules should not be copied into every role.

The human-facing orchestrator composes design partnership, evidence gathering, effort context, and coordination. A delegated orchestrator receives coordination, evidence, and effort procedures appropriate to its assignment. It should not load instructions to become the human's conversational partner. Chief composes design partnership, root effort context, and workstream coordination.

Selection or writable paths do not grant authority. Existing distinctions between design agreement, execution permission, publication scope, and accepted results remain necessary.

### `orchestrate` and `orchestrate-chief`

These are thin, manually invoked skills that replace the current OpenCode command bodies.

`orchestrate` selects the current session as the human-facing orchestrator, composes the relevant capabilities, retains the design dialogue, and applies delegated routing. It reuses existing context and evidence.

`orchestrate-chief` selects Chief collaboration and workstream routing. It supplies delegated orchestrators with the reusable procedure and their assigned role.

Neither skill needs to contain the full coordination procedure. Neither creates a default-mode counterpart. Exit and transition behavior must be explicit in the role contract.

### Invocation boundaries

| Skill | Proposed invocation boundary |
| --- | --- |
| `design-partner` | Explicit human selection or composition by an explicitly selected workflow |
| `evidence-gathering` | A deliberate investigation within the task's authority |
| `task-evidence` | Evidence production, with explicit use in producer assignments |
| `effort-context` | Requested capture or resume, assigned maintenance, or a narrow storage-location operation |
| `orchestration` | Authorized workflow composition or a delegated coordination assignment |
| `orchestrate` | Human-only workflow entry |
| `orchestrate-chief` | Human-only workflow entry |

## Keeping the current persistence layer during phase one

The human explicitly separated skill reorganization from the later database service. The first phase keeps the existing root and file layout:

```text
~/workspace/scratch/orchestrator-workspaces/<effort>/
  context.md
  coordination.md
  index.md
  design.md
  evidence/
  learnings/
  synthesis/
  sources/
  screenshots/
  sessions/
  workstreams/
```

Files and directories remain demand-driven. The current purposes are:

- `context.md` preserves purpose, background, scope, constraints, accepted decisions, rationale, and open questions.
- `coordination.md` preserves assignments, session handles, authority, dependencies, blockers, verification state, and next steps.
- `index.md` catalogs locations, relevance, freshness, qualifications, conflicts, and supersession.
- `design.md` preserves accepted shared technical boundaries, interfaces, invariants, flows, and tradeoffs. It does not grant implementation authority.
- `evidence/` holds task-shaped producer outputs.
- `learnings/` holds optional incidental operational discoveries.
- `synthesis/` holds explicitly requested fuller preservation of reasoning and discussion.
- `sources/` holds selected raw captures when needed.
- `screenshots/` holds selected rendered evidence.
- `sessions/` associates sessions with the effort under the current convention.
- `workstreams/` separates independently coordinated scopes with the same internal structure.

The name `orchestrator-workspaces` is broader than its intended future use. Retaining it temporarily avoids mixing the instruction refactor with a physical migration. The new storage owner can later change the mechanism without requiring every capability to be rewritten.

The extraction still needs to define evidence-only storage before an effort exists. That is a narrow addition to the existing filesystem mechanism, not authorization for a new database or a wholesale folder reorganization.

## Existing skills and assets that intersect the proposal

### Current orchestration package

The current `orchestrator-mode` root and references contain the responsibilities being separated. `orchestrator-task-evidence` supplies the producer method. The two OpenCode commands select direct orchestration and Chief mode.

The proposed ownership mapping is:

| Existing responsibility | Proposed owner |
| --- | --- |
| Human-facing thinking and design direction | `design-partner` |
| Missing-evidence questions and investigation choice | `evidence-gathering` |
| Producer results and operational learnings | `task-evidence` |
| Workspace, capture, index, and continuation | `effort-context` |
| Scribe synchronization and recovery | `effort-context` continuity references |
| Assignment, routing, dependencies, acceptance, delivery | `orchestration` |
| Chief workstream management | `orchestration` Chief reference |
| `/orchestrate` command | `orchestrate` skill |
| `/orchestrate-chief` command | `orchestrate-chief` skill |

After consumers are migrated, the old skills can be retired rather than remain alternative authorities. Whether a short compatibility period is needed is an implementation decision.

Agent definitions remain useful. Reorganizing skills does not imply eliminating evidence, worker, operator, architect, reviewer, authoring, or Scribe roles. Agent configuration still owns permissions and model preferences. The skills own reusable methods and workflow composition.

### Existing `work-context`

The repository already contains `work-context`. Its current contract uses `mfz work`, `orientation.md`, `context-map.md`, session attachment, phase changes, and checkpoint operations.

That mechanism differs from the orchestrator workspace discussed here. The assistant proposed the distinct name `effort-context` to avoid pretending the two systems are already equivalent. Consumer and activation overlap must be inspected before implementation. This discussion did not select a migration or merger of the existing work-unit lifecycle.

### Existing `session-brief`

`session-brief` creates or refreshes a bounded working view of one source session. It has its own extraction, source-boundary, checkpoint, and validation rules.

Capturing an effort can span sessions and should not automatically invoke that heavier session-extraction workflow. A raw user-and-assistant transcript is also different from a Session Brief. The transcript preserves conversation text. A brief interprets and organizes one session. An effort capture preserves continuation state for a body of work.

## Later storage service

The human wants a database and MCP server after the skill reorganization. The goal is a shared storage and management capability that ordinary sessions, design partners, and orchestrators can all use.

### Division of authority

The human rejected the assistant's suggestion to store metadata in frontmatter or sidecar files so that the database could be rebuilt. The intended split is:

| Component | Responsibility |
| --- | --- |
| Filesystem | Actual evidence, designs, captures, conversation exports, and other content |
| Database | Identities, descriptions, file pointers, relationships, tags, groupings, organization, and indexing state |
| Shared application logic | Storage resolution, registration, retrieval, session extraction, and updates |
| stdio MCP server | Agent-facing access to those operations |
| Small CLI | Access for plugins, hooks, scripts, and manual operations |

The database is therefore authoritative for organization. It is not merely a disposable cache. Losing the database would lose relationships that do not exist in the content files. Its durability matters alongside the durability of the files.

Evidence producers should not be made responsible for document frontmatter or sidecar metadata. They write the content and register the artifact through the service.

### Why a database helps

The current index file is a manual catalog. The desired service can answer queries such as:

- List every artifact for an effort.
- List only the evidence for an effort.
- Return descriptions and file pointers so an agent can choose what to read.
- Find sessions that contributed to an initiative.
- Show current projects, initiatives, and other in-progress work.
- Connect evidence to designs or other work that uses it.
- Organize material with tags and groupings.
- Expand to a management interface for viewing and assigning work.

The human wants meaningful folders because they also inspect files directly. The database should support relationships that exceed one directory hierarchy without making the filesystem unintelligible.

The assistant recommended one primary physical home per artifact and stable identities independent of file paths. A file can support several efforts without being copied into each one. Moving an artifact later should not destroy its identity or its relationships. These are design recommendations, not an established schema.

Projects, initiatives, efforts, sessions, artifacts, messages, relationships, and tags were discussed as candidate concepts. The exact entities and hierarchy remain open. An effort can affect multiple projects, and a session can contribute to more than one effort.

### Producer-side registration

The human specifically wants an evidence-producing subagent to create the file and the database association itself. Registration should not require another round trip through the orchestrator.

The proposed flow is:

1. Obtain or receive a valid output location and relevant session or effort identity.
2. Write the evidence file.
3. Register the completed artifact through MCP.
4. Return the substantive answer, artifact identity, and location.

The producer can supply a path, title, description, artifact kind, originating session or assignment, and any already assigned effort identity. The service supplies identifiers and records the relationships. The producer should not need to understand the database schema or infer how the entire initiative is organized.

Registration does not mean coordinator acceptance. Those facts must remain separate. Registration should also be safe to retry if a file write succeeds but the service call fails. It should attach the existing artifact instead of duplicating it.

Automatic association is straightforward when the assignment already supplies the relationship. An inferred association based on semantic similarity is a different operation. The assistant recommended treating uncertain associations as suggestions initially. The human has not settled the exact automatic-assignment policy.

### Service-owned root and on-demand locations

The service will have a configured root folder. Skills, agent definitions, and briefs should not hardcode it.

The human does not want a mandatory session-start operation. The workflow should obtain storage information when it first needs to persist something.

The assistant proposed combining location discovery with a useful operation, such as preparing evidence storage for a session or resuming an effort. A response can provide the relevant identity and absolute write location. A separate generic root-query tool may be unnecessary.

Requesting evidence storage should not automatically create an effort. A parent can obtain the location and pass it to a producer, or the producer can request it using supplied context. Both use one service-owned layout.

The CLI conversation exporter should use the same storage logic internally. The service decides where material belongs. Producers decide what their artifacts contain.

### stdio MCP and a small CLI

The human specified a stdio MCP server and proposed a small reusable CLI. The assistant recommended that both call the same application logic.

```text
Agent through stdio MCP
                       Shared operations -> database and files
Plugin or hook through CLI
```

The CLI does not need to launch an MCP client. The MCP server and CLI should not implement separate versions of registration or session extraction.

A network API was discussed as a possibility for a later management application. It is not a first-version requirement. The database engine, service host, implementation language, concurrency model, and backup mechanism remain undecided.

Concurrent harness sessions and hooks can target the same store. Registration, file updates, and indexing state will need consistent behavior when operations overlap.

## Main-session conversation history

### What the human wants to preserve

The human wants every human request and assistant response from a main session. The purpose is to examine the evolving dialogue, especially how their own thinking changes through corrections, alternatives, and decisions.

Tool calls, file-read output, and subagent traces are unnecessary for this conversational view. The desired history is the main-session exchange rather than a complete execution audit.

The human wants to retrieve this material across several sessions and ask how their thinking about a subject evolved over time.

### File-backed conversation export

The human accepted that the conversation can be a Markdown file with a database pointer. Individual message rows in the database are optional, not a settled requirement. The assistant recommended beginning with session and artifact relationships, then adding message-level indexing only if retrieval needs justify it.

A retained export should preserve the native harness session identity and enough message identity to locate statements. The native session history is the original source. The Markdown transcript is an extracted copy suitable for continued use outside that harness.

### Conversation filtering

The intended export includes actual human messages and assistant text. Assistant commentary can contain meaningful dialogue and belongs alongside final answers.

It excludes hidden reasoning, tool calls and results, injected system or skill instructions, synthetic completion notifications, and subagent transcripts. Where a source has attachments, the export should disclose whether attachment references or bodies are included rather than silently treating a text-only export as complete multimodal history.

A filtered conversation can establish that an assistant claimed to have verified something. It cannot independently establish the verification. Evidence artifacts remain the place for supporting results.

### Separate conversation from interpretation

A later analysis of thought evolution should distinguish what the human said, what the assistant proposed, and what the analysis infers. An assistant suggestion must not silently become a human preference or accepted decision.

Preserving the exact exchanges makes it possible to inspect those distinctions. A synthesized history can point to the statements that support it.

### Automatic indexing through harness integration

The human proposed an OpenCode plugin or Claude Code hook that calls the CLI at a suitable completion event. The same indexing operation can also be invoked intentionally through MCP.

The assistant recommended a completed conversational turn as the likely trigger rather than waiting for session closure. The actual event and hook semantics still need checking. The integration must establish whether the assistant response has been persisted, how to identify the main session, and how duplicate or missed events behave.

The proposed indexing operation reads a named session through a harness adapter, filters the human-visible conversation, creates or updates the Markdown export, and updates database indexing state.

Incremental updates were recommended to avoid exporting the whole session after every reply. The service would track processed source messages or revisions. A full refresh remains useful for reconciliation after missed events or edits. No incremental protocol was settled.

Duplicate triggers should be harmless. Failures should be observable and retryable without making the model repeat an answer. Source edits, forks, compaction, partial responses, and message replacement require explicit handling rather than assumptions about append-only history.

## Representative scenarios

### A quick change remains ordinary

The human asks for a small change. The harness follows its normal behavior and applicable instructions. Nearby source reads do not require a report. No optional workflow activates simply because the work involves code.

### An ordinary investigation produces saved evidence

The human asks the agent to explore a question and then make a change. The investigation leaves an evidence file under the standing output convention. The agent can do the investigation directly. Execution remains governed by the ordinary session and the request's authority.

### Design without delivery

The human selects design partnership to brainstorm. The session develops understanding and options. Deliberate investigations save their findings. No implementation or publication follows unless requested or otherwise authorized.

### Design and implementation under different routing

In an ordinary session, the model may design and implement directly. Under orchestration, design dialogue stays in the human-facing session while execution is delegated. Under Chief, the human-facing session asks an orchestrator to manage delivery.

The outcome request does not itself select the routing mode.

### A small change becomes a larger effort

An investigation reveals that the work has broader implications. Existing evidence is already saved. The human requests capture, and the agent preserves intent, decisions, progress, and evidence links. Capture does not force orchestration.

### Capture and enter orchestration together

The human explicitly requests both operations. The session captures existing work, establishes the selected routing role, and delegates remaining work within the existing authority. It reuses sufficient evidence instead of restarting the effort.

### Continue from another harness

A later OpenCode or Claude Code session retrieves or reads the same effort material. Shared behavioral instructions explain the artifact meanings. Harness-specific integration handles its own dispatch and continuity mechanics.

### Review and pull-request delivery

An authorized delivery request can cover necessary implementation, verification, review, remediation, and pull-request preparation or creation within its expressed scope. Routing follows the selected workflow. Independent review remains distinct from the author's own checks.

### Chief manages independent outcomes

The human assigns independently useful outcomes to separate orchestrators. Each coordinates its own workstream and returns consequential questions outside its authority. Root context preserves cross-workstream decisions without duplicating every producer's evidence.

### Trace thinking across sessions

The later service finds conversation exports associated with an effort, initiative, or topic. An analysis retrieves selected exchanges and explains how the human's position evolved, citing source messages and distinguishing assistant proposals from human decisions.

## Changes of direction that must survive continuation

Several corrections are central to the design and should not be lost in a shorter handoff:

1. The assistant initially described default as a designed mode with its own execution rules. The human clarified that it is ordinary harness behavior. No default-mode workflow is wanted.
2. The assistant initially favored selective evidence persistence and later restricted automatic saving to explicitly selected workflows. The human clarified that a standing evidence-output convention is acceptable in ordinary sessions because it changes the output, not how the agent does its job.
3. The human considered temporary evidence storage to avoid reconstructing findings later. Persistent scratch was recommended so provisional evidence remains recoverable. The exact folder policy is still open.
4. The assistant proposed one `work.md` and on-demand splits. The human later chose to keep the current persistence mechanism during skill reorganization. The replacement layout was not adopted.
5. The assistant proposed a rebuildable database with file-backed metadata. The human rejected frontmatter and sidecars for this purpose. The database owns metadata and relationships.
6. The human wants evidence producers to register their own artifacts. The orchestrator should not be required to perform registration on every producer's behalf.
7. The human accepted a Markdown conversation export with a database pointer. Storing every message body in database rows is not required by that choice.
8. The MCP transport is stdio. A small CLI is desirable for automation and future reuse. A network API remains optional.
9. Storage configuration belongs to the service. Discovery should happen when persistence is needed, not as a mandatory operation at every new session.
10. Capturing an effort and entering orchestration are independent. They can be requested together, but neither implies the other.
11. Explicit entry skills must be separated from reusable procedures so a Chief can assign an orchestrator without another human invocation.
12. Skill reorganization comes first. The database and MCP service come later.

## Implementation sequence under consideration

The proposed first phase is:

1. Extract evidence production and filesystem persistence from the orchestration package.
2. Extract design partnership and investigation guidance.
3. Reduce orchestration to coordination, role-specific delegation, and authorized delivery.
4. Replace the two command implementations with manual skill entry points.
5. Reconcile consumers, agent descriptions, authoring records, and activation controls.
6. Check the representative ordinary, design-only, capture, orchestrator, and Chief scenarios.

The current repository is a Mindframe-Z home. Actual configuration changes must follow its guide and authoring requirements. Shared behavior belongs in `base`, and Personal-only configuration belongs in `personal`. Runtime activation, commits, pushes, and external publication remain separately scoped operations.

The proposed later phase adds the shared storage operations, database-owned catalog, stdio MCP interface, CLI, harness-specific session adapters, and automatic indexing integrations. Producer registration enters `task-evidence`. Service-owned storage and retrieval enter `effort-context`.

The first useful storage-service exercise would save and register an investigation, list a session's evidence, capture an effort around it, export the main conversation, and resume from another session. A management interface and richer semantic organization can follow demonstrated retrieval needs.

## Questions to settle before implementation

- Are the seven skill names and ownership boundaries the preferred first cut?
- Is a separate `evidence-gathering` skill useful enough to justify its loading cost, or should some of its small common rules live in callers?
- What concrete examples distinguish ordinary inspection from a deliberate investigation?
- What is the evidence-only directory convention before a named effort exists?
- How does a bounded capture find or establish the correct effort without activating ongoing maintenance?
- How should existing `work-context` consumers coexist with `effort-context`?
- Which current Scribe behaviors remain mandatory inside orchestration, and which become optional implementations of maintenance?
- How do explicit role transitions handle active children and previously loaded instructions?
- Which shared agent definitions and skill metadata need separate OpenCode and Claude Code rendering?
- What current Claude Code continuity behavior can be supported and verified?
- Which database, identity scheme, relationship model, and backup approach should the later service use?
- Which registrations and relationships can be assigned automatically, and which inferred associations remain suggestions?
- What happens when an artifact moves, changes, disappears, or is superseded?
- Which hook or plugin events fire after a main-session response is durably available?
- What message-level indexing is actually needed beyond conversation-file pointers?
- How will exports handle source edits, forks, attachments, interrupted responses, and sessions that span multiple efforts?

## Source locations and portable continuation

The following repository-relative paths identify the current implementation and explanatory material. A reader with this folder alone can use the descriptions above and the transcript. A reader with the repository can inspect the originals before making changes.

- `skills/active/orchestrator-mode/SKILL.md` and its `references/common/`, `references/orchestrator/`, and `references/chief/` directories.
- `skills/active/orchestrator-task-evidence/SKILL.md`.
- `opencode/commands/orchestrate.md` and `opencode/commands/orchestrate-chief.md`.
- `opencode/agents/orchestrator.md` and the affected evidence, execution, review, and Scribe definitions.
- `skills/active/work-context/SKILL.md`.
- `skills/active/session-brief/SKILL.md`.
- `docs/orchestrator/architecture.md`.
- `docs/orchestrator/redesign-2026-09-22.md`.
- `docs/orchestrator-author-operator-workflow.md`.

The architecture page marks much of its older content as historical. The redesign document preserves accepted rationale and points to subsequent refinements. The runtime skill owns current execution behavior. The historical author/operator investigation should not be used as proof that its universal-note or topology assumptions still apply.

Official harness references consulted during discussion include [OpenCode V2 agents](https://opencode.ai/v2/docs/agents), [OpenCode V2 skills](https://opencode.ai/v2/docs/skills), [Claude Code subagents](https://code.claude.com/docs/en/sub-agents.md), and [Claude Code skills](https://code.claude.com/docs/en/skills.md). Their configuration and lifecycle details require version-matched rechecking during implementation.

The [exporter reference](exporter.md) explains how to regenerate the accompanying transcript from the OpenCode SQLite projection. The saved [Python script](export-session.py) is a starting point for the later CLI's extraction adapter. It is a full text-export utility, not the proposed storage service or incremental indexer.
