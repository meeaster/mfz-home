# Skill structuredness

This note captures a working direction for skill authoring. Skills should use enough structure to show humans how instructions affect model behavior without reducing every rule to unexplained bullets.

## Use a hybrid section pattern

Each major section should explain its purpose before it states the rules. The opening prose gives the model and the human the section's context. The bullets make the behavior visible and reviewable.

- Start the section with a short paragraph that names the behavior, scope, or decision the section controls.
- Follow the paragraph with bullets that each express one action, rule, exception, boundary, or completion check.
- Keep related bullets under the section that gives them meaning.
- State the positive behavior first. Use a prohibition only when a positive rule cannot express the guardrail.
- Put branch-specific detail behind a clear reference pointer instead of expanding every section.
- End each ordered step with a condition that makes completion observable.

This pattern is different from both long undifferentiated prose and a list of context-free commands. The prose explains why the rules belong together. The bullets expose the individual behavior changes.

## Preserve the existing authoring guidance

Structuredness is a way to present instructions. It does not replace the principles that govern what belongs in a skill or how the skill is tested.

- Keep `writing-for-agents` as the source for context load, cognitive load, pointers, information hierarchy, progressive disclosure, pruning, and completion criteria.
- Keep [Skill Authoring](../skills/active/skill-authoring/SKILL.md) as the source for intent, authority, scope, authoring records, evaluation scenarios, and testing.
- Treat the hybrid section pattern as an authoring choice, not as permission to add new runtime authority.
- Keep one source of truth for each behavior.
- Remove a bullet when it adds no behavior, evidence, exception, or completion condition.

The structure must preserve meaning. A rewrite that makes a rule easier to scan but changes its scope, exception, or authority is not a successful structured rewrite.

## Make behavior easy to inspect

The main benefit is inspectability. A human author should be able to see which lines change model behavior and which lines explain the surrounding decision.

- Give sections names that describe the behavior they control.
- Make each bullet answer one question: what should the agent do, preserve, avoid, classify, or check?
- Keep exceptions beside the rule they modify.
- Keep evidence requirements and completion checks explicit.
- Use the same term for the same behavior throughout the skill.
- Compare a structured rewrite with its source by meaning, not by matching sentence or bullet counts.

Human readability remains a separate claim. A structured skill may be easier to review, but that claim needs side-by-side human review rather than model scores alone.

## Apply the pattern to orchestrator-mode

The next orchestrator-mode revision should preserve its current topology, authority, work-cycle, branch-reference, acceptance, and boundary contracts while changing their presentation.

- Give each major section a brief explanation of its purpose and the tradeoff it controls.
- Express dispatch rules, authority boundaries, acceptance rules, and completion conditions as behavior-bearing bullets.
- Keep the topology table when the table is the clearest representation of the mode distinction.
- Keep branch references behind their trigger conditions.
- Preserve the distinction between `baked-in` and `chief/split`.
- Preserve the current rule that a role or tool does not grant authority.
- Preserve the current acceptance and boundary-closure conditions.
- Record any semantic change separately from the formatting change.

Do not edit `orchestrator-mode` as part of this note. Use this note to guide a separate revision, then update its authoring record and evaluation scenarios within that change's scope.

## Test the claim before adopting it

The evidence-handoff comparison gives a useful but limited signal. Both the prose and structured skills performed much better than the no-skill baseline. The structured form won one scenario, tied one scenario, and narrowly lost one more complicated scenario. The experiment did not measure human readability, and the same model family served as both candidate and judge.

For the orchestrator-mode revision, use the existing scenarios and add cases that distinguish formatting from behavior.

- Hold the model, variant, prompt, permissions, and scenario constant.
- Compare a prose candidate with a semantically equivalent hybrid candidate.
- Check mode selection, assignment ownership, authority boundaries, reference loading, acceptance, and boundary closure.
- Review the actual briefs and decisions, not only the agent's explanation of them.
- Include a human side-by-side review of section purpose, bullet behavior, visible exceptions, and editability.
- Treat a score change as evidence about the tested scenario, not proof that bullets are universally better.

The revision is ready for adoption when the hybrid form improves human inspection without semantic drift and the existing orchestrator behavior remains within its accepted expectations.
