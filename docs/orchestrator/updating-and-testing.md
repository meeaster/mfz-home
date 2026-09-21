# Update and test Orchestrator Mode

Use this process when changing Orchestrator Mode's instructions. Refine a bounded scenario set until the behavior is acceptable, then test different scenarios without changing the candidate. Judge the decisions and briefs agents produce, not whether they agree with the explanation of the change.

This is maintainer guidance, not additional runtime material for every orchestrator session. [Skill Authoring](../../skills/active/skill-authoring/SKILL.md) owns authoring requirements and its [testing workflow](../../skills/active/skill-authoring/references/testing-workflow.md) owns general test mechanics. Use [session review](session-review.md) for a broader assessment of completed orchestration.

## 1. Establish the intended change

Read the current [skill](../../skills/active/orchestrator-mode/SKILL.md), affected references, and the target's authoring records. In the Personal knowledge repository, the record is `authoring-records/mfz-home/skills/orchestrator-mode/`:

- `VISION.md` preserves purpose, intended outcomes, and scope.
- `PRINCIPLES.md` guides authoring choices, including context economy, continuity, provider caching, and model-aware cost.
- `EVALS.md` contains scenarios and observable expectations.

Identify the observed problem and the behavior the human wants instead. Distinguish an instruction defect from a missing fact in the brief, a conflicting agent instruction, or an execution mistake. Resolve consequential uncertainty before editing. Discussion and review do not themselves authorize changes, activation, or experiments.

Keep the change small enough to assess. Prefer replacing unclear guidance at its owner over adding another warning. Examine the material a typical task actually loads; shortening the root file does not reduce context if every run reads all its references.

## 2. Define the test before editing

Choose contrasting cases that distinguish the desired judgment from a plausible shortcut. Record the expected decision and acceptable alternatives separately from the prompt sent to the test agent. Leave room for another defensible decision when the agent identifies a material fact that changes the tradeoff.

For continuity and artifact validation, useful contrasts include:

| Situation | Behavior to assess |
| --- | --- |
| Small revision, useful author context below the non-resumption limit, little browser history | Preserve useful continuity and assign validation clearly. |
| Author above the non-resumption limit, even with little work remaining | Start fresh in the same authorized role and transfer the remaining work; cache hits do not waive the limit. |
| Cheap inspector retains difficult reproduction state for a focused recheck | Weigh retained state and remaining work rather than impose a context cutoff. |

Fix the model, variant, scenario prompt, capability facts, response format, and allowed actions for a comparison. Record the skill revision or content digest and native session IDs. Use the human-selected model; resolve its exact available identifier before dispatch. The general-agent tests that established this process used `openai/gpt-5.6-sol` with the `medium` variant. That is a test configuration, not a permanent model requirement.

For a quick interpretation test, use fresh general subagents and allow only installed-skill and applicable-reference reads. Explicitly waive workspace-file creation and actual dispatch for this tabletop scope. This tests choices and briefs after loading the skill, not automatic invocation, application behavior, or successful delegation.

Scenario coverage must include both modes and mode selection: `/orchestrate` loads `baked-in`, `/orchestrate-chief` loads `chief/split`, and complexity alone selects neither mode.

## 3. Edit and activate the candidate

Inspect repository state and preserve existing work. Follow `mfz guide` and its skill routing before configuration changes. Edit canonical source rather than rendered files. Update affected authoring scenarios and records within the agreed scope; keep observed test results out of `EVALS.md`.

Check interacting references and agent definitions. A coordinator instruction assigning validation to an inspector can conflict with an author prompt requiring the author to render every revision. Reconcile the owning sources when authorized. If an experiment deliberately changes only `SKILL.md`, make the controlling rule explicit and report any broader reconciliation still needed. Accepted guidance belongs at its owning reference rather than remaining as competing root-level overrides. Skill wording does not change agent permissions or available delegation depth.

Run structural and diff checks. When activation is authorized, run plain `mfz apply`, check its reported changes, and verify the rendered skill matches the source. Use `mfz doctor` as required by the home workflow or when activation raises a health concern. Test the running installation through a fresh native subagent; a separate CLI process is unnecessary unless isolation or CLI behavior is the test subject.

## 4. Rerun the same scenarios

