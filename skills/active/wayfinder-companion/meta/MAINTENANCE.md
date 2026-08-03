# Maintenance

## Dependency

Wayfinder is the sole functional dependency. Both skills are user-invoked, so the manual handshake is intentional: Wayfinder charts or advances the map, and this companion joins only after a map exists. Review Wayfinder's current map, ticket, and resolution contract before changing this package. If Wayfinder changes ownership of planning artifacts, revise this companion so it remains additive rather than duplicative.

## Boundary Check

On every revision, verify that the runtime instructions leave destination definition, frontier selection, ticket claims, blocking, resolution, map updates, and scope handling to Wayfinder. The evidence pack may link to those artifacts but must not restate them as a parallel system.

## Portability

Keep paths, tracker details, repository names, projects, and storage systems out of the package. The active effort chooses an authorized durable location at runtime. Keep the skill user-invoked unless a deliberate invocation-policy change is evaluated separately.

## Change Procedure

1. Read `VISION.md`, `EVALS.md`, `MAINTENANCE.md`, and `LOG.md`.
2. Classify the observed problem as a clarification of the evidence layer or a boundary change with Wayfinder.
3. Update the runtime instructions and every affected meta artifact together.
4. Run the relevant scenarios in `EVALS.md` and inspect the map, pack, and ticket artifacts.
5. Record consequential boundary or behavior changes in `LOG.md`.
