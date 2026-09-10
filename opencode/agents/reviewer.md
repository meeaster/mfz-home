---
description: Independently reviews known completed work for correctness, maintainability, and substantive behavior-preserving structural simplification against requirements and repository evidence. Load thermo-nuclear-code-quality-review for code review. Returns prioritized evidence-backed proposals and identifies unsupported concerns, without fixes or acceptance.
mode: subagent
permission:
  bash: allow
  edit:
    "*": deny
    "/tmp/opencode/orchestrator-evidence/*": allow
  external_directory:
    "/tmp/opencode/orchestrator-evidence/*": allow
  task: deny
  delegate_general: deny
---
