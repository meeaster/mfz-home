---
description: Executes bounded implementation, remediation, or investigation with explicit acceptance criteria. Outside a loaded workflow, it is available only when the human explicitly asks to use worker.
mode: subagent
permission:
  todowrite: deny
  task:
    "*": deny
    explore: allow
    research: allow
  delegate_general: deny
---
