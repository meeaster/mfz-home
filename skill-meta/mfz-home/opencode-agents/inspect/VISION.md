# Vision

## Problem

Local exploration and external documentation research do not cover current state in cloud accounts, deployed environments, runtime systems, or work systems. Sending those read-only questions to a mutation-capable worker grants unnecessary authority, while calling them triage incorrectly implies a reported symptom and diagnostic judgment.

## Intended behavior

`inspect` is a native OpenCode subagent for bounded current-state queries. Keep its definition frontmatter-only so it uses the default system prompt. The caller supplies the target account or system, evidence boundary, permitted read-only operations, expected facts, and stop conditions. The agent may use Bash, CLIs, MCPs, and relevant skills to retrieve live facts without changing source or external state.

The result states the inspected target and time, query coverage, observed facts, evidence locators, exclusions, and uncertainty. It reports facts rather than diagnosing a symptom, designing a change, or recommending implementation.

Luna/high is the initial model policy because current-state inspection is primarily disciplined retrieval and synthesis. The role and read-only boundary remain stable if model policy changes.

## Success

The human chose default prompt inheritance because no explicit system-level file-writing prohibition was established for Inspect. Configured permissions allow edits under `/tmp/opencode/orchestrator-evidence/`; the caller explicitly assigns any evidence note and requires `orchestrator-task-evidence` for its contract. Source and external state remain read-only under the assignment. Permission and skill loading alone authorize no file. `../explore/MAINTENANCE.md` owns permission evidence and supported-Location limits. The earlier reported live refusal remains unexplained; test the default-prompt path before adding system instructions. Keep the existing shell policy unchanged.

Parents route live inventory and current-state questions to `inspect`, receive compact evidence they can use in design or triage, and avoid granting a worker mutation authority merely to run read-only queries.

## Non-goals

- Local repository discovery owned by `explore`.
- Documentation or upstream-source research owned by `research`.
- Root-cause diagnosis or disposition owned by `triage`.
- Implementation, remediation, or operational mutation.
- Independent review of completed work.
