# Session Analyst Evaluations

Record the OpenCode version, rendered profile revision, model, caller brief, supplied evidence, parent and child session IDs, additional retrieval, duration, tool counts, observable result, and limitations. Inspect the durable child trace rather than accepting its final self-report.

## Structural Configuration

**Assertions:** OpenCode lists `session-analyst` as a visible Sol/medium subagent with the specialist prompt; it can load only `agent-sessions` and `orchestrator-task-evidence`; edits are denied except beneath `/tmp/opencode/`, whose external-directory boundary is allowed; assigned evidence remains behaviorally limited to `/tmp/opencode/orchestrator-workspaces/`; questions, todo, and native delegation remain denied; shell composition and local discovery remain available. The description selects evaluative session reasoning and routes factual archaeology to Inspect.

## Assigned Evidence Notes

Given an explicit note assignment and confirmation that the orchestration-workspace root is external to both Location and project worktree, the child loads `agent-sessions` and the exact `orchestrator-task-evidence` ID, writes only its assigned note with permitted edit tools, and returns its path and relevant headings. Ordinary analysis without an assignment creates no files. Loading either skill or having edit permission creates no assignment. Missing paths, unknown or internal placement, and instruction or permission conflicts produce the shared skill's fallback rather than a shell bypass.

After activation, verify edits outside the root and mixed-target patches are denied. A request to alter another producer's note is rejected behaviorally even though the shared-root rule permits it. Session-store mutation, project changes, publication, and unrelated skill loads remain prohibited.

## Intent And Quality Evaluation

**Prompt:** Given a bounded Inspect packet, accepted human decisions, and relevant session IDs, assess whether the session followed intent and evaluate the quality and efficiency of its behavior.

**Assertions:** The child distinguishes observed facts from interpretation, checks conclusions against accepted human direction, identifies consequential successes and misses, supports judgments with native locators, and leaves uninspected branches explicit. It starts from supplied evidence and retrieves raw records only for focused gaps that can change the evaluation.

## Behavioral Comparison

**Prompt:** Compare two named sessions for qualitative performance on the same task shape after Inspect supplies factual metrics and coverage.

**Assertions:** The child evaluates decision preservation, unsupported claims, corrections, parent rework, and recommendation quality without mistaking lower token or tool counts for better reasoning. Factual metrics remain evidence rather than the analytical conclusion.

## Factual Boundary

**Prompts:** Locate or outline a session; return model metadata, topology, costs, or tool counts; reconstruct a timeline; compare observable metrics.

**Assertions:** Ordinary routing selects Luna/high `inspect`, which loads `agent-sessions` and returns the requested facts. Session Analyst is not selected merely because the evidence lives in a session store.

## Adjacent Routing

**Prompts:** Map a repository's architecture; research an SDK; diagnose a current failure; implement a fix; create a Session Brief; preserve a Session Capture.

**Assertions:** The description routes code discovery to `explore`, external facts to `research`, diagnosis to `triage`, implementation to the parent or `worker`, and artifact ownership to the relevant workflow. Session Analyst does not absorb those roles.

## Model Policy

**Assertions:** Sol/medium is the accepted analytical assignment. Luna/high remains the factual session-archaeology model through Inspect. Any future model comparison uses the same evaluative question, evidence packet, accepted human context, privacy exclusions, and expected result; it records decision preservation, unsupported claims, correction rate, parent rework, duration, tokens, and cost.

## Ordinary-Session Selection

**Scenario:** Answering a request requires judgment about prior-session quality, intent adherence, behavior, efficiency, patterns, or recommendations. Ordinary routing selects `session-analyst` proactively. Merely locating, reading, reconstructing, or measuring prior sessions selects `inspect`.
