# Vision

## Problem

Local exploration and external documentation research do not cover current state in cloud accounts, deployed environments, runtime systems, or work systems. Sending those read-only questions to a mutation-capable worker grants unnecessary authority, while calling them triage incorrectly implies a reported symptom and diagnostic judgment.

## Intended behavior

`inspect` is a promptless native OpenCode subagent for bounded current-state queries. The caller supplies the target account or system, evidence boundary, permitted read-only operations, expected facts, and stop conditions. The agent may use Bash, CLIs, MCPs, and relevant skills to retrieve live facts without changing source or external state.

The result states the inspected target and time, query coverage, observed facts, evidence locators, exclusions, and uncertainty. It reports facts rather than diagnosing a symptom, designing a change, or recommending implementation.

Luna/high is the initial model policy because current-state inspection is primarily disciplined retrieval and synthesis. The role and read-only boundary remain stable if model policy changes.

## Success

Parents route live inventory and current-state questions to `inspect`, receive compact evidence they can use in design or triage, and avoid granting a worker mutation authority merely to run read-only queries.

## Non-goals

- Local repository discovery owned by `explore`.
- Documentation or upstream-source research owned by `research`.
- Root-cause diagnosis or disposition owned by `triage`.
- Implementation, remediation, or operational mutation.
- Independent review of completed work.
