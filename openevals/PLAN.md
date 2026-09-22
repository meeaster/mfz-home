# Orchestrator Mode evaluation plan

Build a small, repeatable OpenEval suite for Orchestrator Mode. Start with one baked-in scenario, then add coverage only when a real behavior gap or regression justifies it.

## Goals

The suite should test Orchestrator Mode in two controlled environments:

- `minimal` loads the instructions, skills, tools, and references that Orchestrator Mode needs to work. It excludes unrelated Personal configuration.
- `personal` derives from the Personal profile and runs in an isolated, sanitized environment. It must not read credentials, browser profiles, private knowledge, or live host state.

Both environments must be built from the canonical `mfz-home` source. The benchmark must not embed copies of skill or instruction contents in its setup code.

## Initial scope

The first benchmark covers only the `baked-in` topology. It does not compare prose with structured instructions, test `chief/split`, or evaluate the full Orchestrator Mode contract.

The first scenario should be a small read-only coordination task with one bounded evidence-producing unit. The user explicitly selects `/orchestrate`. The candidate must coordinate the unit in the current session rather than create a standing gateway.

The first scenario checks these observable results:

- The current session uses baked-in mode.
- The current session dispatches the smallest adequate specialist directly.
- The current session owns the assignment state and return surface.
- The child brief contains the correctness-critical task, scope, output, and boundaries.
- The coordinator waits for required results and accepts the returned packet.
- The coordinator does not infer authority for publication, external writes, or unrelated work.
- The final result reports the checked outcome without exposing unnecessary routing mechanics.

If OpenEval cannot exercise the command surface or child dispatch reliably, begin with a read-only interpretation eval. Treat successful live dispatch as a separate feasibility result rather than assuming that the final response proves it happened.

## Environment design

Environment setup describes source paths, profile names, and overlays. It does not contain runtime instruction text.

The materializer should:

- Resolve the selected profile from a pinned `mfz-home` commit.
- Render or copy the selected global instructions, skills, commands, agents, references, and MCP definitions.
- Apply a benchmark overlay without changing the source profile.
- Copy the resulting files into the isolated OpenEval workspace and candidate configuration paths.
- Install only tooling declared by the environment manifest.
- Record the source commit, MFZ version, OpenEval version, selected profile, overlay names, and file digests.

Use OpenEval workspace fixtures and `eval.ts` preparation steps for container setup. Do not run the benchmark against the active Personal configuration.

### Minimal environment

The minimal environment is a controlled Orchestrator Mode test environment. It includes only the dependencies that the skill needs:

- The required global instruction set.
- `orchestrator-mode` and its required references.
- The command and agent definitions needed to exercise baked-in coordination.
- The tools and MCP definitions needed by the selected scenario.
- Deterministic permissions with external writes disabled.

The minimal environment is the first debugging target. A failure here is easier to attribute to the skill or the evaluation than a failure in the full Personal profile.

### Personal environment

The Personal environment is a sanitized materialization of the Personal profile. It includes the profile's relevant instructions, skills, commands, agents, tools, and MCP definitions, but it does not inherit live credentials or private runtime state.

Use the same first scenario in the Personal environment after the minimal environment passes. This comparison shows whether Personal context changes the behavior without changing the task or rubric.

## Proposed repository shape

Keep reusable setup separate from benchmark-specific scenarios:

```text
openevals/
  PLAN.md
  package.json
  pnpm-lock.yaml
  src/
    environment/
      types.ts
      presets.ts
      overlays.ts
      materialize.ts
      manifest.ts
  benchmarks/
    orchestrator-mode/
      benchmark.ts
      evals/
        baked-in-dispatch/
          prompt.md
          judge.md
          judge.ts
          eval.ts
          workspace/
  results/
```

`results/` is generated output and must remain ignored. Prompts, rubrics, fixtures, environment declarations, and reusable setup code are source files.

## Reusable TypeScript boundary

The shared environment code should expose a small declarative API. A benchmark selects a preset and adds an explicit overlay.

```ts
type EnvironmentName = "minimal" | "personal";

type EnvironmentSpec = {
  sourceHome: string;
  sourceCommit: string;
  profile: EnvironmentName;
  overlays?: string[];
};
```

The materializer owns filesystem copying, profile rendering, sanitization, digest generation, and preparation commands. Individual evals should not copy skill contents, edit profile files, or invent their own environment setup.

Skill variants for a later formatting experiment are an explicit overlay. Normal regression runs use the canonical `orchestrator-mode` source from `mfz-home`.

## Validation sequence

1. Pin `@hona/openeval` and verify the candidate runtime image.
2. Materialize the minimal environment without running a model.
3. Check that the expected instructions, skills, commands, agents, tools, and MCP definitions are present and that private material is absent.
4. Run the baked-in interpretation or dispatch feasibility test in the minimal environment.
5. Inspect the trace to confirm skill loading, reference reads, child dispatch, assignment ownership, and the return surface.
6. Run the unchanged scenario in the Personal environment.
7. Repeat the baked-in regression after a controlled Orchestrator Mode change.
8. Add the next scenario only after the first scenario has stable expectations and useful failure evidence.

## Later coverage

Add these as separate scenarios rather than expanding the first task:

- Chief/split gateway selection and ownership.
- Complexity without explicit mode selection.
- Dependent dispatch and background execution.
- Scoped waivers and permission denials.
- Producer packet acceptance and focused repair.
- Recovery after interruption or stale gateway state.
- Unauthorized publication or external-system boundaries.

The reusable expectations belong in the Orchestrator Mode authoring record. Run results, model costs, session identifiers, and traces belong in benchmark results or an explicitly retained report, not in `EVALS.md`.

## Acceptance bar

The first implementation is ready when both environment presets can be materialized without hardcoded instruction contents, the baked-in scenario can verify its intended execution path, and the result records enough provenance to reproduce the run.

Do not expand the suite because a scenario can contain more criteria. Add coverage when a new criterion protects a distinct behavior, a failure exposes a missing contract, or a profile difference requires separate evidence.
