# Maintenance

## Dependency

Wayfinder is the sole functional dependency. Both skills are user-invoked, so the manual handshake is intentional: Wayfinder charts or advances the map, and this companion joins only after a map exists. Review Wayfinder's current map, ticket, and resolution contract before changing this package. If Wayfinder changes ownership of planning artifacts, revise this companion so it remains additive rather than duplicative.

## Boundary Check

On every revision, verify that the runtime instructions leave destination definition, frontier selection, ticket claims, blocking, resolution, map updates, and scope handling to Wayfinder. The map is its low-resolution index and tickets retain decision detail. Verify separately that the vision owns durable human direction without becoming a roadmap or map copy, and that research, experiments, and the working model preserve context without restating a parallel planning system.

For a local Markdown convention, verify that companion artifacts remain optional and adjacent to the map, research and experiment provenance remain distinct, and prototype source stays in its owning repository or worktree. A human-designated decision forum prepares an existing Wayfinder grilling ticket for shared input; its optional decision brief remains a reader-ready supporting asset, not a new ticket type, decision source, or status board. The user manages participation and buy-off outside companion artifacts.

## Portability

Keep paths, tracker details, repository names, projects, and storage systems out of the package. The active effort chooses an authorized durable location at runtime. Reuse an existing human-owned vision when one governs the effort; create an adjacent feature vision only when durable direction would otherwise be implicit. Keep the skill user-invoked unless a deliberate invocation-policy change is evaluated separately.

## Change Procedure

1. Read `VISION.md`, `EVALS.md`, `MAINTENANCE.md`, and `LOG.md`.
2. Classify the observed problem as a clarification of the vision or evidence layer, or a boundary change with Wayfinder.
3. Update the runtime instructions and every affected meta artifact together.
4. Run the relevant scenarios in `EVALS.md` and inspect the map, companion artifacts, and ticket records.
5. Record consequential boundary or behavior changes in `LOG.md`.
