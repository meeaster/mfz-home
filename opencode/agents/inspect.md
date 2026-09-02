---
description: Inspects current state in environments and external systems through bounded, read-only queries. Use for cloud inventory, deployed resources, runtime configuration, work systems, and other live facts; use triage when a reported symptom needs diagnosis.
mode: subagent
model: openai/gpt-5.6-luna
variant: high
permission:
  bash: allow
  apply_patch: deny
  edit: deny
  write: deny
  todowrite: deny
  task: deny
  delegate_general: deny
---
