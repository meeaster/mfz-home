---
description: Performs read-only diagnosis of one bounded issue and returns the smallest next action without fixes. Outside a loaded workflow, it is available only when the human explicitly asks to use triage.
mode: subagent
permissions:
  - action: shell
    resource: "*"
    effect: allow
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
