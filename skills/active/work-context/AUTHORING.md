# work-context

## Intent

Operate `mfz work` units from an agent session: load a named unit as background, see what's bound to the current session, attach, switch, detach, update orientation, and checkpoint, with Markdown as the authored context and the `mfz` CLI enforcing lifecycle rules.

Not for: replacing the delegation prompt, attaching sessions just because a unit was named, or Cairn efforts.

Success: a delegated agent gets its task from the prompt and its background from the unit; checkpoints and orientation stay valid, append-only where required, and readable after compaction.

## Scenarios

- **Prompt names a unit**: loads it as background; the prompt still defines the work; the session isn't attached.
- **"Checkpoint before I compact"**: writes the checkpoint Markdown where the CLI's instructions say, then validates it.
- **An already-validated checkpoint is edited**: validation fails instead of silently rewriting history.
- **Trivial unbound work**: no unit needed.

## Decisions

- **Agents edit Markdown directly; the CLI validates** (human, 2026-07-22). The CLI explains locations and structure and checks hashes, immutability, and lifecycle, but never authors prose through flags on the agent's behalf. Structured telemetry can stay CLI-managed.
- **The skill points to CLI commands for details** (human, 2026-07-22), so instructions live with the tool that enforces them.
- **The unit is background, not the brief** (human, 2026-07-22). A delegated agent must get an explicit task in its prompt; agents are capable enough to load a named unit without elaborate structure.

## Sources

None external. Depends on the `mfz work` CLI.
