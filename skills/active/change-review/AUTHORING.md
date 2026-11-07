# change-review

## Intent

A correctness review of a code change: bugs, security, and whether the change does what it was meant to. One skill serves two modes: own work, whose intent is given and whose design is settled, and a contribution from someone else, whose intent is reconstructed and whose code is untrusted. It fills Cairn's `code-review` slot for both `reviewer/code` and `reviewer/contribution`, and works without Cairn.

Not for: maintainability or simplification review (a separate pass, such as `thermo-nuclear-code-quality-review` before the PR); fixing code; posting to the hosting system.

Success: findings a fixer can act on without re-deriving them, each tied to a line and evidence, with few false claims and no repeat rounds over the same finding.

## Scenarios

- **Own slice PR with spec and plan**: three passes, findings tagged Important, Nit, or Pre-existing, written to the brief's file (a tracks `review.md`); no challenge to the approved design.
- **Surprising but documented behavior**: the commit message or spec says the behavior is intended; not reported as a bug.
- **Bug in code the diff doesn't touch**: found by reading what the change depends on, reported against the unchanged line.
- **A suspicion the reviewer can't confirm**: reported as a question, not a finding.
- **Round 3 with Important findings still appearing**: says so and recommends reconsidering the approach.
- **Contribution with no stated requirement**: `insufficient evidence`, without invented criteria.
- **Contribution claiming tests pass**: checked against CI; code not run.
- **Contribution with a simpler credible approach**: a design finding with its cost; Important only with a demonstrated consequence.

## Decisions

- **Correctness only; maintainability is a separate pass** (human, 2026-11-07). The `code-review` slot was bound to thermo-nuclear, a maintainability audit whose core prompt asks for ambitious restructuring, while `reviewer/code`'s brief asks whether the diff meets its criteria. Anthropic's Code Review drops style and cleanup findings and keeps `/simplify` separate, and notes that agent authors fix every finding, so noise costs rounds.
- **One skill, two modes, chosen by task type** (human, 2026-11-07). The two reviews share the passes, evidence, and severity; they differ in where intent comes from and whether the code is trusted. Contribution mode is a reference file because own-work reviews never need it. It replaces the `pr-review` skill, whose merge due diligence it keeps.
- **Three passes, from Anthropic's `REVIEW.md` example** (human, 2026-11-07): bugs, security, compliance against spec and plan. The compliance pass is what reads the committed plan.
- **Important, Nit, Pre-existing** (human, 2026-11-07). Tracks' `review.md` already used Important and Nit; Anthropic adds Pre-existing so an old bug isn't blamed on the author. This replaced `pr-review`'s Blocker/Major/Follow-up/Preference so one scale holds everywhere.
- **Refute before reporting; documented behavior isn't a bug.** In a seven-scenario review bake-off (2026-11), the false claims that survived two reviewers and a settling third were misreadings of documented intent, such as a `--reverse` flag the commit message said reverses the whole order.
- **Read beyond the diff.** In the same bake-off, one planted bug lived in unchanged code the new feature relied on.
- **Convergence rules** (human, 2026-11-07): diff-only re-review, no repeats, and a recommendation to rethink after round three. Anthropic reported one PR going through more than fifty agent rounds before these.
- **Named `change-review`, not `code-review`.** A personal skill named `code-review` replaces Claude Code's bundled `/code-review`.

## Sources

- Anthropic, "How the Claude Code team does code review", https://claude.dev/blog/solving-code-review-at-anthropic/ (2026-10-15).
- Anthropic, AI-native SDLC playbook, "AI in the PR review loop", https://academy.claude.com/courses/ai-native-sdlc-playbook/ai-in-the-pr-review-loop.
- Claude Code docs, Code Review, https://code.claude.com/docs/en/code-review.
- Contribution mode folds in the retired `pr-review` skill.
