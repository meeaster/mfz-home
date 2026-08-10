# Session Analysis

Use this branch for reconstruction, audit, behavior review, or durable user
perspective. The coverage mode selected in `SKILL.md` remains authoritative.

## Timeline

Reconstruct, in order:

1. The user request, assistant actions, and outcome.
2. Tool calls that materially affected the result, including failures, retries,
   long outputs, permission rejections, and policy denials.
3. Skills, MCP or Executor tools, and documentation lookups, including whether
   they fired early enough.
4. Subagent invocations and resumptions: prompt, child identity, result, and how
   the parent used it.
5. Divergence from applicable instructions when the request asks for behavioral
   improvement.

Aggregate routine successful calls. Read full tool inputs and outputs only when
they establish a finding, decision, changed artifact, validation result, or gap.

## Evidence-Complete Requests

For Audit, Delta, or explicitly exhaustive Reconstruct requests, the final
coverage status must account for:

- every session in scope and its message or record counts;
- inspected and excluded record classes;
- compaction, clearing, and interruption boundaries;
- new, resumed, fallback-new, and unresolved invocation topology;
- terminal creation cursors and mutable update cursors;
- nonterminal tools or messages;
- a locator for every requested finding;
- privacy exclusions and uninspected ranges.

Outlining is a focus technique, not a reason to under-sample. A report is
incomplete while any requested coverage item is absent, even when its narrative
is accurate.

## User Perspective

Admit a perspective only when a future agent could use it to make a better
decision without asking again. Classify substantive user messages before
summarizing them:

- **Dictated exploration** preserves intent, uncertainty, taste, and corrections
  instead of flattening conversational language into generic requirements.
- **Structured brief** yields explicit requirements, constraints, and decisions.
- **Pasted context** is evidence supplied with the ask, not automatically the
  user's own stance.
- **Correction or override** is high-signal evidence of a preference or boundary.
- **Skill or prompt meta-design** contributes rationale, not only requested text.
- **Review or audit request** reveals a durable standard only when the user states
  or demonstrates one.

Exclude routine instructions, pasted material with no user stance, transient
frustration, and implementation details that have no reusable decision value.
Report the message shape, reusable perspective, admission rationale, and locator.

## Reporting Order

1. **Scope and evidence status:** source, mode, session IDs or files, counts,
   included and excluded classes, cursors, and complete versus sampled status.
2. **Location:** how the session was identified.
3. **Timeline:** main turns, boundaries, and important tool or subagent events.
4. **Findings:** effective behavior, failures, corrections, and risks with
   locators.
5. **Recommendations:** evidence-supported changes when requested.
6. **Gaps:** missing records, schema drift, truncation, mutable states, and
   uninspected scope.
