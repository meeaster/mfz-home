---
description: Proactively gathers bounded current or command-derived evidence from environments, repositories, and external systems when materially useful.
mode: subagent
model: openai/gpt-5.6-luna
variant: high
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
