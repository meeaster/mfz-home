# GLM preset port research

Research record for running the `glm` model preset under the maintained OpenEval
benchmark, including the failure chain, verified catalog facts, and the ranked
options to finish the port. Written 2026-09-22 after four pilot attempts;
empirically validated the same day (see "Empirical validation").

## Goal

One selectable preset that runs the whole orchestrator-mode benchmark on
Z.ai's coding plan:

- Candidate session and judge: `zai-coding-plan/glm-5.3#high`.
- Orchestrator: `zai-coding-plan/glm-5.3#high`.
- Every other agent role: `zai-coding-plan/glm-5.3-flash#high`.

The preset configuration itself is built, tested, and selected with
`bun src/select-preset.ts glm`. What is blocked is executing it: the evaluator
pins an OpenCode version whose model catalog did not yet know this model.

## Current state

- The evaluator is a pristine `@hona/openeval` 0.3.2 install plus one content
  patch (`patches/@hona__openeval@0.3.2.patch`): `runSession` polls
  `model.list` for up to 30 s until the catalog is non-empty, because the
  server reports ready before its catalog finishes loading.
- The active preset is `glm` (`selected-preset.json`, gitignored).
- **2026-09-22: the glm preset ran end to end and scored 6/6** on
  `explore-evidence` (candidate, orchestrator, and judge all
  `zai-coding-plan/glm-5.3` / `-flash` at `#high`, cost 0/0 on the coding
  plan). Two eval-prompt fixes were required first (see below).
- Eval prompts now inline the `/orchestrate` command expansion verbatim
  (command body, then `## User prompt`, then the task) instead of asking the
  model to "use" a slash command — the model cannot invoke commands; the
  client expands them into the user message. The prompts also require
  foreground-only dispatch after the first glm run ended its turn while
  background children were pending and was judged on a status update (3/6 on
  the superseded prompt). Scores are not comparable across that prompt change.
- Known runner boundary (unpatched): openeval finishes the session on the
  root's first terminal event and does not wait for background children.
  The prompt constraint routes around it. Also seen once: a ~15 min
  post-judge hang on sockets to a dead local port, which then self-recovered.


## The failure chain

Each attempt failed at a different layer; every root cause below is verified
against source or logs, not inferred.

1. **Model unavailable on 2.0.3.** `Model or reasoning variant unavailable:
   zai-coding-plan/glm-5.3#high`. The candidate server's `model.list` did not
   contain the provider/model. Auth was not the problem: the `zai-coding-plan`
   credential row is injected and `credentialsFor` passed.
2. **Readiness check failed on 2.0.12.** After bumping the image to
   OpenCode 2.0.12, the server booted but openeval timed out: 2.0.12 replaced
   the `GET /api/health` dispatch branch with `GET /api/info`
   (`infoResponse`: 503 while starting, 200 ready, 500 failed). The old poll
   hit the app router and got 404 `RouteNotFound` forever.
3. **Plugin activation route removed.** `POST /api/plugin/await-activation` →
   404 on 2.0.12. Bumping openeval's host-side `@opencode/client` and friends
   to 2.0.12 was the right response, but the next call still failed.
4. **Judge plugin-push API gone.** `client.plugin.awaitActivation is not a
   function`: the 2.0.12 client removed the operation entirely.
   `src/infra/judging/tools.ts` registers the judge tools
   (`submit_judging`, `continue_judging`) through `host.plugin({...})` and
   gates on the activation result — machinery that no longer exists in the
   2.0.12 SDK. This is where the attempt stopped: porting it is a redesign of
   the judge tool registration, not a patch.

Rollback: reverted the patch (version pin, runtime deps, health poll),
removed `overrides` / `minimumReleaseAgeExclude` / `patchedDependencies`,
and regenerated `pnpm-lock.yaml` (the old one was poisoned with
policy-rejected 2.0.12 resolutions).

## Verified catalog and version facts

- `@hona/openeval` 0.3.2 (latest, upstream HEAD `b969dc4`) pins
  `@opencode/server` 2.0.3 for the candidate image and 2.0.3 SDK packages
  host-side. The host machine runs OpenCode v2.0.12.
- The bundled 2.0.3 catalog lives at
  `@opencode/core@2.0.3/dist/chunks/mime-cvt7tjwh.js` (3.7 MB; the earlier
  "zero matches" claim grepped `dist/snapshot.js`, which is a different file
  and was wrong). The bundle contains `zai-coding-plan` with only `glm-4.7`,
  `glm-5-turbo`, `glm-5.2`, `glm-5.2-highspeed`, and `opencode-go` including
  `gpt-5.6-luna` — so luna resolving on 2.0.3 never proved live fetching.
  Live catalog updates are instead confirmed empirically: the booted 2.0.3
  server lists `glm-5.3`-family models that are absent from its bundle
  (container egress to models.dev verified, HTTP 200).
