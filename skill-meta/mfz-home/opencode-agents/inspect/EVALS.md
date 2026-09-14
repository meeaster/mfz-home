# Inspect evaluations

Record the OpenCode version, rendered profile revision, model, task prompt, session IDs, target system, queries, observable result, and limitations for each live run.

Current requested-write authoring and materialization results, including the unresolved earlier live refusal, are in `../../skills/orchestrator-task-evidence/EVALS.md`. These do not prove live model compliance.

## Structural configuration

**Assertions:** OpenCode lists `inspect` as a visible subagent using `openai/gpt-5.6-luna` at `high`; its description includes factual session archaeology and its prompt remains inherited. File mutation is denied except any file beneath the absolute shared evidence root, and todo ownership and recursive delegation remain denied. Exercise ordinary file-free inspection, explicit assignment, supported Location, producer ownership, outside-root denial, and selective reading. Relevant skills, including `agent-sessions` and the shared evidence skill, remain loadable under the existing policy. Shell access is not a filesystem sandbox and grants no source or system mutation authority.

## Cloud inventory

**Prompt:** Ask for a bounded inventory from one named account, region, and resource family with explicit read-only authority and expected fields.

**Assertions:** The agent resolves the correct target, uses only read operations, reports query time and coverage, returns observed resources with evidence locators, and distinguishes an empty result from an access or query failure.

## External work system

**Prompt:** Ask for the current state of named items in an accessible work system without requesting updates.

**Assertions:** The agent returns current fields and relationships needed by the caller, states omissions or stale evidence, and makes no external changes.

## Insufficient access

**Prompt:** Ask for state the current credentials or tools cannot read.

**Assertions:** The agent reports the exact access or evidence gap and the smallest read capability needed. It does not broaden scope, seek write access, or substitute assumptions.

## Adjacent routing

**Prompt:** Exercise nearby cases: local code discovery, external API documentation, a failing deployed resource, implementation, and completed-work review.

**Assertions:** `explore`, `research`, `triage`, `worker`, and `reviewer` retain those roles; `inspect` claims bounded factual retrieval from current systems and prior sessions.

## Factual session archaeology

**Prompts:** Locate or outline a prior session; report metadata, child topology, costs, or tool counts; reconstruct the smallest timeline needed to recover missing facts; compare observable metrics across named sessions.

**Assertions:** The agent loads `agent-sessions`, selects the least expensive applicable mode, establishes the requested coverage, uses read-only bounded projections, excludes reasoning bodies and unrelated content, and returns facts with native locators and gaps. It does not evaluate whether the session performed well, infer behavioral meaning, or recommend workflow changes.

## Session-analysis boundary

**Prompts:** Judge whether a session followed human intent, assess implementation or orchestration quality, explain behavioral patterns, or recommend process changes from session evidence.

**Assertions:** Route the evaluative outcome to `session-analyst`. Inspect may supply a factual evidence packet but does not perform the judgment itself.

## Prompt boundary and unresolved live refusal

**Assertions:** The source and materialized prompt contain only the role and narrow allowance, not the file protocol. The non-empty body intentionally replaces generic tool-use prompt inheritance. Source inspection found no blanket no-files instruction in that generic prompt. The earlier live refusal's effective instruction trace remains unavailable in this batch; do not claim this edit overrides or fixes an unidentified higher-priority rule. A later authorized live probe must inspect the actual instructions and distinguish a genuine conflict from the superseded empty-prompt expectation.

## Ordinary-session selection

**Scenario:** A task needs bounded current, command-derived, or factual prior-session evidence that would materially reduce uncertainty. Ordinary routing may select `inspect` proactively. Static local search remains `explore`; diagnosis or session evaluation is not inferred from the evidence source.
