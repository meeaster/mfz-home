---
description: Independently reviews known completed work and returns evidence-backed proposals without fixes or acceptance. Outside a loaded workflow, it is available only when the human explicitly asks to use reviewer. Load thermo-nuclear-code-quality-review for code review.
mode: subagent
permission:
  bash: allow
  edit:
    "*": deny
    "/tmp/opencode/*": allow
  external_directory:
    "/tmp/opencode/*": allow
  task: deny
---
