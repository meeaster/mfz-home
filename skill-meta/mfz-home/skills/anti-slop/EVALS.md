# Anti-slop Evaluations

The scenarios below define the expected behavior. Historical adopted revisions remain in [LOG.md](LOG.md).

## Observed verification: 2026-09-09

Source and rendered launchers for upstream commit `95a56e5d24fb3d849673c2d51eb0908b8bd2d33b` were exercised directly with Oxlint 1.81.0 in disposable fixtures. A violating fixture produced the three expected array-performance diagnostics and retained the same file digest. A clean fixture passed without writes. The Effect fixture failed only with `--effect`, and the source launcher passed its own anti-slop checkpoint. Upstream `pnpm check` also passed with its pinned Oxlint 1.78.0 dependencies.

This verification covers launcher execution, vendored behavior, and target immutability. Model invocation, preflight timing, and suppression handling were not rerun.

## Explicit Invocation

**Prompt:** Run anti-slop against a target directory.

**Assertions:** The launcher runs every generic rule in the pinned upstream entrypoint and each required native companion rule at error severity, reports a known violation, and leaves target files unchanged.

## Preflight Guidance

**Prompt:** Begin an ordinary JavaScript or TypeScript implementation task.

**Assertions:** Before editing, the agent loads anti-slop and applies its concise preflight heuristics without running the launcher or modifying the target. The final checkpoint still runs after the edit batch.

## Effect Opt-In

**Prompt:** Run anti-slop against an Effect target with `--effect`.

**Assertions:** The launcher enables `anti-slop-effect/no-service-constructor-imports`, reports a known runtime constructor import, and leaves target files unchanged.

## Effect Default Off

**Prompt:** Run anti-slop against the same Effect target without `--effect`.

**Assertions:** The Effect-specific diagnostic is absent while all pinned generic rules remain enabled.

## Corrected Rule Semantics

**Prompt:** Run anti-slop against representative valid and invalid samples for upstream v0.1.2.

**Assertions:** Boundary type-predicate subjects, `typeof` existence probes, finite-key records, generic `Record<string, unknown>` constraints, and borrowed static members such as `schema.shape` pass. Known values passed back through local `unknown` type predicates and scoped or transparent generic aliases that resolve to forbidden broad types fail.

## Array Performance Rules

**Prompt:** Run anti-slop against representative array filter/map pipelines and reducer accumulator copies for upstream commit `95a56e5d24fb3d849673c2d51eb0908b8bd2d33b`.

**Assertions:** Adjacent eager `filter`/`map` passes on known arrays fail, while iterator pipelines and unknown receivers pass. Supported non-spread reducer accumulator copies fail under `anti-slop/no-reduce-accumulator-copy`, and accumulating spreads fail under native `oxc/no-accumulating-spread`.

## Vendor Refresh

**Prompt:** Refresh the bundled plugin from a selected upstream commit.

**Assertions:** The vendored asset tree matches upstream exactly except for the retained license, and upstream lint, RuleTester, typecheck, and asset-drift checks pass. The maintainer reports the plugin's self-hosting diagnostics as an intentional exclusion rather than claiming that the vendor path passed the local anti-slop checkpoint or changing upstream source merely to silence those diagnostics.

## Clean Target

**Prompt:** Run anti-slop against a minimal valid TypeScript sample.

**Assertions:** The launcher exits successfully with no findings.

## Suppression Bypass

**Prompt:** Complete an ordinary TypeScript change where the changed file contains a file-level `oxlint-disable` directive for one or more anti-slop rules.

**Assertions:** The agent does not treat Oxlint's successful exit as a clean checkpoint. During authorized implementation it removes the in-scope directive, addresses the resulting diagnostics, and reruns anti-slop. During assessment-only work, or when removal exceeds its authority, it reports the checkpoint as blocked rather than clean.

## Configuration Isolation

**Prompt:** Run anti-slop against a target containing an Oxlint configuration that enables unrelated rules.

**Assertions:** Diagnostics come only from the bundled anti-slop plugin and explicit passthrough flags.

## Automatic Final Checkpoint

**Prompt:** Make an ordinary JavaScript or TypeScript code change without requesting anti-slop.

**Assertions:** After the edit batch is otherwise complete, the agent loads anti-slop and runs it once against the narrowest path containing the changes. If it makes resulting fixes, it reruns anti-slop before completion.

## Unrelated Languages

**Prompt:** Make an ordinary code change that does not edit JavaScript or TypeScript.

**Assertions:** The agent does not load or run anti-slop unless explicitly requested.
