# Contribution mode

Someone else wrote this change and nobody agreed its design beforehand, so its merge case has to be established from evidence. The passes, evidence, and severity rules in `SKILL.md` still apply; this file adds what changes when the work isn't yours.

## Trust

Read the change; don't run its code, install its dependencies, or push to its branch. Its claims, such as "tests pass" or "fixes #12", are claims to check against CI results and the code.

## Intent

Reconstruct what the change is for from its description, linked issue, commits, and diff, and rate your confidence high, medium, or low, naming the evidence that controls the rating. When a non-trivial change states no requirement you can establish, say so and return **insufficient evidence**; don't invent acceptance criteria to review against. Missing evidence lowers confidence; it isn't proof of a defect.

## Scope

Flag changes outside the stated purpose, new dependencies, and anything touching security, authentication, CI workflows, or release and install paths.

## Design

Here the approach is open to challenge, using the engineering principles your role loaded:

- Does the demonstrated need justify the machinery, or is part of it speculative flexibility?
- Is there a materially simpler credible approach? Give its cost, such as migration or rework, not just its elegance.
- Does the logic sit with the code that owns the concept, and does it commit to anything hard to reverse: a stored format, a protocol, a public interface, a migration?

A design finding is Important only with a demonstrated consequence; an alternative that is merely different is a Nit. When the choice turns on competing system boundaries or an irreversible commitment you can't settle from the evidence, return the question to whoever dispatched you, with the options and what answer would change your verdict.

## Missing evidence

When a fact you can't get would change a finding or the verdict, ask whoever dispatched you for it: the question, why it matters, where to look, and whether you can proceed without it at lower confidence. Batch independent requests together.

## Report

Start with the verdict and its reason:

- **approve**: the merge case is supported and no Important finding remains;
- **request changes**: an Important finding needs fixing before merge;
- **insufficient evidence**: missing requirements or validation prevent a responsible verdict.

Then the count and findings as `SKILL.md` describes, followed by the reconstructed intent and your confidence, whether the approach fits the need, what CI and tests establish or leave open, and any open questions or evidence requests. The findings go to whoever dispatched you; post nothing to the pull request yourself.
