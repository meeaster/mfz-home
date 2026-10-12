# artifact-context

## Intent

Help a report, proposal, design document, or reference carry the meaning its reader needs, so a human or agent can use it without the conversation that produced it.

Not for: routine subagent prompts, continuation handoffs, specialist-to-implementation transfers, prose craft, or publishing. Owning workflows keep their format, storage, validation, and publication rules.

Success: the intended reader can use the artifact from its destination; facts, interpretations, proposals, decisions, and uncertainty stay distinct; references earn their place; the artifact relies only on context the destination really supplies.

## Scenarios

- **Explicit request or owning workflow** (an artifact-author assignment): loads by ID. In OpenCode it stays out of the model's available list.
- **Routine delegation**, inline or with the prompt saved as Markdown: doesn't load; a saved prompt is still a prompt.
- **Report for a coworker without repository access**: impact and confidence first, enough background, no meaning carried only by local paths, no actions invented from the coworker's role.
- **Same design reference adapted for another machine**: swaps machine assumptions for repository-relative or canonical references and explains what the new destination lacks.
- **Proposal from exploratory discussion** after a deadline correction and a rejected approach: the correction, the rejection rationale, and open uncertainty survive; a recommendation stays a recommendation.
- **Change description on a host that shows the diff**: adds motivation and review context instead of restating files.
- **Brief for a Security team that may later go to an agent**: suitable terminology, no unsolicited checklist or runbook; questions and actions appear only when requested.
- **External report from private evidence**: only disclosable meaning, visible evidence limits; settles disclosure authority before transferring.
- **Unspecified recipient** where repository access would change the explanation: one focused question, not an interview.

## Decisions

- **Replaced the broader `context-transfer` skill** (human, 2026-09-22). That skill combined artifact context, routine agent briefing, specialist handoffs, presentation, and publication. Four paired Sol-to-Luna delegation tasks found that routine prompting does fine on model defaults, so briefing guidance was retired. Those tasks didn't test artifact writing or specialist handoffs, so neither conclusion should be read as established by them. The pre-refactor package and the experiment notes are kept in the source repository under `docs/context-transfer/`; they aren't current policy.
- **Organized by purpose, not by reader type.** An initial human-versus-agent split was replaced with prompt preparation versus artifacts that preserve understanding, since either kind of reader can consume an artifact.
- **Loaded only on request or by an owning workflow**, so ordinary document writing doesn't pull it in. OpenCode enforces this with `opencode/autoinvoke: false`; other harnesses only see the restriction in the description.
- **Specialist handoff policy moved to orchestration**, where the workflow that needs it owns it. Restore specific prompting rules here only when a demonstrated failure or an explicit preference justifies them.

## Sources

None external. Background: the four delegation experiments described in the source repository's `docs/context-transfer/delegation-experiments.md`.
