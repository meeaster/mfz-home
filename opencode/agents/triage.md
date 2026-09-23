---
description: Performs read-only diagnosis of one bounded issue and returns the smallest next action without fixes. Outside a loaded workflow, it is available only when the human explicitly asks to use triage.
mode: subagent
permission:
  bash: allow
  edit:
    "*": deny
    "/tmp/opencode/*": allow
    "~/workspace/scratch/orchestrator-workspaces/*": allow
  external_directory:
    "/tmp/opencode/*": allow
    "~/workspace/scratch/orchestrator-workspaces/*": allow
  todowrite: deny
  task: deny
---
