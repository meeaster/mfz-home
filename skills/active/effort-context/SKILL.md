---
name: effort-context
description: Use for requested effort capture or resume, explicitly assigned working-record maintenance, or locating storage for evidence. Capture preserves current work without entering orchestration or starting ongoing maintenance.
---

# Effort Context

Select the bounded operation requested or required by the caller. Loading this skill activates none of the other operations.

| Operation | Read | Completion |
| --- | --- | --- |
| Locate storage | [Filesystem storage](references/filesystem-storage.md) | A usable owned output path, or a specific access conflict |
| Capture current work | [Filesystem storage](references/filesystem-storage.md), [capture and resume](references/capture-and-resume.md) | Recoverable intent, decisions, evidence, and state preserved with disclosed gaps |
| Resume an effort | [Capture and resume](references/capture-and-resume.md), storage reference if locating it | Relevant continuation context and current authority understood |
| Maintain assigned records | [Record maintenance](references/record-maintenance.md) | The assigned state change recorded and readers released |

- Preserve the active execution role. Capture or resume alone does not select orchestration, change work-unit bindings, authorize delivery, or establish a standing Scribe.
- An explicitly selected orchestration workflow assigns ongoing maintenance. Otherwise each operation ends at its completion condition.
- `work-context` owns explicit `mfz work` operations and its `orientation.md`/`context-map.md` lifecycle. `session-brief` owns explicitly requested refreshable single-session briefs. Do not substitute either for effort capture or invoke them automatically.
- Follow the current harness reference only when session retrieval or ongoing continuity is needed: [OpenCode](references/continuity/opencode.md) or [Claude Code](references/continuity/claude-code.md).
