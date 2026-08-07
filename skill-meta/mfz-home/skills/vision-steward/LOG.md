# Log

## 2026-07-29 - Initial Design

- Chose model invocation because creating, updating, reconciling, and reviewing a `VISION.md` are distinct requests the agent should recognize without a slash command.
- Defined vision as human-owned durable intent rather than current state, generated synthesis, or an implementation plan.
- Ranked evidence so explicit and accepted direction cannot be silently displaced by lower-authority material.
- Required reconciliation with related tracked documents while preserving edit-scope boundaries.
- Kept the document shape flexible and made content requirements conditional on whether they carry real information.
- Excluded skill-package `meta/VISION.md` to preserve `skill-authoring` as the owner of that behavioral contract.
- Kept private knowledge systems, machine paths, tools, and installation mechanics out of the portable runtime skill.
