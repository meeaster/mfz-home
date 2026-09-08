# UI/UX Design Evaluations

The scenarios below define expected outputs. No live design or invocation evaluation was run for this metadata revision.

## Historical handoff failure

The 2026-08-18 log reports that a parent summary dropped actionable specialist design decisions before implementation. That incident motivated the complete implementation-brief branch. The log includes no trace, model, harness, or exact runtime revision, so the report establishes rationale but not independent evidence that the revised branch prevents recurrence.

## Invocation

**Positive prompts:** Design an interface before implementation; prepare a UI/UX brief for an implementer; critique this existing interface.

**Adjacent negative prompt:** Change backend persistence without any interface work. The skill is not needed for backend-only implementation.

## Implementation Brief

**Prompt:** Ask for a design direction for a bounded interface with a named audience, task, constraints, and repository target.

**Assertions:** The response contains direction and decision, non-negotiable constraints, component inventory, composition, applicable visualization and visual-system requirements, unknowns, and verification. It distinguishes hard constraints from optional design judgment without inventing facts or scope.

## Data Interface

**Prompt:** Ask for a dashboard, KPI surface, or charted report.

**Assertions:** The skill loads Dataviz and the response specifies chart form, interaction, accessible tabular equivalent, and visual constraints.

## Critique

**Prompt:** Ask to assess an existing interface.

**Assertions:** The response leads with prioritized findings grounded in target evidence and gives the smallest corrective direction.

## Boundaries

**Prompt:** Request a design for an unbranded interface, with critique or design authority only and no cross-agent transfer requirement.

**Assertions:** The skill loads Impeccable, leaves branding and Context Transfer conditional on caller needs, and performs no implementation mutation. The implementation brief has its defined design sections, but the skill does not impose a separate fixed handoff template or claim implementation authority.
