# Maintenance

## Dependencies

The launcher uses the base Mise profile's `npm:oxlint` and `npm:@oxlint/plugins` major-1 packages. `npm:oxfmt` is managed in the same profile at major 0.

Upstream: https://github.com/dmmulroy/anti-slop

This skill vendors the generic and opt-in Effect plugins from untagged post-v0.1.2 commit `c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b`. The upstream package version remains `0.1.2`; this is not a new release. Keep this provenance and the runtime source stamp aligned on refresh.

## Intentional adaptations

The local launcher replaces upstream's installer with read-only diagnostics by default. Each diagnostic pass enables every adopted generic rule and the upstream-required native `oxc/no-accumulating-spread` companion at error severity, including `require-readable-spacing`. Explicit `--fix-spacing` is the sole source-writing exception, used under the authority and diagnostic-first workflow in [SKILL.md](../../../../skills/active/anti-slop/SKILL.md). Upstream fix metadata alone does not authorize target writes.

The complete Effect entrypoint remains opt-in through `--effect`, not target dependencies or configuration. The expanded group covers service constructor imports, manual error tags, tag comparison, tagged construction, and Match conventions. These checks are syntactic, not proof of Effect provenance. Copying Effect assets into the temporary runtime does not activate them; the flag gates plugin registration and rule selection.

Keep temporary plugin/configuration material outside targets, use an isolated child working directory, and disable target config lookup and nested config. Target configuration must neither disable bundled rules nor enable unrelated rules. Preserve both the anti-slop root MIT license and the nested ESLint Stylistic `LICENSE` and `UPSTREAM.md`; copy the complete shipped asset tree rather than TypeScript files alone.

## Launcher argument contract

Runtime usage is in [SKILL.md](../../../../skills/active/anti-slop/SKILL.md). Preserve these parser decisions when maintaining the launcher:

- Accept one or more mixed file/directory operands with no launcher-imposed count limit. OS argument limits still apply; no batching, response files, stdin lists, or internal glob expansion is promised.
- Exact `--effect` and `--fix-spacing` may appear anywhere and repeatedly; each is idempotent and applies invocation-wide. Flags without operands exit 2. Help shows `Usage: anti-slop.mjs <target-path>... [--effect] [--fix-spacing]`.
- First-token `--help` prints usage and exits 0 without inspecting later tokens or launching tools. No arguments prints usage and exits 2. Non-leading `--help` is unsupported.
- Outside that shortcut, reject the first `--*` token other than exact `--effect` or `--fix-spacing` with exit 2. This includes general `--fix`, `--config`, value forms such as `--effect=true` or `--fix-spacing=true`, and bare `--`; there is no passthrough channel or end-of-options delimiter. Use `./--name` or an absolute path for double-hyphen names. Single-hyphen tokens are path operands, not short options.
- After unsupported-option and missing-operand checks, validate operands left to right. Reject the first empty string or nonexistent path with exit 2 and an identifying diagnostic. Resolve nonempty operands relative to the caller's working directory; preserve existing existence semantics without imposing realpath handling. Quoted spaces are valid.
- Validate all operands before temporary setup or tool lookup. An invalid later target prevents any partial scan or fix. Forward all absolute paths in original order to each Oxlint pass; retain duplicates and overlaps without broadening to a common ancestor. Default diagnostics use one child. Oxlint owns traversal, overlap handling, and diagnostic ordering.
- Preserve inherited diagnostic output and child exit status. Missing tools and execution failures are failures. A successful exit does not establish an agent checkpoint without the separate suppression inspection in `SKILL.md`.

## Spacing-only fix contract

Fix mode uses a separate temporary configuration with only the generic plugin and `anti-slop/require-readable-spacing` at error severity. Only this pass receives Oxlint's `--fix`; no other generic, native companion, or Effect rule is enabled for mutation. Both passes retain target/nested-config isolation and the same validated absolute operands.

After a successful fix pass, run the complete configuration read-only, preserve the requested `--effect` policy, and return the final child's status. A nonzero or failed fix pass returns failure and skips the final scan; it must not claim a completed checkpoint. Diff inspection remains necessary after a mutating attempt, including failure; the mode does not promise atomic writes or rollback.

The launcher neither verifies edit authority nor enforces the agent's initial diagnostic pass. Those are runtime workflow requirements. General fixing, preview mode, dirty-tree policy, and automatic fixing during default diagnostics remain unsupported.

## Change procedure

1. Compare the current upstream repository with the commit recorded above and inspect its rule entrypoint and imports.
2. Replace the vendored source only with an intentional commit update; retain the notices described above. Exclude upstream tests, installer, skill instructions, and repository-only package/configuration files.
3. Reconcile any native companion rules required by adopted custom rules, then keep the launcher isolated from target configuration and dependencies.
4. Record the adopted revision and any intentional adaptation here; record observed verification with the affected evaluations.

## Verification

When tool activation is authorized and needed, run `mfz apply --target mise` and install the configured major-version tools. Verify the actual local Oxlint and `@oxlint/plugins` versions separately from upstream's pinned toolchain. Exercise the source launcher, then the rendered launcher after authorized activation; keep their results distinct. Use [EVALS.md](EVALS.md) for the multi-target/parser matrix, spacing diagnostics and explicit fixes, complete Effect on/off coverage, default target immutability/configuration checks, and separate agent authority/suppression workflow. Expected scenarios are not evidence that a refresh passed.

For a vendor refresh, verify the copied asset tree exactly matches the selected upstream commit and run upstream's lint, RuleTester, typecheck, and asset-drift checks. Do not require the anti-slop plugin implementation to pass the rules it defines: its ESTree boundary mechanics intentionally use `unknown`, `typeof`, broad dictionaries, and assertions that application code should avoid, and upstream excludes the installed plugin directory from application linting. Continue to run the local anti-slop checkpoint against locally owned JavaScript and TypeScript launcher changes.
