---
name: session-brief
description: Create or refresh a local Session Brief for one current or prior AI session so a human or agent can reuse what happened without rereading the transcript. Use when explicitly asked to extract a session into a refreshable working artifact or update an existing Session Brief. Do not use for a conversational summary, handoff, thread digest, work-unit checkpoint, Session Capture, or maintained Practice.
---

# Session Brief

A Session Brief is a mutable, evidence-backed working view of one source session. It preserves useful context and a reusable refresh checkpoint without promoting the material into accepted guidance or an ongoing work container.

Load `agent-sessions` for evidence acquisition and `context-transfer` for the consumer and destination contract. This skill owns artifact form, synthesis, merge, storage, acceptance, lifecycle, and validation.

## 1. Establish the brief

Resolve the source harness and session from an explicit ID, title, current-session request, project, or recency clue. Resolve the destination in this order:

1. Use a path selected by the user.
2. Use a destination declared by the current project.
3. Use `<workspace-root>/artifacts/session-briefs/` when workspace guidance declares `artifacts/` as mutable output storage.
4. Ask one focused question when no destination is authoritative.

An explicit create or refresh request authorizes the local artifact and a missing destination directory. It does not authorize a commit, publication, knowledge promotion, work-unit attachment, or source-session mutation.

Name a new brief `<title-slug>--<source-session-id>.md`. Match an existing brief by source harness and session ID, not title.

**Done when:** the source, destination, existing or new artifact, consumer, and edit authority are explicit.

## 2. Acquire one bounded result

Use Agent Sessions Locate only when the source ID is unknown.

For a new OpenCode brief or full rebuild, run one V2 `snapshot` for the parent and its direct children. For refresh, extract the exact `extraction.adapter_state_json` text and pass it to one V2 `delta` call as `--checkpoint-json '<exact-json>'`. Use a controlled checkpoint file when shell quoting would risk changing the bytes.

An OpenCode checkpoint can drive delta only when the artifact has `state_version: 2`, `source.harness: opencode`, `source.adapter_version: 2`, and a valid adapter-version-2 checkpoint. Missing, malformed, legacy, or unsupported OpenCode state starts a full snapshot rebuild without conversion. Preserve valid narrative, the original `brief.created_at`, and useful extraction history while replacing claims that current evidence changed.

Accept `delta` only when the adapter returns `mode: delta` with complete append-only coverage. If it returns `rebuild_required`, apply none of the rejected evidence. Run a full snapshot or leave a visible incomplete gap. Creation, accepted delta, no-op delta, and rebuild each finish with the returned top-level `checkpoint` ready for the next refresh.

For another harness, use its bounded adapter operation and retain its native compact JSON state. Keep its locator, replacement, truncation, and append rules independent from OpenCode.

Record three separate decisions:

- source activity at the accepted boundary: `active`, `quiescent`, or `missing`;
- evidence acceptance at that boundary: `accepted`, `partially-accepted`, or `rejected`;
- movement after the boundary: `not-observed`, `detected`, or `unknown`.

For the currently executing OpenCode parent, interpret the snapshot directly. Creating the brief moves that source after the accepted boundary, so record detected movement, a visible movement gap, and incomplete coverage. The accepted boundary may still have accepted guards.

Count and locate reasoning without reading or writing reasoning bodies. Keep secrets, broad tool output, and irrelevant private content out of the result and artifact.

**Done when:** one bounded result, source topology, accepted boundary, coverage, exclusions, movement, and reusable checkpoint are known.

## 3. Interpret evidence

When a suitable read-only exploration child exists, use one fresh child to interpret the already acquired result. Do not delegate file writing or a second broad acquisition. Give the child the source identity, scope, boundary, result, existing brief path for refresh, required evidence classes, privacy limits, and authority rules.

Skip the child for the currently executing OpenCode parent and for a verified no-op delta. A no-op has complete append-only coverage, no appended messages, unchanged topology, and no gaps. Preserve the narrative, transport the returned checkpoint even when it is byte-equal, update boundary fields, and add one concise no-op history entry.

Only a parent human or user message establishes a decision or correction. A child prompt is delegated assistant direction. Child results and successful tools support findings and observed outcomes, not human acceptance.

**Done when:** every requested evidence class is supported, excluded, or named as a gap, and authority is classified.

## 4. Create or refresh the artifact

Follow [the artifact contract](references/artifact-contract.md). On refresh, use the existing brief as the baseline:

- revise claims changed by current evidence;
- merge material decisions, corrections, findings, work, validation, and unresolved state into their semantic sections;
- preserve still-valid context without rereading it;
- keep user direction, source facts, proposals, outcomes, and uncertainty distinct;
- advance the exact checkpoint through every accepted scanned record, including evidence that caused no narrative change;
- keep bounded nonterminal locators until later evidence makes them terminal;
- add one concise extraction-history entry with mode, boundary, and material change or verified no-op.

Write the frontmatter and narrative with exactly one controlled `extraction.adapter_state_json: |-` marker and one indented placeholder line. Then run:

```bash
python3 <skill-dir>/scripts/set-adapter-state.py <brief-path> <adapter-output-path>
python3 <skill-dir>/scripts/validate-session-brief.py <brief-path>
```

The helper reads only the adapter envelope's top-level `checkpoint`, serializes it compactly, and atomically replaces the controlled line. Use it for every accepted OpenCode adapter result. Never copy, retype, patch, or manually serialize checkpoint JSON.

For OpenCode decisions and corrections, use a direct parent locator:

```text
[source: parent/session=ses_parent;seq=12;message=msg_user]
[source: parent/session=ses_parent;seq=12;message=msg_user;content-index=0]
```

For another harness, use its native parent locator. After validation, resolve every authority locator in the accepted parent evidence and verify that it points to a human or user message. The validator checks syntax and harness shape, not the message role.

Keep the brief a current working view. It is not a transcript, event log, implementation plan, or maintained knowledge document.

**Done when:** the artifact is coherent through one accepted boundary and its checkpoint can drive the next refresh.

## 5. Validate and report

Inspect the final artifact and diff after both scripts pass. Check the checkpoint block, guard statuses, coverage, privacy boundary, required sections, authority locators, creation time, extraction history, and destination instructions.

Run the cold-consumer test: with the brief, declared host context, and reachable references, the consumer can understand what happened, what was decided or proposed, what changed, what remains unresolved, and how to continue without routinely reopening the transcript.

Report the path, source session, extraction mode and boundary, material changes, activity and movement, guard result, gaps, and validation. Leave commit, application, publication, and promotion unperformed unless separately authorized.

**Done when:** the artifact is locally usable and refreshable and every limitation is visible.
