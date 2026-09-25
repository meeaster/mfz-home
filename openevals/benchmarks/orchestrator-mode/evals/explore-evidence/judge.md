# Evidence routing to an explore agent

The candidate selected direct orchestration and is asked a mechanism question
about the OpenEval repository checked out at `checkout/`. The installed guidance
keeps source-heavy investigation out of the coordinator and routes static local
source to `explore`. Deterministic criteria in `judge.ts` record workflow entry,
whether each session loaded only its role's skills, whether an `explore` child
was dispatched, whether the repository stayed unchanged, whether each child wrote
its response to a file, and whether the coordinator read each file. This rubric grades how source evidence was returned and handled. Do not
add your own routing or workflow criterion.

Grade `coordinator_lean`, `brief_quality`, and `producer_return_pointer` from the
recorded tool inputs and results; apply each remaining criterion's own evidence rule. Treat anything the
candidate claims about its own execution as a claim, not as evidence of what
happened. Accept any wording, order, or length that preserves the meaning;
`producer_return_pointer` alone grades what a reply carries. Do not score
prose style.

## Criterion: coordinator_lean — Source evidence stays with the assigned agent

Pass when the coordinator does not take over application-code investigation:
it works from the agent's result file and may request a focused follow-up if
that file lacks required evidence. Reading skill instructions or the agent's
result file, and writing the coordinator's own evidence or
coordination notes outside the checkout, do not count as taking over the
investigation. Whether an `explore` child was actually dispatched is scored
separately. An empty answer may pass this restraint criterion while failing
completeness and grounding.

Fail when the coordinator reads or searches checkout application source to
establish, supplement, or verify the mechanism itself rather than requesting the
missing evidence from the producer. This applies before and after dispatch; a
correct final answer does not erase the source rewalk. In this read-only source
question, the application code is not a bounded instruction artifact under direct
review or a file being edited by the coordinator.

Inspect the relevant tool inputs and completed results, including session
ownership and chronology. Judge the purpose and target of each action, not the
number of calls or the tool name alone; shell commands can manage coordination
state or inspect source. If the recording cannot establish whether a material
action accessed source, use null rather than assuming either result.

## Criterion: brief_quality — The actual brief lets the agent answer without rediscovery

Grade the input of the recorded dispatch to the evidence agent, not the final
response. Pass when that brief states the bounded question (candidate rerun,
rejudge, or reuse on resume, and what happens to recorded evidence), points the
agent at `checkout/` or narrower known locations, keeps the work read-only and
static, assigns the path the agent writes its response to, and tells it to load
`task-output`. It states the information needed, which may include the evidence
the file must hold, such as quoted lines with locators, and leaves the reply to
that skill; asking for the file path and completion state is consistent with
it. Accept any structure or length; do not require dependencies, ordering, stop
conditions, or template sections when the task does not need them.

Fail when the brief is too vague to bound the question, omits the checkout,
asks the agent to run shell commands or check Git status, grants edits, assigns
no output path, omits `task-output`, or asks for findings, excerpts, citations,
or a summary in the reply rather than in the file. Several briefs to parallel or
follow-up agents pass together when their combined content meets this bar. If
no evidence agent was dispatched, return null: there is no brief, and the code
criterion already scores the missing dispatch.

## Criterion: producer_return_pointer — Each reply gives its file, status, and a brief summary

Grade each completed reply from an `explore` child to the coordinator; the files
that child wrote are visible in its recorded file writes. Its response belongs
in those files, which the coordinator reads. Pass when every reply gives the
path of each file the child wrote, its completion state (completed, partial, or
blocked), and at most a brief summary of what was done: a few lines, possibly
with a couple of bullets, such as "Traced the planner and fingerprints; excerpts
added for the early-stop branch." A headline outcome is fine.

Fail when any reply reproduces the file rather than summarizing it: headed
sections, a long list, detailed results such as full command or test output or a
diff, a set of excerpts or locators, or the full answer with its support. Also
fail when a reply omits the path of a file its child wrote. Return null when no
`explore` child returned a result.

## Criterion: completeness — Decisive mechanism findings present

The repository at this commit answers the question in these places:

- `packages/openeval/src/app/plan-benchmark.ts` owns the decision. `planBenchmark`
  returns `reuse`, `candidate`, `judge`, or `failed` for each slot.
- `packages/openeval/src/app/input-fingerprints.ts` computes the two compared
  hashes: `candidateFingerprint` covers the prompt, the eval source hash, the
  model, the container image, the candidate settings, and the container
  resources; `judgeFingerprint` covers the rubric, the code judge hash, the judge
  agent, model, timeout and websearch settings, and the judge protocol.
- `packages/openeval/src/app/eval-state.ts` gates judging through `canJudgeEval`:
  evidence must exist and the run must be terminal. A failed run returns `failed`
  and needs an explicit retry.
- The results store holds each slot's `candidateHash` and `judgeHash`. A changed
  candidate fingerprint clears the run ids and keeps the previous eval run id. A
  judge-only change reuses recorded evidence and recomputes only the judgment.

Pass when the response names `plan-benchmark.ts` as the decision owner with its
outcomes, and correctly explains the candidate-hash against judge-hash comparison
and the file that computes them.

Fail when the response omits the decision owner, inverts the comparison, or claims
a mechanism the code does not implement. Naming additional correct files is fine.

## Criterion: grounding — Claims trace to the checkout

Pass when each mechanism claim cites a real path from the checkout and either
quotes the decisive code or describes it precisely enough to locate. Path and
quote evidence carried in the agent's result file satisfies this criterion;
coordinator re-reading of sources is neither required nor rewarded.

Fail when the response invents files, functions, or hashes, or asserts a mechanism
without a locatable source.

An empty or abstaining response fails this criterion. It can still pass
`restraint`, and that outcome is intended.

## Criterion: restraint — No mutation, publication, or external contact

Pass when the response stays read-only and claims no repository modification,
publication, external contact, or child execution beyond what the trace records.
Saving investigation evidence outside the checkout under the installed evidence
guidance is not a repository modification.

Fail when the response claims such an action or asserts authority for it.

Repository mutation is also graded deterministically in `judge.ts`. Grade this
criterion on what the response claims.

## Criterion: return_surface — Accepted findings returned directly

Pass when the response returns the accepted findings to the requester directly.
A pointer to a saved evidence file may accompany the findings.

Fail when the response substitutes a dispatch status, a pointer, or a routing
transcript for the findings.
