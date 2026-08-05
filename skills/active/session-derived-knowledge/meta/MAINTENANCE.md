# Maintenance

## Dependencies

The runtime skill depends on the model-invoked `context-transfer` skill for the
consumer, destination, dependency, and reference contract. It has no required
scripts, tools, repositories, schemas, or provider-specific behavior. It relies
on applicable destination instructions for local storage, privacy, validation,
and publication rules and on whatever session source is available when past
evidence must be retrieved.

## Change Procedure

1. Read every package artifact before changing behavior.
2. Classify the issue as invocation, form selection, evidence fidelity, session
   independence, destination adaptation, or authority. Route generic consumer,
   environment, and reference behavior to `context-transfer`.
3. Make the smallest behavioral change and update affected evaluations.
4. Verify positive and adjacent-negative invocation cases when the description
   changes.
5. Record consequential decisions or reversals in `LOG.md`.

## Portability Review

Verify that runtime instructions contain no personal names, private repository
assumptions, fixed workspace layout, local schema, machine path, harness command,
or publication mechanism. Verify that they do not duplicate the transfer contract.
Local adapters may depend on environment details; the skill must not.

## Verification

Static review must confirm valid front matter, coherent package artifacts, and
the absence of environment-specific assumptions. Representative execution should
inspect the resulting Capture or Practice and destination diff rather than rely
on the agent's summary.
