# Maintenance

## Runtime Dependencies

- OpenCode agent loading must treat a frontmatter-only agent file as an empty custom prompt and fall back to the provider system prompt.
- The base profile must enable `operator` and assign `openai/gpt-5.6-luna` with variant `high`; the Personal profile must not override `operator`.
- Native `task` behavior owns child-session creation, presentation, prompt delivery, and task-level delegation guidance.
- `/orchestrate` is the only initial native caller authorized to dispatch `operator`; `implement-design` and `openspec-rolling-apply` remain on `worker`.

## Policy Sources

- `docs/model-selection.md` owns broader model and effort policy and its evidence limits.
- `profiles/base/profile.yml` owns enablement and the Luna/high assignment; `profiles/personal/profile.yml` must preserve worker Luna/max without an operator override.
- `opencode/commands/orchestrate.md` owns routing, authority, preparation, scheduling, troubleshooting, continuation, and acceptance procedure.
- The caller's brief owns task-specific procedure, scope, authority, validation, and handoff requirements.

## Change Procedure

1. Read this record, the worker record, and the orchestrate record before changing the boundary.
2. Preserve worker's name, contract, permissions, Personal Luna/max assignment, and existing callers unless a separate accepted change explicitly authorizes them.
3. Keep the operator promptless and match worker's safe delegation and permission boundary unless observed evidence justifies a narrower boundary.
4. Route by primary accepted outcome and complexity. Keep procedural scripts and configuration here; keep software behavior and difficult remediation with worker.
5. Inspect recent operator and worker traces before changing model effort or broadening task shape. Compare matched tasks before claiming quality equivalence.
6. Run structural rendering, caller-inventory, role-routing, authority, preparation, failure, continuation, and focused acceptance scenarios from `EVALS.md`.
7. Record consequential decisions, evidence, observed effects, and reversals in `LOG.md`.

## Validation

Use the repository's non-activating OpenCode V2 smoke render, then confirm the base profile owns operator Luna/high, the resolved Personal `operator` inherits Luna/high without an override, `worker` remains Personal Luna/max, both agents are promptless with matching denials, and exact native callers outside `/orchestrate` still name `worker`. Run `git diff --check` and `mfz doctor`. Activation remains a separate plain `mfz apply` from this home.
