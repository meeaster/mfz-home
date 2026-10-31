---
name: pstack-no-comments
description: Run pstack's read-only comment reviewer, assess its findings, and replace accepted workaround prose with clearer code or enforceable constraints.
metadata:
  opencode/autoinvoke: false
---

# No comments

Use the caller's files or diff. Otherwise inspect the current diff against the base branch, including the working tree.

1. Launch the `pstack-comment-sicko` subagent with the exact scope. Do not restate its rules.
2. Inspect the report against the code. Reject scope escapes, legal-header deletion, proven external constraints, and invented findings.
3. Delete accepted narration and dead comments. For each `MUST KILL`, prefer a rename, type, test, API change, or small structural fix that makes the comment unnecessary.
4. Keep only constraints the repository cannot encode. State the evidence for each keep.
5. Run the affected checks and report deletions, structural fixes, exceptions, and open constraints.

Load `pstack-principle-fix-root-causes` for workaround comments and `pstack-principle-redesign-from-first-principles` when repeated comments expose a wrong shape. Neither expands the caller's scope.
