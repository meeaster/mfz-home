# Inspect evaluations

Record the OpenCode version, rendered profile revision, model, task prompt, session IDs, target system, queries, observable result, and limitations for each live run.

## Structural configuration

**Assertions:** OpenCode lists `inspect` as a visible subagent using `openai/gpt-5.6-luna` at `high`; the rendered agent has an empty prompt; file mutation, todo ownership, and recursive delegation are denied.

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

**Assertions:** `explore`, `research`, `triage`, `worker`, and `reviewer` retain those roles; `inspect` claims only current-state retrieval.

## Provider-prompt inheritance

**Assertions:** The source and rendered agent contain frontmatter only, and OpenCode reports no non-empty custom prompt. Adding an agent body fails this evaluation unless an intentional redesign replaces provider-prompt inheritance.
