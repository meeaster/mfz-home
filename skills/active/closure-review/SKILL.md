---
name: closure-review
description: Closure review. Use after code-review findings have been implemented to verify every finding is closed and the remediation introduced no regressions.
argument-hint: "Original findings and remediation scope"
---

# Closure Review

A closure review is **proof that remediation closed the case**. It reviews the fixes, not the entire change again.

Remain read-only. The implementer owns any further edits.

## 1. Fix The Case

Collect:

- the original findings in full;
- each accepted or rejected disposition;
- the diff introduced after the review;
- the verification claimed for the remediation.

Recover missing inputs from the session transcript or version-control history. Ask one precise question if the remediation boundary cannot be established.

Done when every original finding and every remediation change has a stable reference.

## 2. Build The Closure Ledger

Create one row per original finding:

| Finding | Disposition | Claimed fix | Claimed proof | Status |
| --- | --- | --- | --- | --- |

Use only these statuses initially: `unverified`, `rejected`, or `missing disposition`. Do not trust the implementer's summary as proof.

Done when every original finding appears exactly once and no finding is silently dropped.

## 3. Verify Each Disposition

For every accepted finding:

- inspect the changed code and the root cause named by the finding;
- confirm the fix closes the whole failure path rather than one example;
- confirm later refactoring did not remove or bypass the fix;
- inspect the test or other evidence that would detect regression.

For every rejected finding, verify that the rejection is grounded in code, requirements, or a demonstrated invariant. Unsupported rejection remains open.

Set each ledger status to exactly one of:

- `closed`;
- `open`;
- `regressed`;
- `unverifiable`;
- `rejection supported`.

Done when every ledger row has evidence and a final status.

## 4. Inspect The Remediation Seams

Review only boundaries changed while fixing findings:

- transaction order and rollback;
- ownership and permissions;
- state transitions and concurrency;
- parsing and validation boundaries;
- new abstractions, branches, and fallback paths;
- tests whose fixtures or assertions changed with the fix.

Look for a fix that moves the defect, creates a second authority, weakens an invariant, or makes failure partial. Do not reopen unrelated areas merely because they could be improved.

Done when every changed boundary is either sound or represented by a concrete new finding.

## 5. Validate The Proof

Run or inspect the narrowest safe verification that proves each accepted fix. Treat a broad green suite as supporting evidence, not a substitute for a regression-sensitive test.

Record verification that could not be run and why. Do not edit files to make verification pass.

Done when each accepted finding has meaningful proof or is marked `unverifiable`.

## 6. Return The Closure Verdict

Return:

```text
Verdict: Closed | Needs remediation

Open blockers:
- <finding or regression with file evidence and required correction>

Closure ledger:
- <original finding>: <final status> - <evidence>

Verification:
- <command or inspected proof>: <result>

Residual risk:
- <uncertainty that does not reopen a closed finding>
```

Use `Closed` only when every accepted finding is `closed`, every rejection is supported, no remediation regression remains, and verification is adequate. Otherwise use `Needs remediation`.

Done when the verdict accounts for every original finding and every remediation-introduced blocker without implementing changes.
