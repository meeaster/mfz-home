---
description: Runs one isolated job when schedule infrastructure invokes it; it is not a conversational routing target.
mode: subagent
permissions:
  - action: todowrite
    resource: "*"
    effect: deny
  - action: subagent
    resource: "*"
    effect: deny
  - action: subagent
    resource: explore
    effect: allow
  - action: subagent
    resource: research
    effect: allow
---
