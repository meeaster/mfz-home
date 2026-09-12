---
description: Performs read-only diagnosis of one bounded issue and returns the smallest next action without fixes. Outside a loaded workflow, it is available only when the human explicitly asks to use triage.
mode: subagent
permission:
  bash: allow
  edit:
    "*": deny
    "/tmp/opencode/orchestrator-evidence/*": allow
  external_directory:
    "/tmp/opencode/orchestrator-evidence/*": allow
  todowrite: deny
  task: deny
  delegate_general: deny
---
