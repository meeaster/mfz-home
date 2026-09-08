# Maintenance

The skill is engine-owned and materialized from `src/core/engine-skill.ts`. The detailed home and topic guides live in `src/cli/init.ts`; keep scheduling mechanics in `cronGuideMarkdown` rather than expanding the skill body.

When scheduled-job behavior changes, recheck the V2 run flags, session, compaction, model-inheritance, and subagent behavior against current OpenCode sources. Compare the guide with one real MFZ-managed service, timer, prompt, and effective agent configuration. The guide's session policies are alternatives, not a mandated persistent-worker design.

Build the engine before using the installed `mfz` binary to evaluate source changes. Otherwise a passing CLI probe may exercise the previous embedded skill and guide. The owning repository supplies focused engine-skill and guide integration tests; home activation is separate from those tests.

The guidance targets Mark's continuously running WSL system and systemd user manager. Revisit that boundary if the host lifecycle changes.