Use the exact previous scenario prompts with fresh general subagents on the same model and variant. Independent read-only cases can run in parallel. Keep expected answers out of their prompts.

A reusable tabletop prompt structure is:

```text
Read-only tabletop decision task. Explicitly select `baked-in` or `chief/split` and
load installed orchestrator-mode in the selected mode for human-facing coordination and read references whose triggers apply.
Only read-only skill and reference loads are permitted. Do not write files,
run commands, inspect real artifacts, or dispatch children in this test.

Return the next assignment decision, the exact brief to the chosen agent,
and any material uncertainty. Solve the scenario rather than review the skill.

Capability facts: [Actual or explicitly hypothetical permissions and depth.]
Scenario: [User goal, authority, current artifacts, retained context,
completed checks, unresolved work, and relevant constraints.]
```

Supply enough detail to make the intended decision possible. Do not turn missing fixture details into the subject of the test accidentally. If a scenario asks for exactly one reproduction sequence, a one-sequence stop is not evidence that the skill forbids useful investigation.

Compare the resulting brief as well as the role and session choice. Look for duplicate validation, unnecessary approval requests, lost design discretion, unsupported cost claims, and accidental authority expansion. A correct role choice can still produce a poor assignment.

## 5. Verify the traces and interpret the result

Check the actual model and variant, successful installed-skill load, relevant returned instruction text, reference reads, and any failed or unexpected tools. Verify prompt identity when claiming an unchanged-scenario comparison. Exclude reasoning bodies, secrets, and unrelated session content. Use bounded projections under `agent-sessions`; a full transcript audit is unnecessary for a small loading check.

Report what the evidence establishes. Source edits, successful activation, a tabletop choice, and completed execution are separate claims. Reference selection can vary even with identical prompts. One run per case can reveal an ambiguity but cannot establish a reliable success rate or isolate a sentence's causal effect.

If behavior misses the target, identify the mechanism before changing the text. Check the assignment, loaded references, role instructions, and permission limits. Rerun affected cases after a focused repair and retain nearby regression coverage. Avoid accumulating instructions to counter every awkward phrase in one response.

## 6. Test new scenarios without changing the candidate

Once the original set is acceptable, freeze the candidate and try previously unused situations. This checks whether the guidance supports the intended judgment beyond the cases used to refine it.

For the artifact-authoring change, the second set varied the important relationships:

- A substantial revision had a compact author with valuable design reasoning, testing whether size alone forced a fresh session.
- A new validation unit had a cheap inspector with large, obsolete context, testing whether price or cache hits overrode context fit.
- Conflicting clipping evidence required a targeted factual check, testing whether the agents preserved meaning and reused unaffected validation.

Judge new cases against expectations established before dispatch. If a new case drives another revision, it becomes part of the refinement set; it is no longer independent evidence for that revision. Do not change wording again merely because a response could be phrased better.

## 7. Test the handoff when that is the remaining uncertainty

After satisfactory decision tests, examine the next boundary. A fresh child receives its own role instructions and the actual brief, not the coordinator's full context. Check whether an author receiving the brief assigns routine browser work correctly, retains repair ownership, and handles disputed evidence without automatically repeating validation.

Use a read-only recipient simulation for interpretation questions. For actual execution, obtain the required authority and use an isolated disposable fixture under the applicable workspace rules. Inspect tool traces and artifacts to establish who edited, rendered, repaired, and rechecked. General-agent role simulation does not prove the real specialist has the necessary permissions or follows the same prompt stack.

## 8. Close with bounded claims

Summarize the changed files, source and activation state, tested scenarios, session locators, outcomes, costs when relevant, and remaining uncertainty. Include helper and verification costs when reporting the complete test cost. Keep scenario-call costs distinguishable from that total.

Treat provider cache reuse as variable and cached input as a continuing cost. Separate measured usage from estimated prices and hypothetical savings. Model-specific test configurations and retrospective cost measurements do not grant runtime model-selection authority. Test the explicit child non-resumption limit separately from discretionary continuity for other roles. A large context or a compaction event alone does not establish quality degradation.

Stop refining when the accepted cases and new cases support the intended decisions and no material defect remains. Preserve successful discretion and use ordinary work to gather the next evidence. Keep reusable expectations in `EVALS.md`; retain run details in the task report and native traces, with a separate durable report only when it has an authorized future use.
