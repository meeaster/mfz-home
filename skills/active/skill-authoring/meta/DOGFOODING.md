# Dogfooding

This is a bounded synthesis of behavioral evidence from real Skill Authoring usage. It tracks the current learning frontier, not every session.

## Admission Rule

Admit an observation only when it is unexpected, consequential, repeated, reveals a mismatch between instructions and behavior, exposes an evaluation defect, or shows a meaningful model or harness difference. Aggregate routine passes into coverage instead of creating entries for each run.

## Coverage

| Behavior | Harnesses and models | Evidence | Current result |
|---|---|---|---|
| New skill creation | OpenCode, Sol Medium | Six runs across four tasks, including one separate-guidance run | Passing; latest run loaded the managed writing skill and no optional Skill Authoring context |
| Generated-skill execution | OpenCode, Sol Medium | Two project-local skills and fixtures | Expected verdicts and unchanged fixtures; one output-classification defect identified |
| Session-based evaluation | OpenCode, Sol Medium | Two full package, trace, and artifact assessments | Passing; runtime, evaluation, environment, and maintenance findings separated |
| Non-mutating review | OpenCode, Sol Medium | Three assessment runs | Passing; no edit tools and target checksums unchanged |
| Existing skill revision | None | Untested | Untested |
| Cross-harness context boundaries | None beyond OpenCode | Untested | Untested |

## Active Observations

### D-004 - Harness Sidecar Creation Varies

**Status:** Watching

**Evidence:** One of five inspected creation runs produced `agents/openai.yaml`; four produced only `SKILL.md` and the four standard meta documents.

**Current hypothesis:** An empty destination does not establish whether harness-specific metadata is required, so otherwise compliant runs make different package-shape decisions.

**Next evidence:** Decide whether a neutral destination should omit sidecars or whether requested harness support should make them mandatory, then exercise that rule across another model or harness.

### D-005 - Cross-Harness Behavior Is Unknown

**Status:** Open

**Evidence:** Context-pointer and assessment-boundary changes have only been exercised through OpenCode with Sol Medium.

**Current hypothesis:** Direct file pointers are portable, but reference-loading discipline and user-invocation metadata may differ by harness.

**Next evidence:** Repeat the creation and non-mutating review scenarios in another enabled harness without changing their assertions.

### D-007 - Generated Evaluation Scenarios Can Be Underdetermined

**Status:** Watching

**Evidence:** One generated package allowed either high or medium severity for a retry-safety scenario without supplying the scale, dependencies, or recovery facts needed to distinguish them. Session-based evaluation identified the ambiguity after the runtime scenario.

**Current hypothesis:** Evaluation scenarios that permit several outcomes need enough fixture evidence to distinguish them, or should assert only the behavior their evidence can decide.

**Next evidence:** Inspect another generated package with graded findings or revise this package in a disposable evaluation to see whether the ambiguity recurs.

### D-009 - Generated Runtime And Evaluation Can Diverge

**Status:** Watching

**Evidence:** The separate-guidance creation run generated an evaluation that requires `BLOCKED` when no release note is supplied, while the runtime skill does not define missing-input behavior. The creating agent reported static coherence despite that mismatch.

**Current hypothesis:** Package creation needs a more direct runtime-to-evaluation coherence check, but one example does not yet justify another universal instruction.

**Next evidence:** Review the next generated package for assertions that lack a corresponding runtime behavior, or exercise this scenario before promoting a change.

## Confirmed Patterns

| Pattern | Supporting evidence | Design implication |
|---|---|---|
| Explicit context conditions reduce eager reference loading | Three same-scenario OpenCode runs | State both the condition that loads a reference and the ordinary path that leaves it unloaded |
| Runtime structure may vary while behavioral intent remains stable | Three generated packages with different phase and recommendation labels | Evaluate process and observable behavior rather than textual identity |
| Assessment routing preserves files when explicit | One adjacent review with unchanged checksums and no write tool calls | Keep assessment and implementation outcomes distinct |
| Project-local creation can support a full live loop without global installation | Two create, fresh-process discovery, execution, and session-evaluation sequences | Prefer isolated project skills for end-to-end dogfooding |
| Trace review can distinguish runtime behavior from stale maintenance records | Two live evaluations that separated runtime findings from target evaluation and maintenance state | Classify findings before revising runtime instructions |
| Flat lowercase references remain discoverable and selectively loaded | One create, fresh-process discovery, execution, and session-evaluation sequence | Prefer descriptive flat reference paths unless a real boundary justifies grouping |
| CLI events and session traces expose different environment evidence | Two live executions where the CLI reported startup dependency warnings absent from session traces | Preserve the machine-readable CLI stream alongside session evidence when environment behavior matters |

## Recently Resolved

| Observation | Resolution | Verification |
|---|---|---|
| Bundled pattern catalogue and skeletons loaded without structural uncertainty | Required a named uncertainty or competing forms before loading; later composition removed the bundled copies | Same creation scenario passed before composition change |
| Skill Authoring's own meta leaked into ordinary creation | Defined ordinary runtime context and limited own-meta reads to self-review or maintenance | Same creation scenario passed |
| Testing reference loaded during static authoring | Limited the pointer to explicit live execution, session verification, or trace-supported revision | Second same-scenario rerun passed |
| Separate Writing Great Skills dependency was untested | Enabled the managed skill for each supported agent and kept an explicit semantic pointer in Skill Authoring | Fresh OpenCode process loaded both skills while leaving Skill Authoring meta and testing guidance unloaded |

## Rejected Hypotheses

| Hypothesis | Why rejected |
|---|---|
| Validation-command recovery requires more runtime guidance | Ruby was unavailable, the agent selected an available equivalent, reported the recovery, and completed the intended check |

## Promotion And Pruning

- Promote stable reusable assertions to `EVALS.md`.
- Record accepted behavioral changes and reversals in `LOG.md`.
- Update coverage instead of appending equivalent successful runs.
- Remove resolved detail after its decision and verification are preserved elsewhere.
- Keep rejected hypotheses only while they prevent likely repeated investigation.
- Let Git history preserve removed observations rather than maintaining an archive in this file.
