# Vision

Provide a human-selected Sol/medium alternative to `worker` without changing the worker's responsibilities, authority, verification, or default routing. Outside a loaded workflow, only an explicit human request to use `super-worker` for a named task or batch selects it. Difficulty, failed attempts, and perceived quality never select it automatically.

The agent remains frontmatter-only like `worker`, inheriting the provider system prompt and environment guidance. Its permissions match `worker`; task-specific instructions and stop contracts remain in caller briefs. There is no worker prompt body to reuse, so no shared prompt package or engine feature is needed. Keep permissions aligned when future authorized worker changes occur, but evaluate any role or authority change separately.

`profiles/base/profile.yml` owns model assignment and enablement. The initial `openai/gpt-5.6-sol` and `medium` spelling matches the existing base `agent-author` and `architect` entries. Personal inherits base. Model choice supplies no implementation, source-control, publication, or independent-review authority. The parent checks implementation and validation evidence before acceptance.

This choice supersedes the earlier deferral of any stronger-worker role only for an explicit human-selected alternative. Automatic escalation, a different implementation contract, orchestrator-child migration, and shared-skill migration remain outside this change.
