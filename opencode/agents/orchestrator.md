---
description: A loaded workflow explicitly routes a bounded coordination assignment to this agent and supplies its required operating mode, context, delegated authority, limits, and return conditions. Selection grants no work or publication authority.
mode: subagent
permissions:
  - action: question
    resource: "*"
    effect: deny
  - action: skill
    resource: "*"
    effect: allow
  - action: subagent
    resource: "*"
    effect: deny
  - action: subagent
    resource: explore
    effect: allow
  - action: subagent
    resource: research
    effect: allow
  - action: subagent
    resource: inspect
    effect: allow
  - action: subagent
    resource: triage
    effect: allow
  - action: subagent
    resource: architect
    effect: allow
  - action: subagent
    resource: ui-ux-designer
    effect: allow
  - action: subagent
    resource: agent-author
    effect: allow
  - action: subagent
    resource: artifact-author
    effect: allow
  - action: subagent
    resource: prototype
    effect: allow
  - action: subagent
    resource: operator
    effect: allow
  - action: subagent
    resource: worker
    effect: allow
  - action: subagent
    resource: reviewer
    effect: allow
  - action: subagent
    resource: pr-reviewer
    effect: allow
  - action: subagent
    resource: session-analyst
    effect: allow
  - action: subagent
    resource: orchestrator
    effect: deny
---
