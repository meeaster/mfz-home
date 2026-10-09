---
name: effort-context
description: Use for requested effort capture or resume, synthesis or handoff for continuation, recommending an effort once work has a subject, writing up evidence into a knowledge article or re-checking one against its origins, saving a meeting or message thread as a source, registering Jira items, Confluence pages and other links or refreshing what Jira says, bringing earlier material into an effort, explicitly assigned working-record maintenance, or locating storage for output files. These are bounded operations, not workflow entry.
---

# Effort Context

Select the bounded operation requested or required by the caller. Loading this skill activates none of the other operations.

| Operation | Read | Completion |
| --- | --- | --- |
| Locate storage | [Storage](references/storage.md) | A usable owned output path, or a specific access conflict |
| Recommend an effort | [Efforts](references/efforts.md) | The human has a recommendation to answer, or has answered it and the answer is applied |
| Capture current work | [Storage](references/storage.md), [efforts](references/efforts.md), [capture and resume](references/capture-and-resume.md) | Recoverable intent, decisions, evidence, and state preserved in an effort with disclosed gaps |
| Preserve discussion or prepare a handoff | [Storage](references/storage.md), [synthesis and handoff](references/capture-and-resume.md#synthesis-and-handoff) | Requested understanding preserved in synthesis, with a continuation pointer when an effort is established |
| Resume an effort | [Capture and resume](references/capture-and-resume.md), [efforts](references/efforts.md) | Relevant continuation context and current authority understood, and this session attached |
| Write up knowledge | [Knowledge](references/knowledge.md) | The article covers what the evidence in scope establishes about its subject, each of those evidence files either informs it or is reported as left out with the reason, and each system the article rests on is recorded as a reference |
| Re-check knowledge | [Knowledge](references/knowledge.md#re-check) | Every reference in scope looked at again: the new look recorded, the article corrected where the origin changed, and each reference that couldn't be reached reported |
| Save a meeting or message thread | [Storage](references/storage.md#sources) | The source saved in its folder and described; a meeting also has its summary with candidates for intake |
| Register Jira items, Confluence pages or other links, or refresh Jira | [Storage](references/storage.md#jira-items-confluence-pages-and-other-links) | Each link registered with its role, why it's there and its efforts, and each Jira item or page read described with what was read |
| Bring in existing material | [Import](references/import.md), [storage](references/storage.md), [knowledge](references/knowledge.md) | Every file in scope feeds a record, an article, or a source, or is reported as left out with the reason; unaccepted items remain marked candidates |
| Maintain assigned records | [Record maintenance](references/record-maintenance.md) | The assigned state change recorded and readers released |

## Efforts are the human's choice

- The human approves attaching a session to an effort, creating a regular effort, promoting a provisional one, detaching, splitting, merging, and excluding a file from an effort. Recommend, then act on the answer. A request that names an effort ("capture this into the S3 effort", "resume the S3 effort") is approval for that effort.
- Create a provisional effort without asking only when capturing work that names no effort, and recommend what should become of it.
- Default-mode and orchestrated work need no effort until the human asks for one. Its files stay in the session folder and are described like any other output.
- Knowledge articles and sources belong to their subjects, not to an effort, and join efforts through membership. Linking one to an effort whose work relies on it or adds to it needs no approval.

## Boundaries

- Preserve the active execution role. Capture, handoff, or resume alone does not select orchestration, change work-unit bindings, authorize delivery, or establish a standing Scribe. Preparing a handoff does not authorize compaction.
- Each operation ends at its completion condition. Ongoing maintenance happens only when the human assigns it.
- `work-context` owns explicit `mfz work` operations and its `orientation.md`/`context-map.md` lifecycle. `session-brief` owns explicitly requested refreshable single-session briefs. Do not substitute either for effort capture or invoke them automatically.
- Follow the current harness reference only when session retrieval or ongoing continuity is needed: [OpenCode](references/continuity/opencode.md) or [Claude Code](references/continuity/claude-code.md).
