# Maintenance

## Runtime dependencies

- OpenCode must expose `architect` as a native subagent and the configured provider must expose `openai/gpt-5.6-sol@medium`.
- `development-principles` supplies the architecture and implementation-boundary guidance loaded by the agent.
- The caller owns the problem, user priorities, accepted constraints, accessible repository paths, downstream decision, and stop conditions.
- The primary caller owns every `explore`, `research`, and `inspect` evidence session and supplies compact packets plus stable source and session locators.

## Change procedure

1. Read this record and representative architect sessions before changing the role, model, permissions, or output contract.
2. Keep product-specific architecture procedure in the caller brief or owning domain skill.
3. Preserve the consultant boundary: the agent may recommend, but the primary session decides and a worker implements.
4. Preserve credible alternatives rather than a rigid option quota.
5. Run affected scenarios in `EVALS.md` and record consequential decisions or reversals in `LOG.md`.
6. Preserve root-owned evidence gathering and recursive delegation denial. Do not add architect-side OpenCode CLI, API, transcript retrieval, or a custom session-result transport.
7. Reconsider this boundary only from repeated live cases showing material root-mediation delay or primary-context bloat; compare that cost against shared evidence reuse, simpler topology, and permission clarity before changing it.
8. Keep every single or batched evidence request complete. For batches, preserve dependency and parallel-safety markings, group only genuinely independent concurrent work, and avoid artificial decomposition or duplicate investigation.

## Validation

1. Run plain `mfz apply` from the Personal home.
2. Confirm the rendered agent resolves to Sol/medium with mutation and recursive delegation denied.
3. Run `mfz doctor` and a fresh native architecture probe before claiming live behavior.

## Safety boundary

Shell and integration catalogs may expose mutation commands that frontmatter cannot classify individually. Caller briefs must state read-only authority, and behavioral validation must inspect actual tool calls rather than relying on the agent's summary.
