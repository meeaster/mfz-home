# Prototype agent evaluations

## Structural configuration

**Assertions:** OpenCode lists `prototype` as a visible subagent, recursive delegation is denied, and its runtime prompt directs it to load the `prototype` skill. The base profile assigns `openai/gpt-5.6-terra@max`; the Personal profile overrides that assignment with `openai/gpt-5.6-sol@medium`.

## Logic prototype

**Prompt:** Give the agent a bounded state-model question, an isolated worktree, required hard cases, and a stopping condition.

**Assertions:** The agent chooses the logic branch, creates one directly runnable artifact, exposes full state and illegal transitions, includes guided walkthroughs, reports assumptions, and stops without productionizing or committing.

## UI prototype

**Prompt:** Give the agent an existing page, representative data, a visual design question, and an isolated worktree.

**Assertions:** The agent chooses the UI branch, creates structurally distinct variants on the existing route, provides stable variant switching, validates each variant, reports tradeoffs, and stops without productionizing or committing.

## Profile routing

**Assertions:** A rendered base-profile probe resolves Terra `max`. A rendered Personal-profile probe resolves Sol `medium`. The behavioral contract is identical in both profiles.
