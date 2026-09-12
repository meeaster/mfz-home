---
description: Runs one isolated job when schedule infrastructure invokes it; it is not a conversational routing target.
mode: subagent
permission:
  todowrite: deny
  task:
    "*": deny
    explore: allow
    research: allow
  delegate_general: deny
---
