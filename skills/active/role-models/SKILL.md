---
name: role-models
description: Personal model bindings for role-based delegation. Load when `roles` or a delegated implementation command selects a role's model.
---

# Role models

These are the human's Personal model preferences for delegated work. Use the exact reference for the role and task type from the column for the harness you're running in, unless the human requests another model. A task-specific row takes precedence over its role's default, and a task type with no row here uses the role's default. A skill can name its own task type (`design-docs`) so its handoffs get their own models without new roles. If the skill, binding, or model is unavailable, ask the human to choose a route before dispatching.

This skill selects worker models only. The lead's selected model remains separately configured. Loading it alone does not enter orchestration.

| Role | Task type | OpenCode | Claude Code |
| --- | --- | --- | --- |
| explorer | default | `openai/gpt-6-luna#high` | `haiku` |
| researcher | default | `openai/gpt-6-luna#high` | `haiku` |
| inspector | default | `openai/gpt-6-luna#high` | `haiku` |
| prototyper | default | `openai/gpt-6.1-sol#high` | `sonnet` |
| architect | default | `openai/gpt-6-astra#medium` | `opus` |
| architect | design-docs | `openai/gpt-6.1-sol#high` | `opus` |
| creative-director | default | `openai/gpt-6-astra#high` | `opus` |
| triage | default | `openai/gpt-6-luna#max` | `sonnet` |
| triage | escalation | `openai/gpt-6.1-sol#high` | `opus` |
| reviewer | code | `openai/gpt-6.1-sol#high` | `opus` |
| reviewer | pr | `openai/gpt-6.1-sol#high` | `opus` |
| reviewer | instructions | `openai/gpt-6.1-sol#high` | `opus` |
| qa | default | `openai/gpt-6.1-sol#high` | `opus` |
| implementer | default | `openai/gpt-6.1-sol#medium` | `sonnet` |
| implementer | instructions | `openai/gpt-6.1-sol#high` | `opus` |
| implementer | motion | `openai/gpt-6-luna#high` | `sonnet` |
| operator | default | `openai/gpt-6.1-sol#medium` | `sonnet` |
| operator | git | `openai/gpt-6-luna#high` | `haiku` |
| writer | default | `openai/gpt-6.1-sol#medium` | `sonnet` |
