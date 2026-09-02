# Triage evaluations

Record the OpenCode version, rendered profile revision, model, task prompt, session IDs, inspected evidence, observable result, and limitations for each live run.

## Structural configuration

**Assertions:** OpenCode lists `triage` as a visible subagent using `openai/gpt-5.6-luna` at `max`; the rendered agent has an empty prompt; file mutation, todo ownership, and recursive delegation are denied.

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

## Provider-prompt inheritance

**Assertions:** The source and rendered agent contain frontmatter only, and OpenCode reports no non-empty custom prompt. Adding an agent body fails this evaluation unless an intentional redesign replaces provider-prompt inheritance.
