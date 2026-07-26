# Dogfooding

This is a bounded synthesis of behavioral evidence from real Skill Authoring usage. It tracks the current learning frontier, not every session.

## Admission Rule

Admit an observation only when it is unexpected, consequential, repeated, reveals a mismatch between instructions and behavior, exposes an evaluation defect, or shows a meaningful model or harness difference. Aggregate routine passes into coverage instead of creating entries for each run.

## Coverage

| Behavior | Harnesses and models | Evidence | Current result |
|---|---|---|---|
| New skill creation | OpenCode, Sol Medium | Four runs across two tasks | Passing after two pointer revisions |
| Generated-skill execution | OpenCode, Sol Medium | One project-local skill and fixture | Passing; expected recommendation and unchanged fixtures |
| Session-based evaluation | OpenCode, Sol Medium | One full package, trace, and artifact assessment | Passing; runtime and maintenance findings separated |
| Non-mutating review | OpenCode, Sol Medium | Two assessment runs | Passing; no edit tools and target checksums unchanged |
| Existing skill revision | None | Untested | Untested |
| Cross-harness context boundaries | None beyond OpenCode | Untested | Untested |

## Active Observations

### D-004 - Harness Sidecar Creation Varies

**Status:** Watching

**Evidence:** One of four creation runs produced `agents/openai.yaml`; three produced only `SKILL.md` and the four standard meta documents.

**Current hypothesis:** An empty destination does not establish whether harness-specific metadata is required, so otherwise compliant runs make different package-shape decisions.

**Next evidence:** Decide whether a neutral destination should omit sidecars or whether requested harness support should make them mandatory, then exercise that rule across another model or harness.

### D-005 - Cross-Harness Behavior Is Unknown

**Status:** Open

**Evidence:** Context-pointer and assessment-boundary changes have only been exercised through OpenCode with Sol Medium.

**Current hypothesis:** Direct file pointers are portable, but reference-loading discipline and user-invocation metadata may differ by harness.

**Next evidence:** Repeat the creation and non-mutating review scenarios in another enabled harness without changing their assertions.

### D-006 - Session Stores May Omit Harness Startup Noise

**Status:** Watching

**Evidence:** A project-local skill execution emitted a background dependency-install warning during OpenCode startup. The warning did not affect the run and was absent from the session's message and tool trace inspected by the evaluator.

**Current hypothesis:** Session archaeology proves in-session behavior but may not capture harness startup, discovery, plugin, or dependency events emitted only by the parent CLI process.

**Next evidence:** On another live evaluation, preserve the machine-readable CLI event stream alongside the session record and compare which environment events each surface captures.

## Confirmed Patterns

| Pattern | Supporting evidence | Design implication |
|---|---|---|
| Explicit context conditions reduce eager reference loading | Three same-scenario OpenCode runs | State both the condition that loads a reference and the ordinary path that leaves it unloaded |
| Runtime structure may vary while behavioral intent remains stable | Three generated packages with different phase and recommendation labels | Evaluate process and observable behavior rather than textual identity |
| Assessment routing preserves files when explicit | One adjacent review with unchanged checksums and no write tool calls | Keep assessment and implementation outcomes distinct |
| Project-local creation can support a full live loop without global installation | One create, fresh-process discovery, execution, and session-evaluation sequence | Prefer isolated project skills for end-to-end dogfooding |
| Trace review can distinguish runtime behavior from stale maintenance records | One live evaluation with all behavioral assertions passing and stale target evaluation metadata identified separately | Classify findings before revising runtime instructions |

## Recently Resolved

| Observation | Resolution | Verification |
|---|---|---|
| Pattern catalogue and skeletons loaded without structural uncertainty | Required a named uncertainty or competing forms before loading | Same creation scenario passed |
| Skill Authoring's own meta leaked into ordinary creation | Defined ordinary runtime context and limited own-meta reads to self-review or maintenance | Same creation scenario passed |
| Testing reference loaded during static authoring | Limited the pointer to explicit live execution, session verification, or trace-supported revision | Second same-scenario rerun passed |

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
