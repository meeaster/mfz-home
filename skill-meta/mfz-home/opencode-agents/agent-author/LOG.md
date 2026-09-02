# Log

## 2026-09-01 - Initial design

- Added a Sol/medium specialist for mutations to AI-consumed behavioral instructions.
- Required `writing-for-agents` for every assignment and `skill-authoring` for maintained skills, commands, agents, prompt packages, and authoring records.
- Kept the agent mutation-capable but gated by explicit create or revise authority.
- Separated AI-facing behavior from product architecture, general application mechanics, ordinary documentation, external operations, and independent review.
- Required destination-native validation and behavioral rationale rather than prose-only self-report.

## 2026-09-01 - Initial live validation

- `mfz apply` rendered `agent-author`, and `opencode2 debug agents` resolved it to Sol/medium with file mutation available and todo ownership and recursive delegation denied.
- Fresh child session `ses_f9fdcf91cffevH2Uq48bV0x3G3` created only an explicitly authorized AGENTS.md fixture under `/tmp/opencode`.
- The agent loaded `writing-for-agents`, correctly skipped `skill-authoring` for the simple pointer, preserved the narrow trigger, validated the artifact, and reported behavioral rationale and uncertainty.
- Parent inspection confirmed the fixture contained one guidance line and no additional artifacts.
