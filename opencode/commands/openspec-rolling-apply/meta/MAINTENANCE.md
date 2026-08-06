# Maintenance

## Runtime Dependencies

- OpenSpec CLI and the local `openspec-apply-change` skill provide authoritative change selection,
  context paths, task state, and Apply semantics.
- OpenCode `delegate_general` must allow `openai/gpt-5.6-luna@max` and
  `openai/gpt-5.6-sol@high`.
- `thermo-nuclear-code-quality-review` supplies the periodic maintainability-review lens.
- Mindframe-Z must support packaged commands at `opencode/commands/<name>/COMMAND.md` and render only
  `COMMAND.md`.

OpenCode command metadata supports `model` but not a reasoning `variant`. `COMMAND.md` pins the Sol
model family; run the command from a Sol/medium session when that exact coordinator route matters.
Delegated worker and reviewer variants are explicit and enforceable through `delegate_general`.

## Change Procedure

1. Read `VISION.md`, `EVALS.md`, `MAINTENANCE.md`, and `LOG.md` before changing `COMMAND.md`.
2. Preserve OpenSpec Apply as the sole durable task authority.
3. Keep ordinary batch acceptance separate from periodic independent review.
4. Keep checkpoint explanation and coordinator-owned commit behavior aligned across both control modes.
5. Update affected evaluation scenarios with every behavioral change.
6. Record consequential routing, batching, review, remediation, and commit decisions in `LOG.md`.

## Validation

After a source change:

1. Run the Mindframe-Z packaged-command integration test and build.
2. Run `mfz apply --target opencode --agent opencode` from the Personal home.
3. Confirm the rendered command exists as `openspec-rolling-apply.md` and no `meta/` file was rendered.
4. Run `mfz doctor` and inspect the rendered command frontmatter.
5. For behavioral changes, execute representative scenarios from `EVALS.md` in an isolated change and
   inspect delegation calls, diffs, gates, review count, and task-ledger transitions.

## Evidence To Watch

Review real traces for batch size, planner calls, premature checkbox updates, independent-review
frequency, finding dispositions, remediation count, future-task leakage, and stops at operator or
design gates. Also inspect whether the mode was resolved before work, whether checkpoint briefs explain
product and technical context, whether approval-gated runs pause before committing, and whether staged
files exclude the dirty baseline. Verification-only worker delegations, ledger-only commits, a return
to broad planner output, or repeated review of unchanged implementation are behavioral regressions.

## Environment Boundary

This command is intentionally specific to OpenCode and Mindframe-Z. Its meta artifacts are development
context and must not enter the rendered OpenCode command or ordinary runtime prompt.
