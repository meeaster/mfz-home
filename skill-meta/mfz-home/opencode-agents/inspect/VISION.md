# Vision

## Problem

Local exploration and external documentation research do not cover current state in cloud accounts, deployed environments, runtime systems, work systems, or factual evidence retained in prior agent sessions. Sending those read-only questions to a mutation-capable worker grants unnecessary authority, while routing ordinary session lookup to a frontier analytical model spends judgment where disciplined retrieval is enough.

## Intended behavior

`inspect` is a native OpenCode subagent for bounded factual queries. Its evidence targets include current systems and prior agent sessions. For session work it owns locating, outlining, metadata, cost, chronology, factual comparison, and reconstruction when the requested result does not require evaluative judgment. Ordinary sessions may select it proactively when that evidence is materially useful. Keep its definition frontmatter-only so it uses the default system prompt. The caller supplies the target, evidence boundary, permitted read-only operations, expected facts, and stop conditions. The agent may use Bash, CLIs, MCPs, and relevant skills, including `agent-sessions`, without changing source or external state.

The result states the inspected target and time, query coverage, observed facts, evidence locators, exclusions, and uncertainty. It reports facts rather than diagnosing a symptom, evaluating session quality or meaning, designing a change, or recommending implementation.

Luna/high is the initial model policy because current-state inspection is primarily disciplined retrieval and synthesis. The role and read-only boundary remain stable if model policy changes.

## Success

The human chose default prompt inheritance because no explicit system-level file-writing prohibition was established for Inspect. Configured permissions allow edits under `/tmp/opencode/orchestrator-evidence/`; the caller explicitly assigns any evidence note and requires `orchestrator-task-evidence` for its contract. Source and external state remain read-only under the assignment. Permission and skill loading alone authorize no file. `../explore/MAINTENANCE.md` owns permission evidence and supported-Location limits. The earlier reported live refusal remains unexplained; test the default-prompt path before adding system instructions. Keep the existing shell policy unchanged.

Parents route live inventory, current-state questions, and factual session archaeology to `inspect`, receive compact evidence they can use in design, triage, or session analysis, and avoid granting mutation or frontier analytical capacity merely to retrieve facts.

## Non-goals

- Local repository discovery owned by `explore`.
- Documentation or upstream-source research owned by `research`.
- Root-cause diagnosis or disposition owned by `triage`.
- Evaluative reasoning about session quality, intent adherence, behavior, efficiency, patterns, or recommendations owned by `session-analyst`.
- Implementation, remediation, or operational mutation.
- Independent review of completed work.
