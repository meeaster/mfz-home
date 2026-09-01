# Maintenance

The skill is engine-owned and materialized from `src/core/engine-skill.ts`. The detailed home and topic guides live in `src/cli/init.ts`; keep scheduling mechanics in `cronGuideMarkdown` rather than expanding the skill body.

When scheduled-job behavior changes:

1. Recheck the installed `opencode2 run` flags and the V2 session, compaction, model-inheritance, and subagent behavior against `/home/mark/workspace/references/opencode`.
2. Compare the guide with one real MFZ-managed service, timer, prompt, and effective agent configuration.
3. Run the focused engine-skill and guide integration tests, TypeScript build, formatting, lint, and anti-slop checkpoint.
4. Build the engine before testing the installed `mfz` binary, then run plain `mfz apply` to refresh the live engine skill and managed home guidance.

The guidance targets Mark's continuously running WSL system and systemd user manager. Revisit that boundary if the host lifecycle changes.
