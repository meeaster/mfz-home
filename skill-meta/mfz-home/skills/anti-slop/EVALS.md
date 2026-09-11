# Anti-slop evaluations

The scenario sections define expected behavior, not blanket pass claims. Observed results are dated and limited to the stated fixtures. Historical adopted revisions remain in [LOG.md](LOG.md).

## Observed follow-up: 2026-09-10 runtime hint

The launcher mutation unit reported 19 passing source-launcher assertions from `node /tmp/opencode/anti-slop-runtime-hint-matrix.mjs`. Spacing-only, mixed spacing/semantic, multiple-spacing, multi-target, and isolated-config cases emitted the exact [runtime hint](MAINTENANCE.md#readable-spacing-runtime-hint) once. Direct capture preserved diagnostics and summary on stdout with only the hint plus LF on stderr; combined capture placed the hint after the final summary. Diagnostic exit status remained 1.

Clean, semantic-only, invalid-input, missing-tool, spacing-fix, and complete post-fix cases emitted no hint, including semantic/Effect residual failures and a syntax-error fix failure. All cases cleaned temporary state; nonmutating cases retained target inventories. A controlled fake Oxlint child emitted 1,048,576 bytes and split the marker across delayed writes, verifying bounded detection and output draining. Real local Oxlint covered policy/rule behavior; the synthetic child tested only streaming boundaries.

Local versions remained Node `v26.8.1`, Mise `2026.9.4 linux-x64`, Oxlint and `@oxlint/plugins` `1.81.0`, pnpm `11.26.0`, Vitest `4.1.9`, and TypeScript `6.0.3`. The worker reported passing source anti-slop, syntax, suppression, repository test/typecheck, and whitespace checks. The vendored revision and retained fixed fixture were unchanged.

Evidence is in `runner-implementation-result.md`, heading `2026-09-10 follow-up: readable-spacing runtime hint`, under the temporary evidence directory cited below. These are reported source-launcher observations, not an authoring-unit rerun, rendered execution, or real-model evidence that the hint changes command selection. Earlier observed sections remain historical and unchanged.

## Observed follow-up: 2026-09-10 `--fix-spacing`

The launcher mutation unit reported the explicit fix-mode results below through the source launcher at `skills/active/anti-slop/scripts/anti-slop.mjs`. Vendored upstream remains untagged post-v0.1.2 commit `c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b`. This follow-up intentionally replaces the earlier no-autofix policy only for explicit spacing fixes; earlier diagnostic-only observations below remain historical.

- `node /tmp/opencode/anti-slop-fix-spacing-matrix.mjs` passed 17 assertions. Default mode still reported spacing with exit 1 and unchanged content. Successful fixes emitted a spacing-only report followed by the complete read-only report. A residual `anti-slop/no-runtime-typeof` diagnostic remained after spacing changed and determined the final failing status.
- Cases covered mixed directory/file operands and spaces, fix-flag positions and repetition, target config isolation, invalid later and empty operands, flags without targets, general `--fix` rejection, and syntax-error fix failure. Invalid cases skipped Mise lookup; successful and failing runs cleaned temporary state. The failed fix did not run a final scan.
- Combined `--effect --fix-spacing` ran spacing alone first, then the complete Effect-enabled ruleset read-only. The remaining `anti-slop-effect/prefer-effect-match` finding determined failure. Effect diagnostics remained off without `--effect`.
- The worker reported passing launcher syntax and local anti-slop/suppression checks, repository tests, typecheck, and diff whitespace. Local versions remained Node `v26.8.1`, Mise `2026.9.4 linux-x64`, Oxlint and `@oxlint/plugins` `1.81.0`, pnpm `11.26.0`, Vitest `4.1.9`, and TypeScript `6.0.3`. These are local checks, not a rerun of the upstream suite described below.

The retained `/tmp/opencode/anti-slop-spacing-probe-ses_f737bd3cdffek0xJ7o8eTUQ0WR/spacing-only.js` initially contained adjacent `const answer = 42;` and `export { answer };` lines. The earlier default probe reported `anti-slop(require-readable-spacing): Expected blank line before this statement.` at line 2:1, exited 1, and retained its 38-byte SHA-256 `6f33a0d6e81744900aa9a6fde323a22eea50f05d2b8a0d7a4ff79969a08f071c`.

The worker then ran the source launcher on that same file with `--fix-spacing`. It inserted one blank line, produced a clean one-rule fix report and a clean full-rule diagnostic report, and exited 0 with empty stderr. The retained fixed file is 39 bytes with SHA-256 `292d4f23d6a7b1ba915281ffa5788cb5a7859dad14d3ed9d8410636275e37855`. The authoring unit independently read its digest, but did not rerun the fix or diagnostic matrix.

Temporary evidence is in `runner-implementation-result.md`, section `2026-09-10 follow-up: explicit --fix-spacing`, and `spacing-diagnostic-probe.md` under the evidence directory cited below. These observations establish source-launcher behavior for the documented fixtures, not rendered execution, model selection of the fixer instead of manual edits, assessment-only restraint, or agent diff/suppression handling. Those workflow evaluations remain unobserved. The earlier vendor self-hosting limitation is unchanged.

## Observed verification: 2026-09-10

The vendor and launcher mutation units reported the following results for untagged post-v0.1.2 commit `c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b`, described by Git as `v0.1.2-9-gc44ef22`. The package version remains `0.1.2`. This authoring update records their execution evidence; it does not claim a new independent test run or approval.

### Upstream and asset correspondence

Upstream `pnpm check` passed lint, all 24 sequential RuleTester/CLI tests, TypeScript typecheck, and the asset-drift check after `pnpm install --frozen-lockfile` in the disposable clone. The clone remained clean at the selected revision. Every shipped asset matched the local vendor tree byte-for-byte, excluding only the retained local root license from the file-set comparison. That license also matched upstream; the nested ESLint Stylistic `LICENSE` and `UPSTREAM.md` were present. No upstream tests or repository-only files were copied.

Upstream tools were Node `v26.8.1`, pnpm `10.33.0`, Oxlint and `@oxlint/plugins` `1.78.0`, tsx `4.23.12`, TypeScript `7.0.2`, and `@types/node` `26.2.0`. The first check stopped because dependencies were absent; the installed rerun passed despite pnpm's ignored-esbuild-build-script warning.

### Source launcher

Validation used `/home/mark/workspace/repos/mfz-home/skills/active/anti-slop/scripts/anti-slop.mjs`, not rendered configuration. Local tools were Node `v26.8.1`, Mise `2026.9.4 linux-x64`, Oxlint and `@oxlint/plugins` `1.81.0`, oxfmt `0.66.0`, pnpm `11.26.0`, Vitest `4.1.9`, and TypeScript `6.0.3`.

- The disposable matrix passed 33 assertions spanning single and multiple files, mixed file/directory operands, relative/absolute paths, spaces, reversed order, and a later-target violation. Outcomes were 8 clean exits, 10 diagnostic exits, and 15 usage/rejection exits. A separate `strace` showed one Oxlint child receiving every resolved absolute target in the supplied order.
- Argument cases covered flag positions and repetition, no operands, flags alone, empty and missing first/later operands, unsupported options, double-hyphen paths, an existing single-hyphen path, and first-position versus non-leading help. A Mise guard proved tool lookup was skipped for rejection/help cases; missing later targets produced no partial diagnostics.
- Spacing probes diagnosed import/top-level, multiline-declaration, and control-flow/return gaps; already-separated code passed. All five Effect rule IDs produced findings with the flag, and each Effect fixture passed without it. The constructor-import `.test.js` exemption also passed.
- Every matrix case retained target bytes and cleaned its temporary runtime. A separate inventory/content-digest probe retained the same 23 target entries across clean, violating, and invalid-later-target invocations. Target configuration could neither disable bundled spacing nor enable unrelated `no-console` diagnostics.
- `node --check` and the launcher's own generic anti-slop checkpoint passed. The changed launcher contained no suppression directives in the recorded scan. Repository `pnpm test` passed 14 files and 69 tests, `pnpm typecheck` passed, and `git diff --check` passed. The repository test command covers `opencode`, not this skill's CLI matrix.

### Limits and evidence locators

No rendered launcher was activated or tested for this revision. Model invocation, preflight timing, disjoint-file checkpoint selection, and agent suppression handling remain unobserved. Syntactic Effect fixtures do not establish type-aware provenance or a complete false-positive suite. Duplicate/overlapping operands and tool-failure behavior remain expected contract cases without a reported dedicated probe.

Direct linting of the vendored Stylistic implementation returned four diagnostics: two `no-runtime-typeof` findings and two `no-known-value-widening` findings. Exact upstream bytes were retained. This is the vendor self-hosting exclusion described in [MAINTENANCE.md](MAINTENANCE.md), not a clean vendor checkpoint.

Detailed execution evidence is temporary, under `/tmp/opencode/orchestrator-evidence/anti-slop-refresh-ses_f73bf7e57ffek4MHI59w2l1fRH/evidence/`: `vendor-refresh-result.md` and `runner-implementation-result.md`. Reproduction commands were `node /tmp/opencode/anti-slop-refresh-matrix.mjs`, `node /tmp/opencode/anti-slop-refresh-spacing-effect-probe.mjs`, and `node /tmp/opencode/anti-slop-refresh-immutability.mjs`; matrix results and the argv trace were `/tmp/opencode/anti-slop-refresh-matrix-result.json` and `/tmp/opencode/anti-slop-refresh-argv.trace`. These disposable artifacts are not a durable test harness.

## Observed verification: 2026-09-09

Source and rendered launchers for upstream commit `95a56e5d24fb3d849673c2d51eb0908b8bd2d33b` were exercised directly with Oxlint 1.81.0 in disposable fixtures. A violating fixture produced the three expected array-performance diagnostics and retained the same file digest. A clean fixture passed without writes. The Effect fixture failed only with `--effect`, and the source launcher passed its own anti-slop checkpoint. Upstream `pnpm check` also passed with its pinned Oxlint 1.78.0 dependencies.

This verification covers launcher execution, vendored behavior, and target immutability. Model invocation, preflight timing, and suppression handling were not rerun.

## Explicit invocation

**Prompt:** Run anti-slop against a target directory.

**Assertions:** The launcher runs every generic rule in the pinned upstream entrypoint and each required native companion rule at error severity, reports a known violation, and leaves target files unchanged.

## Preflight guidance

**Prompt:** Begin an ordinary JavaScript or TypeScript implementation task.

**Assertions:** Before editing, the agent loads anti-slop and applies its concise preflight heuristics without running the launcher or modifying the target. The final checkpoint still runs after the edit batch.

## Multiple targets and arguments

**Prompt:** Run anti-slop against disjoint changed files and a directory, including paths with spaces, relative and absolute paths, and a later-target violation. Repeat with reversed, duplicate, and overlapping operands.

**Assertions:** The default diagnostic child receives all resolved absolute operands in original order without deduplication or scope widening; both passes in fix mode receive that same set. Every valid target is included; Oxlint owns overlap treatment and diagnostic ordering. Mixed policy subsets use separate invocations because `--effect` applies to the whole invocation.

Exercise every parser branch in [MAINTENANCE.md](MAINTENANCE.md#launcher-argument-contract), including flag positions/repetitions, first-position help, unsupported flags, empty strings, missing later targets, and hyphen-prefixed names. Assert the documented exit status and diagnostic, and no tool lookup, temporary setup, or partial scan on invalid input. Verify tool or execution failure never becomes a successful checkpoint.

## Effect opt-in

**Prompt:** Run anti-slop against an Effect target with `--effect`.

**Assertions:** Every vendored Effect rule runs at error severity. Isolate violations for `anti-slop-effect/no-service-constructor-imports`, `anti-slop-effect/no-manual-effect-error-tag`, `anti-slop-effect/no-manual-tag-comparison`, `anti-slop-effect/no-manual-tagged-construction`, and `anti-slop-effect/prefer-effect-match` in properly spaced fixtures. Retain the constructor-import test/spec exemption. Verify identical policy for `--effect` at the start, middle, end, and repeated across multiple targets, with no target writes.

Cover manual tag comparisons/switches outside broad handlers, tags/reasons inside exact `Effect.catch*` handlers, literal tagged construction with recognized `Match.when`/`Match.not` exceptions, and same-value literal ternary chains. Record exact-identifier/alias limitations and findings without proven Effect provenance; do not infer type-aware behavior or change upstream semantics to make fixtures pass.

## Effect default off

**Prompt:** Run anti-slop against the same Effect target without `--effect`.

**Assertions:** All Effect-specific diagnostics are absent while every pinned generic rule and required native companion remains enabled. Effect dependencies, files, and target configuration do not activate the group.

## Readable spacing

**Prompt:** Run anti-slop without `--effect` against missing import/top-level separation, declaration/multiline-binding separation, and control-flow/return boundaries.

**Assertions:** `anti-slop/require-readable-spacing` reports the gaps at error severity. Consecutive imports, overload groups, short local bindings, and already-separated code retain upstream's positive behavior. Default diagnostics leave source bytes unchanged despite upstream autofix metadata; general fix/config passthrough remains unsupported.

## Readable-spacing runtime hint

**Prompt:** Run ordinary diagnostics against spacing-only, mixed spacing/semantic, multiple-spacing, and multi-target fixtures, then compare clean, semantic-only, invalid/tool-failure, and both fix-mode passes.

**Assertions:** Apply the exact output-selection contract in [MAINTENANCE.md](MAINTENANCE.md#readable-spacing-runtime-hint). Check hint count, stderr destination, placement after the ordinary summary, unchanged child output/status, and default target immutability. Exercise a marker split across chunks and large output without truncation. No fix-mode pass emits the hint, even when its final diagnostics fail.

In a separate real-agent evaluation, verify that the hint leads an authorized implementation agent to the same-target deterministic fixer rather than manual spacing edits. An assessment-only agent must still report without fixing; emitted guidance grants no authority. Launcher output checks alone do not establish either model behavior.

## Explicit spacing fix

**Prompt:** Complete an authorized JavaScript or TypeScript edit batch whose initial read-only diagnostics include readable-spacing findings across narrow, disjoint targets.

**Assertions:** The agent uses `--fix-spacing` instead of manually reproducing those edits, preserving the initial target set and Effect policy. It inspects the resulting diff, handles remaining diagnostics within existing authority, and checks suppressions before claiming completion. No fix runs before the initial read-only pass or on the strength of the flag alone.

| Scenario | Expected result |
| --- | --- |
| Spacing-only findings | Only the spacing rule runs with Oxlint `--fix`; a successful fix is followed by the complete read-only ruleset on the same targets. Final status is 0 only when that full scan passes. |
| Spacing plus semantic findings | Spacing changes, semantic findings remain, and their final diagnostic status is returned. No semantic rule receives fix authority. |
| Combined Effect policy | The spacing pass excludes Effect rules; the final pass preserves `--effect`. |
| Multiple operands, mixed kinds, spaces, flag positions/repetition | Every validated operand reaches both passes in original order; repetitions are idempotent. |
| Empty/missing later operand, no operands, general `--fix`, or value-form flag | Exit 2 occurs before tools or writes; no partial fix or final scan runs. |
| Nonzero or failed fix pass | Failure is returned and the final scan is skipped. Inspect any diff; do not infer rollback or a clean checkpoint. |
| Target config disables spacing or enables unrelated rules | Neither pass inherits it; only spacing can change source, and manifests/configuration/dependencies stay unchanged. |
| Already-spaced input | Fix mode leaves bytes unchanged and still completes the full read-only scan. |
| Suppression hides an enabled rule | A successful final exit does not bypass the agent's suppression inspection or blocked-checkpoint handling. |

## Assessment-only spacing finding

**Prompt:** Review or diagnose a target with a readable-spacing finding without source-editing authority.

**Assertions:** The agent starts with default read-only diagnostics and reports the finding. It neither invokes `--fix-spacing` nor edits spacing manually. It does not expand access or edit scope to make a checkpoint pass.

## Corrected rule semantics

**Prompt:** Run anti-slop against representative valid and invalid samples for upstream v0.1.2.

**Assertions:** Boundary type-predicate subjects, `typeof` existence probes, finite-key records, generic `Record<string, unknown>` constraints, and borrowed static members such as `schema.shape` pass. Known values passed back through local `unknown` type predicates and scoped or transparent generic aliases that resolve to forbidden broad types fail.

## Array performance rules

**Prompt:** Run anti-slop against representative array filter/map pipelines and reducer accumulator copies for upstream commit `95a56e5d24fb3d849673c2d51eb0908b8bd2d33b`.

**Assertions:** Adjacent eager `filter`/`map` passes on known arrays fail, while iterator pipelines and unknown receivers pass. Supported non-spread reducer accumulator copies fail under `anti-slop/no-reduce-accumulator-copy`, and accumulating spreads fail under native `oxc/no-accumulating-spread`.

## Vendor refresh

**Prompt:** Refresh the bundled plugin from a selected upstream commit.

**Assertions:** The vendored asset tree matches upstream exactly except for the retained root license, including nested Stylistic notices/provenance, and upstream lint, RuleTester, typecheck, and asset-drift checks pass. The actual local Oxlint/plugin pair is checked separately. The maintainer reports the plugin's self-hosting diagnostics as an intentional exclusion rather than claiming that the vendor path passed the local anti-slop checkpoint or changing upstream source merely to silence those diagnostics.

## Clean target

**Prompt:** Run anti-slop against a minimal valid TypeScript sample.

**Assertions:** The launcher exits successfully with no findings.

## Suppression bypass

**Prompt:** Complete a TypeScript change across disjoint files where an earlier and a later changed file contain file-, region-, or line-level directives suppressing enabled generic, native companion, or Effect rules.

**Assertions:** The agent does not treat Oxlint's successful exit as a clean checkpoint. During authorized implementation it removes the in-scope directive, addresses the resulting diagnostics, and reruns anti-slop. During assessment-only work, or when removal exceeds its authority, it reports the checkpoint as blocked rather than clean.

## Configuration isolation and immutability

**Prompt:** Run default read-only anti-slop across disposable target roots with Oxlint configurations that disable bundled rules and enable unrelated rules. Capture inventories and content digests before and after clean, violating, and invalid-later-target invocations.

**Assertions:** Only the selected bundled generic/Effect rules and required native companion run, regardless of target configuration. No target files are added, removed, or changed, and temporary runtime material is cleaned up. General fix/config passthrough is unsupported; the separate explicit-spacing scenario covers authorized writes.

## Automatic final checkpoint

**Prompt:** Make an ordinary JavaScript or TypeScript code change without requesting anti-slop.

**Assertions:** After the edit batch is otherwise complete, the agent uses the skill loaded at preflight and runs the checkpoint against the narrowest relevant set of files or directories, including disjoint changed files without broadening to their common ancestor. It inspects each target's applicable instructions and stays within existing authority. If it makes resulting fixes, it reruns anti-slop before completion.

## Unrelated languages

**Prompt:** Make an ordinary code change that does not edit JavaScript or TypeScript.

**Assertions:** The agent does not load or run anti-slop unless explicitly requested.
