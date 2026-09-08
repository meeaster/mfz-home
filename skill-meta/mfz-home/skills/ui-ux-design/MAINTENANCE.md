# Maintenance

The 2026-08-18 integration deliberately kept the OpenCode `ui-ux-designer` agent promptless to preserve its provider base prompt. Shared instructions instead tell parents to require `ui-ux-design` when dispatching it. If that integration changes, verify both the skill-loading path and whether a custom agent prompt displaces provider behavior; duplicating the method in an agent definition would create a second owner.

Impeccable is the unconditional design dependency; Dataviz is conditional on data visualization. When either dependency changes, check the design and data-interface scenarios for conflicts or missing requirements rather than copying its rubric into this skill. Branding and consumer-specific transfer remain caller-owned.
