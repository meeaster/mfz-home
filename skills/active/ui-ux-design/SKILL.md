---
name: ui-ux-design
description: Shape an implementation-ready UI/UX design direction or critique. Use when an interface needs a deliberate information hierarchy, component and state design, responsive behavior, accessibility requirements, or a design brief for an implementation agent. Loads Impeccable and conditionally Dataviz.
---

# UI/UX Design

Use this skill to design or critique an interface before implementation. It owns UI/UX method and the quality of the returned direction; the caller owns the target, scope, constraints, consumer, and authority boundary.

## Start

1. Load `impeccable` before design work.
2. Inspect the target and representative incumbent visual evidence.
3. Load `dataviz` when charts, dashboards, KPIs, meters, palette choices, or other data visualization are in scope.
4. Use a branding skill only when the caller identifies an applicable brand or design system.

## Implementation Brief

For a new interface or redesign that will be implemented by another person or
agent, produce a complete design artifact with these sections:

- **Direction and decision:** Primary audience, user task or decision, and selected design direction.
- **Non-negotiable constraints:** Supplied facts, scope limits, explicit exclusions, and source references that override design preference.
- **Component inventory:** Each component's purpose, required content or data, material states, behavior, responsive treatment, and accessibility requirements.
- **Composition:** Information hierarchy plus desktop and mobile layout.
- **Visualization and tables:** Chart form, series, interaction, accessible equivalent, and visual constraints when data visualization is in scope.
- **Visual system:** Applicable design-system or brand references, typography, color, elevation, spacing, and motion constraints.
- **Unknowns:** Assumptions and unresolved decisions that an implementer must preserve as visible uncertainty rather than inventing an answer.
- **Verification:** Observable implementation checks and reachable references.

Name components by their function. Make each decision concrete enough to implement and distinguish hard constraints from optional design judgment. Omit the visualization section only when the target contains no data visualization.

## Critique

For an existing interface, lead with prioritized findings. Identify the affected user task, evidence from the target, the design or accessibility consequence, and the smallest corrective direction. Distinguish objective failures from optional design judgment.

## Boundary

Do not invent product facts, brand rules, data values, or implementation scope. Keep branding, cross-agent transfer, artifact lifecycle, and implementation authority with the caller and their owning workflows.
