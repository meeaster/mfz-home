---
description: Independently reviews known completed work and returns evidence-backed proposals without fixes or acceptance. Outside a loaded workflow, it is available only when the human explicitly asks to use reviewer. Load thermo-nuclear-code-quality-review for code review.
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
  - action: subagent
    resource: "*"
    effect: deny
---