- The live `models.dev/api.json` (flat map keyed by provider id — there is no
  `.providers` wrapper; earlier probes failed on this assumption) now includes
  `zai-coding-plan` with `glm-4.7`, `glm-5-turbo`, `glm-5.2`,
  `glm-5.2-highspeed`, `glm-5.3`, `glm-5.3-flash`, `glm-5.3-highspeed`.
  `glm-5.3`: `reasoning: true`, `tool_call: true`, **no `variants` array**.
  Provider page: https://models.dev/providers/zai-coding-plan/
- `@opencode/ai@2.0.3` already ships the `zai-coding-plan` provider adapter
  (`dist/providers/zai-coding-plan.js`): routes chat to
  `https://api.z.ai/api/coding/paas/v4`, plus `/messages` (anthropic-compatible)
  and `/responses` endpoints, with a dynamic `model(modelID)` — no inline model
  list, so new models need no AI-layer change.
- Variants come from the catalog, not only from code: live models.dev carries
  `reasoning_options: [{type:"effort", values:["low","high","max"]}]` on
  glm-5.3, and the 2.0.3 server surfaces exactly those as
  `variants:[low,high,max]` with `reasoningEffort` settings (verified live).
  2.0.12's `variant.ts` glm-5.3 rule is a fallback default, not the source —
  `#high` resolves on 2.0.3 without any backport.
- The five glm attempt containers are retained
  (`workspace-9432d523…`, `workspace-3d1dfe1c…`, `workspace-3ba43ce7…`,
  `workspace-9e16c063…`, `workspace-d8469862…`) and are safe to remove.

## Implication and ranked options

The decisive fact, verified empirically (next section): the pristine 2.0.3
stack already enumerates `zai-coding-plan`/`glm-5.3` with the `#high` variant
and an active credential. The failed attempt ran before that state existed —
stale bundle plus live catalog that had not yet supplied glm-5.3, and/or a
validation race against catalog warmup. So:

1. **Retry as-is on the pristine 2.0.3 stack (no code changes).**
   `bun src/select-preset.ts glm`, then `retry`/`run --only-model
   "zai-coding-plan/glm-5.3#high"`. If the catalog fetch picks up the model,
   the whole preset works with zero patches.
2. **If a future model is missing again** (generic fallback): refresh the
   bundled catalog in the image's `@opencode/core@2.0.3` (Dockerfile `COPY`
   over `dist/chunks/mime-cvt7tjwh.js`; the runtime dir is patched territory
   already). A variant backport is unnecessary — the catalog carries
   `reasoning_options` and 2.0.3 maps them to variants.
3. **Full 2.0.12 port (upstream-scale, not local):** requires redesigning
   openeval's judge tool registration for the 2.0.12 plugin/API changes
   (`/api/info` readiness, await-activation removal, plugin-push removal).
   This belongs upstream in `Hona/openeval`; the failure chain above is the
   porting checklist.

Not viable: extracting the Z.ai API key into config files (secrets boundary).
The injected credential database already authenticates the integration once
the catalog enumerates the model.

## Empirical validation (2026-09-22)

Booted the 2.0.3 server manually inside the retained first-attempt container
and queried listing endpoints only — no LLM calls, no spend:

```sh
docker start workspace-9432d523-a092-458a-ae53-b790dcb4b6d4
docker exec --user dev --detach \
  --env OPENCODE_SERVER_PASSWORD=probe123 workspace-9432d523-…-b6d4 \
  sh -c 'exec timeout --signal=TERM --kill-after=5s 600s bun /opt/opencode/server.mjs \
         > /home/dev/.local/share/opencode/server.log 2>&1'
# then, inside the container (curl prompts for the OPENCODE_SERVER_PASSWORD value set above):
curl -s -u opencode http://127.0.0.1:4096/api/model
curl -s -u opencode http://127.0.0.1:4096/api/integration
```

Results:

- `GET /api/model` lists `zai-coding-plan/glm-5.3`, `glm-5.3-flash`, and
  `glm-5.3-highspeed`, each with `variants:[low,high,max]`,
  `status:"active"`, `enabled:true`, cost 0/0, 1M context. None of these
  exist in the bundled catalog, so the server used live catalog data.
- `GET /api/integration` shows `zai-coding-plan` with an active
  `credential` connection — auth is live, not merely injected.
