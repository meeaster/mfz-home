# Maintenance

## Dependencies

The runtime skill has no required scripts, references, tools, repositories,
schemas, or provider-specific behavior. It relies on applicable destination
instructions for local storage, privacy, validation, and publication rules and on
whatever session source is available when past evidence must be retrieved.

## Change Procedure

1. Read every package artifact before changing behavior.
2. Classify the issue as invocation, form selection, evidence fidelity,
   portability, destination adaptation, or authority.
3. Make the smallest behavioral change and update affected evaluations.
4. Verify positive and adjacent-negative invocation cases when the description
   changes.
5. Record consequential decisions or reversals in `LOG.md`.

## Portability Review

Verify that runtime instructions contain no personal names, private repository
assumptions, fixed workspace layout, local schema, machine path, harness command,
or publication mechanism. Local adapters may depend on those details; the skill
must not.

## Verification

Static review must confirm valid front matter, coherent package artifacts, and
the absence of environment-specific assumptions. Representative execution should
inspect the resulting Capture or Practice and destination diff rather than rely
on the agent's summary.
