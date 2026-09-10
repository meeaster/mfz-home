# Vision

`ui-ux-designer` is a promptless native OpenCode subagent for UI/UX design judgment. The caller supplies the target, task shape, constraints, and expected handoff; the Sol/medium assignment is profile policy.

The agent inherits OpenCode's normal provider prompt and may be used for UI/UX design, redesign, or critique. The caller instructs it to load `ui-ux-design`; when a separate implementation agent will consume its response, the caller also asks it to load `context-transfer` and produce an implementation-ready brief. Consultation stays read-only and returns task-relevant states, accessibility, constraints, and verification to the parent for user acceptance. System boundaries remain architect work, runnable artifacts remain prototype work, and implementation needs separate authority. Settled UI edits do not require this consultant.

`/orchestrate` owns bounded consultation authority and same-engagement continuity. An explicit UI-design request already authorizes appropriate consultation; otherwise the caller explains the need and asks. The agent does not accept its own direction.

Success means parents can select this lane for design judgment without hard-coding a single workflow, brand, skill set, or artifact type into the agent itself.

The human authorized direct production of explicitly assigned notes under `/tmp/opencode/orchestrator-evidence/`. The caller requires `orchestrator-task-evidence`, which owns note production and reuse. Permission or skill loading alone authorizes no file. Ordinary consultation remains file-free; this exception grants no project implementation or external mutation and does not change the inherited provider prompt.
