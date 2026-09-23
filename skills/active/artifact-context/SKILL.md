---
name: artifact-context
description: Preserve the context readers need in reports, proposals, design documents, and references. Load on explicit request or when an owning artifact workflow requires it.
metadata:
  opencode/autoinvoke: false
---

# Artifact context

Make an artifact usable by its intended reader without reconstructing the conversation that produced it. Carry the meaning the reader needs, accounting for context already available at the destination.

## Scope and ownership

- Load on explicit request or when an active artifact workflow or agent instruction requires it.
- Apply this guidance to artifacts that preserve understanding for later use by humans, agents, or both. Routine agent prompts, continuation handoffs, and specialist-to-implementation transfers follow their owning workflows; saving a prompt as Markdown does not change its purpose.
- Follow the artifact owner's format, storage, validation, and publication requirements, including any required independence from the source session. This skill supplies context guidance, not a replacement writing workflow or permission to publish.
- Choose sections and detail from the requested use. The headings here are not an output template.

## Reader and destination

The reader's intended use determines what needs explaining. Their identity and available context determine how to explain it.

- Establish what the reader needs to understand, decide, or do, and what the destination reliably supplies. Infer this from the request and available evidence; ask when an unresolved distinction would materially change the content or references.
- Let the primary reader guide terminology, prerequisite explanation, and detail. Support secondary readers where useful without turning every artifact into both a report and an execution guide.
- Derive actions and questions from the request, not the audience's job title. A brief for a Security team does not automatically require a security checklist or assignments for that team.

## Meaning to preserve

Include consequential context that would otherwise be lost. Intentional dependencies are valid when the reader can reliably use them.

- Preserve relevant goals, rationale, priorities, tradeoffs, and corrections. Distill repetition without making exploratory preferences sound like settled requirements.
- Distinguish source facts, interpretation, proposals, accepted decisions, and uncertainty where flattening them would mislead the reader.
- Explain assumptions or constraints that the conversation supplied but the destination does not. Omit production history and incidental detail unless the artifact's purpose needs them.
- Respect the destination's disclosure boundary. If necessary meaning cannot be shared, make the limitation visible and resolve any disclosure uncertainty before transferring it.

## References that serve the reader

References can supply detail without making the artifact repeat everything. Distillation can also remove a source dependency entirely.

- Keep a reference when it helps the reader act, establish authority or attribution, verify a consequential claim, recover omitted detail, detect version drift, or revise the work.
- Use only the precision that purpose needs, from a source name to a specific section, symbol, or inspected version. Omit citations for minor observations that are fully explained and have no continuing source value.
- Use local paths when the intended reader has the same workspace. Use repository-relative or accessible canonical references for another environment, or include the necessary explanation when the source is unavailable and disclosure is permitted.
- Rely on context genuinely supplied by the host, such as a pull request's diff. Include motivation or decision criteria the host does not communicate rather than duplicating its contents.

## Check from the destination

- Read the result as if only the artifact, its host context, and its declared accessible references were available. Can the intended reader use it without recovering the original conversation?
- Fix hidden dependencies and misleading certainty. Make material access, evidence, or freshness limitations visible.
- Keep enough explanation for the intended use without maximizing self-containment or adding a bibliography merely to record how the artifact was produced.
