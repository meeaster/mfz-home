---
description: Executes bounded implementation, remediation, or investigation with explicit acceptance criteria. Outside a loaded workflow, it is available only when the human explicitly asks to use worker.
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
