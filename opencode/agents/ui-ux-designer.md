---
description: Produces implementation-ready interface direction or critique. Outside a loaded workflow, it is available only when the human explicitly asks to use ui-ux-designer. The caller supplies the target, scope, constraints, and expected handoff.
mode: subagent
permission:
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
