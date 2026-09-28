# Use the modular workflows

## Choose a collaboration workflow

- Use `/design-partner` for explicit design collaboration. Discuss goals, evidence, preferences, and tradeoffs without requiring implementation.
- Use `/orchestrate` to retain design dialogue in the current session while delegating investigation and execution.
- Use `/orchestrate-chief` to retain high-level decisions while orchestrators coordinate bounded workstreams.
- To leave a workflow, say so explicitly, for example, "Exit orchestration and continue normally." The session reconciles active assignments and pending writes before returning to ordinary routing.

Ordinary sessions keep their native behavior. Dispatched subagents write their responses through `task-output`; a session's own lookups and investigations are answered in its reply.

## Capture or resume work

Ask "Capture this effort" to preserve the current goal, decisions, rationale, work state, and evidence pointers. Capture is a bounded operation and does not select orchestration or start continuous record maintenance.

Ask "Resume the effort at `<path>`" to load relevant continuation context. To continue a particular coordination role, name that role in the request.

Files a session writes live in its folder under Cairn's root. Capture attaches the session to an effort, which brings those files into the effort's view without moving them. The storage rules are in [Effort Context](../../../skills/active/effort-context/references/storage.md).

## Find the owning instructions

| Capability | Runtime source |
| --- | --- |
| Design collaboration | [Design Partner](../../../skills/active/design-partner/SKILL.md) |
| Evidence output and reuse | [Task Output](../../../skills/active/task-output/SKILL.md) |
| Storage, capture, resume, maintenance | [Effort Context](../../../skills/active/effort-context/SKILL.md) |
| Coordination procedures | [Orchestration](../../../skills/active/orchestration/SKILL.md) |
| Direct entry | [Orchestrate](../../../skills/active/orchestrate/SKILL.md) |
| Chief entry | [Orchestrate Chief](../../../skills/active/orchestrate-chief/SKILL.md) |

The shared base profile enables these skills for OpenCode and Claude Code. Design partnership and the two orchestration entries are manual in both. Orchestration composes the shared design reference directly. OpenCode uses its configured specialist agents and synchronized Scribe. Claude Code uses available native agents with bounded role briefs and direct record maintenance where equivalent Scribe retrieval is unavailable.

The [design record](design.md) preserves the broader discussion and later storage-service proposal. [Cairn](../../cairn/design.md) implements that proposal's catalog, MCP server, CLI, and conversation export. The [exporter](exporter.md) is a standalone full-session text export utility.
