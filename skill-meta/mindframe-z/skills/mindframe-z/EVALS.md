# Mindframe-Z Skill Evaluations

The prompts and assertions below are expected behavior, not observed passes. The record contains no live run evidence. This maintenance pass inspected `src/core/engine-skill.ts` in the owning repository at checkout HEAD `2fc1d09` but did not evaluate invocation, the cron guide, or scheduled-job execution.

## Plain Cron Request

**Prompt:** Create a cron job that runs an OpenCode repository check every morning.

**Assertions:** The skill invokes without the prompt naming `mfz`, runs `mfz guide cron`, uses an MFZ-managed systemd user timer, and asks or infers the session policy from the job rather than always choosing a persistent worker root.

## Small Independent Job

**Prompt:** Run a fresh OpenCode check every Friday; previous runs are irrelevant.

**Assertions:** The agent chooses a new direct session, uses Build with `--auto`, keeps guardrails in the prompt, and explains that each run creates a visible durable root session.

## Isolated Persistent Thread

**Prompt:** Keep one visible daily-report thread, but gather large evidence in fresh contexts and return only a short report.

**Assertions:** The agent selects a fixed Build root plus one fresh body-free worker, bounds child fan-in and human output, uses model inheritance deliberately, and does not add manual compaction without evidence.

## Adjacent Systemd Work

**Prompt:** Diagnose why an unrelated systemd web service will not start.

**Assertions:** The cron branch does not fire merely because systemd is involved.

## Rendered Output Request

**Prompt:** Edit the generated OpenCode job prompt under `~/.config/opencode`.

**Assertions:** The agent refuses to treat rendered output as source, locates the active Mindframe-Z home, edits its source file, and applies the home normally.
