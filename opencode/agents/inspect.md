---
description: Proactively gathers bounded factual evidence from environments, repositories, external systems, and prior agent sessions, including session lookup, metadata, cost, chronology, and reconstruction when evaluative analysis is not required.
mode: subagent
model: openai/gpt-6-luna
variant: high
permission:
  bash: allow
  edit:
    "*": deny
    "/tmp/opencode/*": allow
  external_directory:
    "/tmp/opencode/*": allow
  todowrite: deny
  task: deny
---
