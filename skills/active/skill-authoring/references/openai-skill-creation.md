# Skill Creation Planning

This is an agent-agnostic adaptation of OpenAI's deprecated Codex `skill-creator`. It preserves the planning and reusable-resource guidance that complements Skill Authoring and Writing for Agents. Skill Authoring owns behavior, authority, the four-file authoring record, and evaluation. Writing for Agents owns runtime writing quality.

## Match Freedom To Fragility

Choose how tightly to constrain behavior from the cost of variance:

| Freedom | Use when | Typical form |
|---|---|---|
| High | Several approaches are valid and judgment depends on context | Goals, constraints, and heuristics |
| Medium | A preferred pattern exists but inputs or environment vary | Pseudocode, parameterized scripts, or a bounded checklist |
| Low | The operation is fragile, error-prone, or must be repeatable | Exact sequence, deterministic script, narrow parameters, and validation |

Do not add rigidity merely to make a skill look complete. Guard the decisions whose variance can cause failure and leave capable agents freedom elsewhere.

## Ground The Skill In Examples

Before choosing files or instructions, establish concrete uses of the skill:

- realistic requests that should invoke it;
- adjacent requests that should not invoke it;
- expected outputs or observable outcomes;
- important variation and edge cases;
- failures the skill must prevent.

Use examples already supplied by the user or available evidence before asking questions. Generated examples are hypotheses until the user or observed behavior validates them. Complete this step when the examples cover the distinct behavioral branches well enough to define the intended contract.

## Plan Reusable Contents

For each example, consider how an agent would execute it without the skill. Add a bundled resource only when repeated work or missing knowledge justifies it:

| Resource | Add when | Value |
|---|---|---|
| `scripts/` | The same code would be rewritten, or deterministic reliability matters | Repeatable execution without regenerating implementation |
| `references/` | Some branches need detailed domain facts, schemas, policies, or procedures | Selective depth without loading it every run |
| `assets/` | The output needs templates, boilerplate, fonts, images, or other static inputs | Reusable material that need not enter reasoning context |
| harness metadata | The selected destination requires separate discovery or interface metadata | Correct provider-specific invocation and presentation |

Create only the directories the behavior needs. Test executable scripts directly. Keep one meaning in one place rather than repeating detailed material in `SKILL.md` and a reference.

## Separate Portable Behavior From Provider Mechanics

The runtime behavior, references, scripts, and four-file authoring contract should remain provider-neutral when practical. Follow destination conventions for frontmatter, sidecars, installation, discovery, and interface metadata. Let available environment guidance supply those provider-specific mechanics rather than copying one provider's commands into the core skill.

## Validate In Layers

Structural validation catches malformed metadata, naming errors, broken links, and missing required files. It does not prove that a skill triggers correctly or steers behavior well.

After structural checks:

1. Run executable resources directly.
2. Evaluate realistic invocation and execution behavior when applicable.
3. Inspect artifacts and session evidence rather than relying on self-report.
4. Iterate from observed struggles, inefficiencies, and regressions.

Use Skill Authoring's authoring record `EVALS.md` and testing workflow for the behavioral evidence contract.

## Adaptation Boundary

Preserved from the upstream creator:

- concrete-example-first discovery;
- degrees of freedom matched to task fragility;
- planning scripts, references, and assets from repeated execution needs;
- layered structural validation followed by iteration from real use.

Owned elsewhere or intentionally omitted:

- Codex-only metadata and command syntax;
- OpenAI initialization and metadata-generation scripts;
- the upstream prohibition on auxiliary documents, because this workflow deliberately keeps four non-runtime maintenance artifacts;
- writing and progressive-disclosure doctrine already owned by Writing for Agents;
- the complete upstream end-to-end workflow, which would conflict with Skill Authoring's behavior-first lifecycle.
