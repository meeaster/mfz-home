---
description: Coordinates a bounded assignment only when the human explicitly requests orchestrator for the task or batch, never from complexity or failures. The parent must explicitly require loading orchestrator-mode in parent-facing context and supply context, delegated authority, and return conditions; selection grants no work or publication authority.
mode: subagent
permission:
  question: deny
  skill: allow
  task:
    "*": deny
    explore: allow
    research: allow
    inspect: allow
    triage: allow
    architect: allow
    ui-ux-designer: allow
    agent-author: allow
    artifact-author: allow
    prototype: allow
    operator: allow
    worker: allow
    super-worker: allow
    reviewer: allow
    pr-reviewer: allow
    safety-reviewer: allow
    session-analyst: allow
    orchestrator: deny
  delegate_general: deny
---
