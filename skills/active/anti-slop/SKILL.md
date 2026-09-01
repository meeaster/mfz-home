---
name: anti-slop
description: Load before JavaScript or TypeScript edits for concise anti-slop preflight guidance, then use as the final verification checkpoint or when explicitly asked for diagnostics. Run the pinned rules read-only against the narrowest path containing the changes.
---

# Anti-slop

Use the preflight before changing JavaScript or TypeScript, then use the read-only diagnostic pass after the edit batch. This skill is portable across TypeScript and JavaScript repositories and does not install packages, copy files, read target Oxlint configuration, or write to the target.

## Preflight

Before editing, keep these defaults in view:

- Parse external values at the boundary into named domain types; reserve `unknown` inputs for boundary type predicates and error causes, and keep it out of returns, aliases, and dictionary values.
- Preserve narrow inference; prefer `satisfies` over broad annotations, open dictionaries, widening, and later assertions. Finite-key records and generic constraints are valid when they preserve evidence.
- Use typed property access and explicit branches; prefer them over `Reflect.*` and conditional spreads of `{}`.
- Keep assertions rare, unchained, and immediately justified with the checked invariant.
- Use real dependency seams instead of module mocks; give parameters precise contracts rather than `object`.
- In Effect code, use the owning Layer and contextual service; pass `--effect` during the final check for the opt-in constructor rule.

The preflight is a design reminder, not a substitute for the final diagnostic pass.

## Procedure

1. Inspect the target path and its instructions before running diagnostics. Confirm the requested path is the directory or file to analyze.
2. Run the bundled launcher from this skill directory:

   ```bash
     node <skill-directory>/scripts/anti-slop.mjs <target-path> [--effect]
   ```

   The target is the only required argument. Add `--effect` when the target is an Effect codebase and the Effect-specific rule should run. Without it, Effect rules remain disabled. Use `--help` to see launcher usage.
3. Inspect changed source and test files for directives that suppress anti-slop rules. A file-, region-, or line-level suppression is a failed checkpoint even when Oxlint exits successfully or the directive includes a justification. During an authorized implementation task, remove in-scope suppressions, address the underlying diagnostics, and rerun. If a suppression cannot be removed within the task's authority, report the checkpoint as blocked rather than clean. During assessment-only work, report suppressions without editing the target.
4. Report the command, exit status, every diagnostic, and any suppression that prevented a clean checkpoint.

The launcher supplies the pinned plugin and enables every upstream generic anti-slop rule at error severity. With `--effect`, it also enables the opt-in `anti-slop-effect/no-service-constructor-imports` rule. It runs with an isolated config, so target repository Oxlint configuration is not loaded or merged.

Upstream source: `dmmulroy/anti-slop` v0.1.2 commit `e8c4880471b23ab7f216fba7b27d173a6ef07d4c`. The vendored source and license are in this skill package.
