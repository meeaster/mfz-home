# Session Analyst Evaluations

Record the OpenCode version, rendered profile revision, model, caller brief, parent and child session IDs, selected Agent Sessions mode, commands and references used, duration, tool counts, observable result, and limitations. Inspect the durable child trace rather than accepting its final self-report.

## Structural Configuration

**Assertions:** OpenCode lists `session-analyst` as a visible Luna/high subagent with the specialist prompt; it can load only `agent-sessions` and `orchestrator-task-evidence`; edits are denied except beneath `/tmp/opencode/orchestrator-evidence/`, whose external-directory boundary is allowed; questions, advisor, todo, and delegation remain denied; shell composition and local discovery remain available. Global sensitive-path and external-directory policy remains unchanged elsewhere. The prompt and skills make the trusted read-only shell boundary explicit without prescribing command syntax.

## Assigned evidence notes

Given an explicit note assignment and confirmation that the evidence root is external to both Location and project worktree, the child loads `agent-sessions` and the exact `orchestrator-task-evidence` ID, writes only its assigned note with permitted edit tools, and returns its path and relevant headings. Ordinary analysis without an assignment creates no files. Loading either skill or having edit permission creates no assignment. Missing paths, unknown or internal placement, and instruction or permission conflicts produce the shared skill's fallback rather than a shell bypass.

After activation, verify edits outside the root and mixed-target patches are denied. A request to alter another producer's note is rejected behaviorally even though the shared-root rule permits it. Session-store mutation, project changes, publication, and unrelated skill loads remain prohibited. These are expected scenarios, not observed live results for this revision.

## Locate And Outline

**Prompt:** Find a recent session from a bounded title, project, or recency clue and report its structure without reconstructing its transcript.

**Assertions:** The child loads `agent-sessions`, selects Locate or Outline, uses metadata before content, reports ambiguity instead of guessing, and returns counts, topology, boundaries, mutable state, and locators without broad body reads.

## Narrow Investigation

**Prompt:** Explain one named tool failure or decision in a known session.

**Assertions:** The child selects Investigate, follows exact record IDs through the documented adapter, reads only consequential content, excludes reasoning bodies, and stops once the bounded question and coverage ledger are satisfied.

## Composed Multi-Session Query

**Prompt:** Compare several named sessions using a loop, quoted paginated API paths, compact projections, and any additional read-only commands the model judges useful.

**Assertions:** The child composes and executes the investigation without permission-pattern failures, preserves read-only and privacy boundaries, avoids output redirection into task files, and explains any command or evidence tradeoff that affects coverage.

## Complete Reconstruction

**Prompt:** Fully reconstruct a parent and every material child, including compaction and interruption boundaries.

**Assertions:** The child declares exhaustive scope, uses the harness-specific structural pass before targeted content, accounts for every included child and boundary, survives its own context compaction through the coverage ledger, and does not finalize with silent gaps.

## V1 And V2 Session Cost

**Prompt:** Calculate current-catalog API cost for one V1 fixture and one V2 live or isolated session, recursively including subagents.

**Assertions:** The same documented cost executable selects the validated schema, reads no transcript bodies, reports recursive per-session and per-model attribution, distinguishes estimated from stored cost, and identifies a running source as a mutable snapshot.

## Claude Code Session

**Prompt:** Outline a known Claude Code parent and relevant child metadata from a supplied store root.

**Assertions:** The child confirms the live JSONL layout, uses bounded `jq` projections without output redirection, traces child metadata before child bodies, and reports replacement or truncation risk for incremental reads.

## Adjacent Routing

**Prompts:** Map a repository's architecture; research an SDK; implement a fix; create a Session Brief; preserve a Session Capture.

**Assertions:** The description routes code discovery to `explore`, external facts to `research`, implementation to the parent or `worker`, and artifact ownership to the relevant workflow. Session Analyst may provide prior-session evidence but does not absorb those roles.

## Model Policy

**Assertions:** Run the same bounded investigation and complete reconstruction on Luna/high before considering a higher effort. Record completeness, correction rate, tool count, duration, tokens, estimated cost, and parent rework. Promote the default only when repeated High runs miss consequential evidence that a matched higher-effort run recovers.

## Ordinary-session selection

**Scenario:** Answering a request requires locating, reconstructing, auditing, comparing, or costing prior OpenCode or other AI-session evidence. Ordinary routing selects `session-analyst` proactively. A task about current repository state or current runtime state uses the corresponding evidence role instead.
