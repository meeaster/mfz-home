---
name: change-review
description: Review a code change for correctness (bugs, security, and whether it does what it was meant to). Use when reviewing a branch, diff, or pull request, either your own team's work against its spec, plan, or acceptance criteria, or a contribution from someone else that needs a merge verdict.
---

# Change Review

Find what would break: bugs, security holes, and places where the change doesn't do what it was meant to. Maintainability and style belong to a separate simplification pass; raise them only when they hide a bug.

## Mode

- **Own work**, the default: your team built it, and the brief gives its intent (acceptance criteria, spec, plan). The approved design is settled, so judge whether the code delivers it, not whether it should have been designed differently. When the code can't meet the intent as written, report that as a finding rather than proposing another design.
- **Contribution**: someone else's change, whose intent you have to reconstruct and whose code you don't run. Read [references/contribution.md](references/contribution.md) before starting.

## Passes

Run three passes over every change and tag each finding with its pass:

- **Bugs**: logic errors, broken edge cases, regressions, leaks, races. Read the code the change calls and the code that calls it, not only the diff: a new feature often breaks against an unchanged line it now depends on.
- **Security**: injection, authentication and authorization gaps, secrets or personal data in logs or errors, unsafe input handling, new dependencies.
- **Compliance**: each acceptance criterion or Verification line, and the spec and plan. Does the diff do each one, and does it do something nobody asked for?

## Evidence

Every finding names a file and line on the reviewed commit and shows why it's real: a reproduction, a failing test, or the code path traced line by line. In own-work mode, run a small reproduction or the relevant test whenever that's cheaper than arguing from reading.

Before reporting a finding, try to refute it. Behavior the commit message, spec, docs, or tests call intended isn't a bug, however surprising. A suspicion from a name or a pattern is checked or dropped; one you can neither confirm nor refute goes in as a question, not a finding.

## Severity

- **Important**: would break behavior, lose or leak data, or breach the intent or a policy.
- **Nit**: anything else worth saying. Report at most five, and give the rest as a count.
- **Pre-existing**: a real problem the change didn't introduce. Tag it so it isn't blamed on the author; it never blocks.

Combine findings that share one cause. When the same mistake appears in several places, name the class of bug and list every location, so the fix covers all of them.

## Later rounds

On a re-review, read the diff since the last reviewed commit and check that each earlier finding's fix holds. Report nothing already reported. After a third round that still turns up Important findings in the same area, say so and recommend reconsidering the approach instead of another round of fixes.

## Report

Start with the count, such as "2 Important, 1 Nit, 1 Pre-existing", or "No findings". List the findings by severity, each with its severity, pass, location, what goes wrong, and the evidence. End with one **Scope** line: what you covered, and what you took on trust, such as checks you didn't re-run.

Write the report to the file the brief names, in that file's format when it has one.
