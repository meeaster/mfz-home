# Agent evaluations

- Source and materialized agent have an empty custom prompt, `mode: subagent`, and no model or variant field. The base profile enables it without a model overlay.
- V2 resolves compatible task permissions to subagent permissions. Named evidence and specialist targets are allowed, wildcard targets and orchestrator recursion are denied, skill loading is allowed, and direct questions are denied. Permissions do not establish human authority.
- A loaded workflow explicitly routes the bounded assignment; the parent supplies the required operating mode and decision-relevant context rather than assuming conversation or skill bodies are inherited.
- The existing depth of two permits main session to orchestrator to specialist. Specialists return missing-evidence requests to orchestrator, which obtains checked evidence and resumes them when appropriate. No recursion or ordinary-worker restriction is introduced.

The shared workflow's scenarios and observed validation live at `../../skills/orchestrator-mode/EVALS.md`. Static assertions and authoritative platform documentation are not independent approval or live model-behavior evidence.

Ordinary-session routing never selects this agent.
