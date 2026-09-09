# Maintenance

## Dependencies

The launcher uses the base Mise profile's `npm:oxlint` and `npm:@oxlint/plugins` major-1 packages. `npm:oxfmt` is managed in the same profile at major 0.

Upstream: https://github.com/dmmulroy/anti-slop

This skill vendors the generic and opt-in Effect plugins from upstream post-v0.1.2 commit `95a56e5d24fb3d849673c2d51eb0908b8bd2d33b`. The launcher also enables the upstream-required native `oxc/no-accumulating-spread` companion rule. Record the adopted commit here whenever the vendored source is updated so future maintenance can compare upstream changes before aligning this skill.

## Change Procedure

1. Compare the current upstream repository with the commit recorded above and inspect its rule entrypoint and imports.
2. Replace the vendored source only with an intentional commit update; retain the upstream MIT license.
3. Reconcile any native companion rules required by adopted custom rules, then keep the launcher isolated from target configuration and dependencies.
4. Record the adopted revision and any intentional adaptation here; record observed verification with the affected evaluations.

The Effect rule is deliberately opt-in: pass `--effect` only for an Effect codebase. Absence of the flag is the off state.

## Verification

Run `mfz apply --target mise`, install the configured major-version tools, verify `oxlint --version` and `mise which npm:@oxlint/plugins`, then exercise violating, clean, and source-suppressed disposable targets. Confirm the launcher changes no target files and the agent workflow does not report a source-suppressed target as clean.

For a vendor refresh, verify the copied asset tree exactly matches the selected upstream commit and run upstream's lint, RuleTester, typecheck, and asset-drift checks. Do not require the anti-slop plugin implementation to pass the rules it defines: its ESTree boundary mechanics intentionally use `unknown`, `typeof`, broad dictionaries, and assertions that application code should avoid, and upstream excludes the installed plugin directory from application linting. Continue to run the local anti-slop checkpoint against locally owned JavaScript and TypeScript launcher changes.
