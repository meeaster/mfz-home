---
description: Proactively gathers bounded factual evidence from environments, repositories, external systems, and prior agent sessions, including session lookup, metadata, cost, chronology, and reconstruction when evaluative analysis is not required.
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
