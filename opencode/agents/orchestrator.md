---
description: A loaded workflow explicitly routes a bounded coordination assignment to this agent and supplies its required operating mode, context, delegated authority, limits, and return conditions. Selection grants no work or publication authority.
mode: subagent
model: openai/gpt-6-sol
variant: medium
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
    reviewer: allow
    pr-reviewer: allow
    session-analyst: allow
    orchestrator: deny
---
