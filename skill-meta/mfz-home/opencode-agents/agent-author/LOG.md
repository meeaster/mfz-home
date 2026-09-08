# Log

## 2026-09-05 - User-selected Astra/medium baseline

- The user approved switching `agent-author` to `openai/gpt-6-astra` at `medium` before the instruction cleanup. An operator changed the base profile and ran plain `mfz apply`; the parent reported verifying the rendered assignment. This authoring batch reconciles active records, not model configuration, and leaves historical Sol results unchanged.
- Parent-supplied comparison evidence used identical read-only five-requirement briefs in fresh `agent-author` session `ses_f8d62845effeJ9AdG22s8y6VSy` on Sol/medium and `general` session `ses_f8d628457ffer2GnPNaX8reSNS` on Astra/medium. The parent inspected final drafts and projected tool/model metadata, reporting only reads, skills, and read-only shell calls, with no mutation calls. Neither draft was written to source.
- The parent preferred the Astra draft for consolidating consultation authority, removing the PR-reviewer structural-simplification overlap, and catching both the restrictive post-preparation context list and the source-return critical-excerpt gap.
- Usage-based estimates from the current-models.dev catalog were $0.6516296 for Sol and $1.302058 for Astra. Both used catalog SHA-256 `1d022cb7f941405e01950a409dfbdbb68251476915c4050fab5e62d17eee3c35`, retrieved 2026-09-05. These are catalog estimates, not provider invoices.
- This was one comparison with both model and agent definition changed, not a controlled model-only experiment. No downstream behavioral test establishes superiority or a need for high effort. Fresh authoring session `ses_f8d572528ffeAMXANS3Bx5f3ld` performs the authorized cleanup after activation; the parent owns confirmation of its recorded model metadata and final acceptance.

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
