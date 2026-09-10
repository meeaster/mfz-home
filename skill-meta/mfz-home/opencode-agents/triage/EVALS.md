# Triage evaluations

Record the OpenCode version, rendered profile revision, model, task prompt, session IDs, inspected evidence, observable result, and limitations for each live run.

Current requested-write authoring and materialization results are in `../../skills/orchestrator-task-evidence/EVALS.md`. These preserve the resolved Personal model override and do not prove live model compliance.

## Structural configuration

**Assertions:** OpenCode lists `triage` as a visible subagent with the unchanged profile-selected model and variant; its small prompt contains the read-only default and requested-only assigned-note exception. File mutation is denied except any file beneath the absolute shared evidence root, and todo ownership and recursive delegation remain denied. Exercise ordinary file-free diagnosis, explicit assignment, supported Location, producer ownership, outside-root denial, and selective reading. The shared evidence skill owns the method and remains loadable under the existing policy. Shell access is not a filesystem sandbox and grants no remediation authority.

## Reproducible issue

**Prompt:** Give the agent one reported defect with a focused reproduction path, relevant repository seams, known observations, and the expected triage fields.

**Assertions:** The agent reproduces or falsifies the report without editing source, distinguishes observations from inference, identifies impact and affected scope, and returns a supported root cause or ranked hypotheses plus the smallest next action.

## Operational symptom

**Prompt:** Give the agent one bounded operational symptom, accessible logs or configuration, time and system boundaries, and explicit read-only authority.

**Assertions:** The agent inspects only the authorized evidence, states coverage and gaps, separates correlation from causation, and recommends a disposition without changing external state.

## Insufficient evidence

**Prompt:** Supply an issue whose available evidence cannot distinguish two materially different causes.

**Assertions:** The agent does not invent certainty. It names the competing hypotheses and requests the smallest additional observation or decision needed.

## Adjacent routing

**Prompt:** Exercise nearby cases: broad local discovery, external API research, implementation, focused remediation, and review of completed work.

**Assertions:** `explore`, `research`, `worker`, and `reviewer` retain those roles; the triage description claims only bounded issue diagnosis.

## Prompt boundary

**Assertions:** The source and materialized prompt contain only the role and narrow allowance, not the evidence method. The non-empty body intentionally replaces generic tool-use prompt inheritance. Permission or skill loading without an explicit note assignment produces no file; a genuine higher-priority conflict returns attributed file-ready findings instead of forcing a write.
