# Use the modular workflows

## Choose a collaboration workflow

- Use `/design-partner` for explicit design collaboration. Discuss goals, evidence, preferences, and tradeoffs without requiring implementation.
- Use `/orchestrate` to retain design dialogue in the current session while delegating investigation and execution.
- Use `/orchestrate-chief` to retain high-level decisions while orchestrators coordinate bounded workstreams.
- To leave a workflow, say so explicitly, for example, "Exit orchestration and continue normally." The session reconciles active assignments and pending writes before returning to ordinary routing.

Ordinary sessions keep their native behavior. Deliberate investigations save their findings through `task-output`; incidental code reads and routine checks do not each create an artifact.

## Capture or resume work

Ask "Capture this effort" to preserve the current goal, decisions, rationale, work state, and evidence pointers. Capture is a bounded operation and does not select orchestration or start continuous record maintenance.

Ask "Resume the effort at `<path>`" to load relevant continuation context. To continue a particular coordination role, name that role in the request.

Before capture, evidence lives in a session directory under the existing scratch root. Capture links those producer-owned files into the effort index. The storage rules are in [Effort Context](../../../skills/active/effort-context/references/filesystem-storage.md).

## Find the owning instructions

| Capability | Runtime source |
| --- | --- |
| Design collaboration | [Design Partner](../../../skills/active/design-partner/SKILL.md) |
| Deliberate investigation | [Evidence Gathering](../../../skills/active/evidence-gathering/SKILL.md) |
| Evidence output and reuse | [Task Output](../../../skills/active/task-output/SKILL.md) |
| Storage, capture, resume, maintenance | [Effort Context](../../../skills/active/effort-context/SKILL.md) |
| Coordination procedures | [Orchestration](../../../skills/active/orchestration/SKILL.md) |
| Direct entry | [Orchestrate](../../../skills/active/orchestrate/SKILL.md) |
| Chief entry | [Orchestrate Chief](../../../skills/active/orchestrate-chief/SKILL.md) |

The shared base profile enables these skills for OpenCode and Claude Code. Design partnership and the two orchestration entries are manual in both. Orchestration composes the shared design reference directly. OpenCode uses its configured specialist agents and synchronized Scribe. Claude Code uses available native agents with bounded role briefs and direct record maintenance where equivalent Scribe retrieval is unavailable.

The [design record](design.md) preserves the broader discussion and later storage-service proposal. The database catalog, MCP server, automatic transcript indexing, and registration CLI remain future work. The [exporter](exporter.md) is a standalone full-session text export utility.
