# Evaluation: OpenSpec Orchestrate

## Plan-Only Contract Regression

Run the installed `openspec-orchestrate` skill through OpenCode against an isolated fixture with at
least two pending hierarchical tasks and more than one plausible execution group. Request plan-only
execution and use `openai/gpt-5.6-sol` at `high` for the required planning child.

### Pass Criteria

- The coordinator copies the planner prompt template without compressing, renaming, reordering, or
  omitting fields; only concrete placeholders change.
- The planning result states `Read all <N> context paths` using the supplied count, or returns an
  incomplete report naming every unreadable path.
- Every pending hierarchical task id appears exactly once.
- Every execution group includes an explicit `Out of scope` field, including no-write verification
  groups.
- Every context-budget estimate uses characters. Any token equivalent is separately labelled and
  derived from a character estimate.
- Candidate reads may remain candidate paths; proposed writes are exact paths.
- The coordinator rejects a plan missing any required field and does not implement, edit task state,
  or repair the plan locally.

### Evidence To Inspect

- Skill load and selected installed skill path.
- Exact `delegate_general` planner prompt.
- Planner result and coordinator validation response.
- Fixture worktree and OpenSpec task ledger for prohibited changes.
- Parent and child session identifiers, model/variant, latency, and cost when available.

## Latest Evidence

Run on 2026-07-13 through the installed OpenCode skill:

- Parent: `ses_0a552a001ffefeyXdyrbQDxSSJ` (`openai/gpt-5.6-luna`, disposable clone).
- Planner: `ses_0a550ffa0ffeAR7VVrQDlgHZuZ` (`openai/gpt-5.6-sol@high`).
- The planner prompt contained the context attestation, per-group out-of-scope, and character-budget
  requirements. The result attested `Read all 10 context paths`, mapped all 32 tasks once, included
  six out-of-scope sections, and used character estimates.
- Phase 3 rejected the plan because deterministic schema gates omitted the required
  generate/hash/regenerate/hash-compare protocol and most out-of-scope declarations named semantic
  categories rather than explicit file paths. The coordinator did not repair or rerun the plan.
- The disposable implementation clone remained clean and the planning task ledger was unchanged.

This run used an isolated implementation clone with the real standalone planning change mounted
read-only, rather than a fully synthetic planning-store fixture. A synthetic fixture remains useful
for testing unreadable-context and deliberately malformed-plan branches.
