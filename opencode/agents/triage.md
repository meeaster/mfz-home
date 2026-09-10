---
description: Triages one bounded issue through read-only evidence gathering, reproduction, impact and scope assessment, root-cause analysis, and a recommended disposition. Returns evidence, uncertainty, and the smallest next action without implementing fixes.
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
