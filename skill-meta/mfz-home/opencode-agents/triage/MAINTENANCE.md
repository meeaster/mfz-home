# Maintenance

## Runtime dependencies

- OpenCode must treat a frontmatter-only agent file as an empty custom prompt and fall back to the provider system prompt.
- `profiles/base/profile.yml` enables `triage` and owns its Luna/max assignment.
- Native task behavior owns child-session creation, presentation, and prompt delivery.
- The caller's brief owns the issue context, evidence boundary, decision criteria, and expected handoff.

## Change procedure

1. Read this record and inspect representative triage sessions before changing the role, model, permissions, or prompt boundary.
2. Keep issue-specific procedure in caller briefs unless repeated evidence supports a stable addition.
3. Preserve the read-only source boundary and keep mutation with `worker` or the parent workflow.
4. Run every affected scenario in `EVALS.md` and record consequential decisions or reversals in `LOG.md`.

## Validation

1. Run plain `mfz apply` from the Personal home when the current source state is ready to render.
2. Confirm the rendered agent has an empty prompt, Luna/max, and the intended permission denies.
3. Run `mfz doctor` and a fresh native child probe for representative behavioral changes.

## Model policy

Compare Luna/max with a cheaper effort or Sol only under matched representative triage scenarios. Record completeness, unsupported certainty, parent rework, latency, tokens, and estimated cost before changing the default.
