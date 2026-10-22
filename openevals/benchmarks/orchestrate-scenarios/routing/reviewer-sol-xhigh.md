---
name: role-models
description: Personal model bindings for role-based delegation. Load when orchestrate or a delegated implementation command selects a role's model.
---

# Role models

These are the human's Personal model preferences for delegated work. Use the exact reference for the role and task type, unless the human requests another model. A task-specific row takes precedence over its role's default. If the skill, binding, or model is unavailable, ask the human to choose a route before dispatching.

This skill selects worker models only. The lead's selected model remains separately configured. Loading it alone does not enter orchestration.

| Role | Task type | Model |
| --- | --- | --- |
| explorer | default | `openai/gpt-6-luna#high` |
| researcher | default | `openai/gpt-6-luna#high` |
| inspector | default | `openai/gpt-6-luna#high` |
| prototyper | default | `openai/gpt-6.1-sol#high` |
| architect | default | `openai/gpt-6-astra#medium` |
| triage | default | `openai/gpt-6.1-sol#high` |
| triage | escalation | `openai/gpt-6.1-sol#high` |
| reviewer | code | `openai/gpt-6.1-sol#xhigh` |
| reviewer | pr | `openai/gpt-6.1-sol#high` |
| reviewer | instructions | `openai/gpt-6.1-sol#high` |
| qa | default | `openai/gpt-6.1-sol#high` |
| implementer | default | `openai/gpt-6.1-sol#medium` |
| implementer | instructions | `openai/gpt-6.1-sol#high` |
| operator | default | `openai/gpt-6.1-sol#medium` |
| operator | git | `openai/gpt-6-luna#high` |
| writer | default | `openai/gpt-6.1-sol#medium` |
