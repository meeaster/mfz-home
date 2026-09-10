---
description: Executes the same bounded implementation, remediation, and investigation work as worker, only when the human explicitly requests super-worker for the task or batch. Never select automatically for difficulty, failures, or perceived quality; model choice grants no implementation or publication authority.
mode: subagent
permission:
  todowrite: deny
  task:
    "*": deny
    explore: allow
    research: allow
  delegate_general: deny
---
