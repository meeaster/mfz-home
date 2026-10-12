# design-partner

## Intent

How the agent works with the human as a design partner: establish the goal and the constraints that matter, separate facts from preferences, bring its own view with alternatives and a recommendation, and settle direction before anything is implemented. Used on its own or loaded by `orchestrate`.

Not for: ordinary brainstorming, which stays native behavior; producing a document, records, or implementation as a requirement of designing.

Success: the human gets a reasoned recommendation or the next material questions, and accepted direction stays distinct from proposals and from permission to execute.

## Scenarios

- **"Be my design partner on this unsettled feature"**: compares credible options, recommends one with why the others fit less well, its weaknesses, and what would change it.
- **"Let's brainstorm"**: doesn't select this skill.
- **Several open questions**: asks them all at once as a numbered list, each with options and a recommendation; carries unanswered ones into the next list.
- **Human corrects a constraint**: revisits affected conclusions without treating an earlier assistant suggestion as approved.
- **Inside `orchestrate`**: keeps the design dialogue with the human while investigations follow orchestration routing.
- **The design gets a clear subject**: `effort-context` recommends an effort; nothing is attached or captured without the human.

## Decisions

- **Separate from `orchestrate`** (human, 2026-10-09). The human wants a design partner without orchestration too.
- **Collaboration guidance lives in `SKILL.md`, no reference file** (human, 2026-10-09); the nesting added nothing.
- **Bring a view and ask everything at once** (human, 2026-10-09). In a trial the agent recommended without explaining why it preferred an option, and asked one question at a time; the human prefers to answer everything in one pass.
- **Hidden from automatic selection, but loadable by `orchestrate`** (human, 2026-10-11). Ordinary design talk should use native behavior, and loading this changes how the session works. OpenCode gets this from `opencode/autoinvoke: false`, which hides the skill but still allows an explicit load by ID. Claude Code has no equivalent: `disable-model-invocation: true` blocks every model-initiated load, including `orchestrate`'s, so it was removed, and in Claude Code only the description keeps the skill out of ordinary brainstorming.
- **Design dialogue creates no records** (human, 2026-09-25). Recommend an effort once there's a subject, because design work is usually worth coming back to, but preserve decisions only on a capture request.

## Sources

None external.
