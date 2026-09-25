# Context Transfer refactor

On 2026-09-22, Context Transfer was replaced by [Artifact Context](../../skills/active/artifact-context/SKILL.md). The replacement focuses on what readers need in an artifact consumed apart from its originating conversation.

## Why the scope changed

The former skill combined artifact context, routine agent briefing, specialist handoffs, presentation, and publication workflow. Four paired delegation tasks supplied practical support for letting routine prompting use model defaults. They did not establish a general failure of context guidance or test the human-artifact branch.

The user accepted a smaller artifact-focused skill and asked to preserve the retired prompting guidance. The initial human-versus-agent split became a distinction between prompt preparation and artifacts that preserve understanding. A saved prompt is still a prompt; an artifact can serve human or agent readers.

## Preserved sources

- [Original package](original/SKILL.md): unchanged pre-refactor runtime text and all four reference branches. This is historical material, outside skill discovery. Its instructions are not current policy.
- [Delegation experiments](delegation-experiments.md): outcomes, limitations, and evidence locations for the four paired tasks.
- [Original agent briefs](original/references/agent-briefs.md): recoverable guidance for comparison if future failures justify a specific rule. No runtime consumer is required to load this archive.
- [Original specialist policy](original/references/specialist-handoffs.md): the previous policy, preserved separately from its current owner.

## Current ownership

| Concern | Owner after the refactor |
| --- | --- |
| Context, reader assumptions, and proportional references in durable artifacts | `artifact-context` |
| Prose and document craft | Applicable writing or artifact workflow |
| Routine delegation | Model defaults plus the active workflow's own contract |
| Complete actionable artifacts and explicit correction overlays | [Orchestration handoffs](../../skills/active/orchestration/references/assignments-and-dependencies.md#complete-artifact-handoffs) |
| Format, storage, validation, and publication authority | Owning workflow and destination instructions |
| Runtime skill writing preferences | `skill-authoring` |

Orchestrator Mode retains its existing brief core, evidence, scribe, and authority contracts. Its record explicitly treats that core as correctness-critical. The refactor removes its broad Context Transfer dependency and relocates the specialist policy; it does not infer that the delegation experiments tested the orchestration workflow itself.

`artifact-author` uses the new skill. The retained sources of `session-brief` and `session-derived-knowledge` also name it for their durable artifacts, while those two skills remain disabled in Personal.

## Invocation and structure

Artifact Context loads on explicit request or through an owning workflow. `metadata.opencode/autoinvoke: false` excludes it from OpenCode's model-facing available list while preserving explicit loading by ID. Other harnesses receive the loading restriction in the description and body; this refactor does not claim the OpenCode toggle controls them.

The new text uses topic sections, useful short prose, and individually inspectable bullets. All runtime passages are for the agent. Human readability supports inspection and maintenance. The skill has no mandatory six-stage procedure, repeated completion statements, or archived agent-briefing dependency.

## Decision provenance

The source discussion is OpenCode session `ses_f35094f6bffe0vNBuqHFVYK2oZ`:

- User messages 1082 and 1121 distinguish audience from artifact purpose and question routine prompting guidance.
- User messages 1166 and 1306 select Sol medium and Luna high and accept CLI delegation.
- User message 1543 authorizes the refactor and preservation of retired guidance; message 1559 accepts the proposed artifact-focused direction.
- User messages 1568 and 1577 establish short contextual prose plus bullets, with every passage intended for the LLM.
- User message 1648 places local authoring policy in the owned Skill Authoring skill rather than the vendor dependency.

These decisions are user preferences informed by the experiments. They are not claims of universal model equivalence. The external authoring record was migrated to `authoring-records/mfz-home/skills/artifact-context/` in Personal Knowledge, with its previous files preserved under `history/context-transfer/`.