- `gpt-5.6-luna` is **absent** from the list: the expired OpenCode Go
  subscription dropped the entitlement, confirming `model.list` is
  auth-filtered per provider.
- Gotcha: `/api/model` returned `data: []` for the first seconds after
  `/api/health` reported ready — catalog warmup finishes after readiness.
  A race like this may also have contributed to the original failure;
  openeval's session setup normally outlasts the warmup.

Conclusion: option 1 is fully unblocked — both `#high` refs in the glm
preset resolve on the pristine 2.0.3 stack.

## Operational lessons

- **pnpm patch dependency bumps are inert for resolution.** Changing deps in a
  patched package's `package.json` does not change what pnpm installs; version
  changes need `overrides` (pnpm-workspace.yaml). The patch still worked for
  file content (image build reads the runtime dir directly).
- **minimumReleaseAge gates everything:** the 2.0.12 suite (published
  2026-09-21) was rejected until `minimumReleaseAgeExclude: ["@opencode/*"]`
  was set. Removing it re-blocks any future bump attempt.
- **A killed runner leaves state behind:** the results `runner.db`
  `benchmark_runs` row stayed `state: "running"` and blocked new runs; it is a
  single JSON row — set it to `"stopped"` via sqlite. After a failed candidate
  the planner demands `openeval retry <run> <eval-run>` (new eval run id each
  retry) instead of auto-rerunning.
- **`--only-model` also defers stale slots:** switching presets changes
  `agent-models.json`, which changes the eval source hash, so the old preset's
  slots plan as "Candidate inputs changed". Scoping runs with `--only-model`
  avoids paying for unwanted re-executions.
- **Repository workspaces nest:** the checkout lands at
  `<workspace>/checkout/` with a bare `upstream.git` beside it; the overlay is
  copied into `checkout/`, and preparation runs there — hence the
  `configure-environment.ts` first argument pointing the project
  `opencode.json` at the workspace root.
- **Recorded evidence must stay out of builds:** results snapshots embed whole
  third-party checkouts; `tsconfig.json` excludes `benchmarks/**/results` and
  the test script passes `--path-ignore-patterns "**/results/**"`.
- **models.dev api.json is a flat provider map** (`.["zai-coding-plan"]`, not
  `.providers["..."]`) — verify fetches with `wc -c` before trusting a jq miss.
- **`explore` is a core built-in** (mode `subagent`, prompt, and permissions
  are set by OpenCode's `opencode.agent` plugin), so overriding its model via
  project config is safe; `configure-environment.ts` allowlists it explicitly.
- **Workspace containers idle at `sleep infinity`; the server is exec'd on
  demand** (`--user dev`, `OPENCODE_SERVER_PASSWORD`, `bun
  /opt/opencode/server.mjs`, port 4096, Basic auth `opencode:<password>`).
  Manual probing is safe: listing endpoints (`/api/model`,
  `/api/integration`) make no LLM calls.

## Where things live

- Preset system: `presets.json`, `src/presets.ts`, `src/select-preset.ts`,
  `src/presets.test.ts`, `src/select-preset.test.ts`,
  `benchmarks/orchestrator-mode/benchmark.ts`, both evals'
  `.openeval/agent-models.json` (rewritten by select-preset),
  `selected-preset.json` (gitignored).
- Judge/binding changes: `configure-environment.ts` in both evals (kept
  byte-identical by `src/environment/fixture-sync.test.ts`),
  `src/environment/agent-models.test.ts`.
- Results: `benchmarks/orchestrator-mode/results/2026-09-22T02-24-41.298Z-8d6f009f`
  (runner.db, eval-runs, judge-runs, inputs, `maintenance/snapshots/luna-pilot.json`).
- Extracted reference material (disposable): `/tmp/opencode/ai203` and
  `/tmp/opencode/srv203` (2.0.3 tarballs), `/tmp/opencode/modelsdev.json`
  (catalog snapshot used for the facts above).

## Next steps, in order

1. Renew the OpenCode Go subscription to restore `gpt-5.6-luna` (it is
   entitlement-gated and currently absent from `model.list`).
2. Grow coverage gradually on the working glm stack: add repetitions, then the
   `baked-in-dispatch` eval, then further evals.
3. Optional hardening: a fixture-sync-style test asserting each eval prompt's
   command paragraph matches `commands/orchestrate.md` (the prompts embed a
   copy of the expansion); and a bounded "wait for background children"
   improvement in the runner patch if background-dispatch behavior is ever
   measured deliberately.
4. Keep the 2.0.12 port notes above for an upstream issue/PR against
   `Hona/openeval` — that is the durable fix for depending on a current
   OpenCode.
