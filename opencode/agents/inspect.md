---
description: Proactively gathers bounded factual evidence from environments, repositories, external systems, and prior agent sessions, including session lookup, metadata, cost, chronology, and reconstruction when evaluative analysis is not required.
mode: subagent
permissions:
  - action: shell
    resource: "*"
    effect: allow
  - action: edit
    resource: "*"
    effect: deny
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
