# ui-ux-design

## Intent

A shared, implementation-ready UI/UX design method for Personal and Work: give a design agent one named skill and get back direction an implementer can act on without guessing hierarchy, component behavior, accessibility needs, or verification. Composes Impeccable for design rigor and Dataviz when data is visualized.

Not for: backend-only work, organization branding, the handoff workflow itself, or implementation.

Success: a complete design artifact that separates hard constraints, component decisions, optional judgment, unknowns, and verification.

## Scenarios

- **Design before implementation** for a bounded interface with audience, task, and constraints: direction, constraints, component inventory, composition, unknowns, verification; no invented facts or scope.
- **Dashboard or charted report**: loads Dataviz; specifies chart form, interaction, and an accessible table equivalent.
- **Critique an existing interface**: prioritized findings grounded in the target, smallest corrective direction.
- **Unbranded design, critique-only authority**: loads Impeccable, adds no branding, mutates nothing.
- **Backend persistence change**: not needed.

## Decisions

- **The implementation brief is complete, not summarized** (2026-08-18). A parent summary dropped actionable specialist design decisions before implementation.
- **The OpenCode `ui-ux-designer` agent stays promptless** (2026-08-18), so the provider's base prompt survives; parents require this skill when dispatching it. Putting the method in the agent definition would create a second owner.
- **Compose, don't copy.** Impeccable is required and Dataviz conditional; check their scenarios when either changes instead of copying their rubrics.
- **Parked as a prototype** (human, 2026-09-14): created but not actively used.

## Sources

None external. Depends on the `impeccable` and `dataviz` skills.
