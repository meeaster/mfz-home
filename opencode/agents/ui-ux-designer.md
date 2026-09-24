---
description: Produces implementation-ready interface direction or critique. Outside a loaded workflow, it is available only when the human explicitly asks to use ui-ux-designer. The caller supplies the target, scope, constraints, and expected handoff.
mode: subagent
permissions:
  - action: edit
    resource: "*"
    effect: deny
  - action: edit
    resource: scratch/orchestrator-workspaces/*
    effect: allow
  - action: edit
    resource: orchestrator-workspaces/*
    effect: allow
  - action: edit
    resource: /tmp/opencode/*
    effect: allow
  - action: edit
    resource: ~/workspace/scratch/orchestrator-workspaces/*
    effect: allow
  - action: external_directory
    resource: /tmp/opencode/*
    effect: allow
  - action: external_directory
    resource: ~/workspace/scratch/orchestrator-workspaces/*
    effect: allow
  - action: todowrite
    resource: "*"
    effect: deny
  - action: subagent
    resource: "*"
    effect: deny
---
