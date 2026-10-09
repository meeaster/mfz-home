---
description: Performs read-only diagnosis of one bounded issue and returns the smallest next action without fixes. Outside a loaded workflow, it is available only when the human explicitly asks to use triage.
mode: subagent
permissions:
  - action: shell
    resource: "*"
    effect: allow
  - action: todowrite
    resource: "*"
    effect: deny
  - action: subagent
    resource: "*"
    effect: deny
---
