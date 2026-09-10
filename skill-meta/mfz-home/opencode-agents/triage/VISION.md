# Vision

## Problem

Reported issues often need diagnosis before implementation. Sending that work to a general worker blurs the boundary between evidence gathering and mutation, while using Sol for every investigation spends the quality-first model on bounded analysis.

## Intended behavior

`triage` is a native OpenCode subagent for one bounded issue or symptom. Keep its definition frontmatter-only so it uses the default system prompt. The caller supplies the issue, relevant context, evidence locations, scope, decision criteria, and expected handoff. The agent gathers evidence without editing source, reproduces the problem when safe, assesses impact and scope, identifies the supported root cause or competing hypotheses, and recommends the smallest next action.

Luna/max is the initial model policy because issue triage is bounded but often requires deeper synthesis than exploration or retrieval. Sol remains the route for consequential adjudication and independent review. The role name and read-only boundary remain stable if model policy changes.

The parent owns acceptance, user questions, mutations, and any follow-on worker or reviewer dispatch. Triage cannot recursively delegate.

## Success

The human chose default prompt inheritance. Configured permissions allow edits under `/tmp/opencode/orchestrator-evidence/`; the caller explicitly assigns any evidence note and requires `orchestrator-task-evidence` for its contract. Permission and skill loading alone authorize no file. Source and external state remain read-only under the assignment. `../explore/MAINTENANCE.md` owns permission evidence and supported-Location limits. Remediation authority remains absent and the shell policy unchanged.

Parents route reported issues to `triage` instead of mutation-capable workers, receive evidence-backed diagnosis with explicit uncertainty, and can turn the result into a bounded implementation brief or close the issue without repeating the investigation.

## Non-goals

- Implementing or remediating the issue.
- Broad codebase discovery without a reported issue or symptom.
- External documentation research as the primary task.
- Independent review of completed work.
- Product or architecture decisions unsupported by the supplied criteria.
