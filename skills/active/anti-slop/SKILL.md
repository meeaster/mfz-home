---
name: anti-slop
description: Load before JavaScript or TypeScript edits for concise anti-slop preflight guidance, then use as the final verification checkpoint or when explicitly asked for diagnostics. Run the pinned rules read-only against the narrowest relevant files or directories.
---

# Anti-slop

Use the preflight before changing JavaScript or TypeScript, then use the read-only diagnostic pass after the edit batch. This skill is portable across TypeScript and JavaScript repositories. Default diagnostics write no target files. The launcher never installs packages, reads target Oxlint configuration, or changes dependencies, manifests, or configuration; explicit `--fix-spacing` is its only source-writing mode.

## Preflight

Before editing, keep these defaults in view:

- Parse external values at the boundary into named domain types; reserve `unknown` inputs for boundary type predicates and error causes, and keep it out of returns, aliases, and dictionary values.
- Preserve narrow inference; prefer `satisfies` over broad annotations, open dictionaries, widening, and later assertions. Finite-key records and generic constraints are valid when they preserve evidence.
- Use typed property access and explicit branches; prefer them over `Reflect.*` and conditional spreads of `{}`.
- Keep assertions rare, unchained, and immediately justified with the checked invariant.
- Use real dependency seams instead of module mocks; give parameters precise contracts rather than `object`.
- Avoid adjacent eager array filter/map passes and repeated reducer-accumulator copies. Use iterator helpers only when the runtime supports them; otherwise preserve semantics with a single transformation or a fresh locally mutated accumulator.
- Separate declarations and logical statement groups with blank lines.
- In Effect code, use owning Layers and contextual services, tagged constructors and handlers, and Match helpers. Pass `--effect` during the final check to enable the upstream Effect conventions.

The preflight is a design reminder, not a substitute for the final diagnostic pass.

## Procedure

1. Inspect every target and its applicable instructions. Select the narrowest relevant set of files or directories within the task's authority; exclude dependencies and generated output. Multiple operands do not expand access or edit authority.
2. Always start with the read-only diagnostic pass:

   ```bash
   node <skill-directory>/scripts/anti-slop.mjs <target-path>... [--effect]
   ```

   Provide one or more file or directory paths; files and directories may be mixed. Paths resolve from the caller's working directory. Add `--effect` anywhere in the arguments to enable Effect policy for all targets; use separate invocations for subsets that need different policies. Without the flag, Effect rules remain disabled. Write double-hyphen path names as `./--name` or absolute paths. Use `--help` as the first argument to see launcher usage. General `--fix`, config options, and passthrough flags are unsupported.
3. If output reports `anti-slop/require-readable-spacing`, shown as `anti-slop(require-readable-spacing)` in text output, use `--fix-spacing` instead of hand-editing those mechanical findings, but only within an already authorized source-editing task. Rerun the same narrow target set with the same Effect policy:

   ```bash
   node <skill-directory>/scripts/anti-slop.mjs <target-path>... [--effect] --fix-spacing
   ```

   During assessment, review, or diagnosis-only work, report the finding without fixing. The flag grants no additional edit scope or access. It fixes only readable spacing, then automatically runs the complete ruleset read-only on the same targets and returns that final status. If the fix pass fails, the final scan does not run. Inspect the resulting diff; address remaining diagnostics only under existing authority and rerun read-only after further edits.
4. Inspect every changed source and test file in scope for directives that suppress enabled generic, native companion, or Effect rules. A file-, region-, or line-level suppression is a failed checkpoint even when Oxlint exits successfully or the directive includes a justification. During an authorized implementation task, remove in-scope suppressions, address the underlying diagnostics, and rerun without widening the task to unrelated files. If a suppression cannot be removed within the task's authority, report the checkpoint as blocked rather than clean. During assessment-only work, report suppressions without editing targets.
5. Report the commands, final exit status, every diagnostic, any spacing edits, and any suppression that prevented a clean checkpoint. A successful spacing fix alone is not a clean checkpoint.

Each read-only pass enables every upstream generic anti-slop rule plus the native `oxc/no-accumulating-spread` companion rule at error severity. With `--effect`, it also enables every rule in the vendored `anti-slop-effect` entrypoint at error severity. All passes use isolated configuration, so target repository Oxlint configuration is not loaded or merged.

Upstream source: `dmmulroy/anti-slop`, untagged post-v0.1.2 commit `c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b`. The vendored source and license notices are in this skill package.
