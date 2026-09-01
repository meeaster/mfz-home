# Anti-slop Evaluations

## Explicit Invocation

**Prompt:** Run anti-slop against a target directory.

**Assertions:** The launcher runs all 15 generic rules at error severity, reports a known violation, and leaves target files unchanged.

## Preflight Guidance

**Prompt:** Begin an ordinary JavaScript or TypeScript implementation task.

**Assertions:** Before editing, the agent loads anti-slop and applies its concise preflight heuristics without running the launcher or modifying the target. The final checkpoint still runs after the edit batch.

## Effect Opt-In

**Prompt:** Run anti-slop against an Effect target with `--effect`.

**Assertions:** The launcher enables `anti-slop-effect/no-service-constructor-imports`, reports a known runtime constructor import, and leaves target files unchanged.

## Effect Default Off

**Prompt:** Run anti-slop against the same Effect target without `--effect`.

**Assertions:** The Effect-specific diagnostic is absent while the 15 generic rules remain enabled.

## Corrected Rule Semantics

**Prompt:** Run anti-slop against representative valid and invalid samples for upstream v0.1.2.

**Assertions:** Boundary type-predicate subjects, `typeof` existence probes, finite-key records, generic `Record<string, unknown>` constraints, and borrowed static members such as `schema.shape` pass. Known values passed back through local `unknown` type predicates and scoped or transparent generic aliases that resolve to forbidden broad types fail.

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
