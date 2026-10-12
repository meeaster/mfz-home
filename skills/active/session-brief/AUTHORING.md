# session-brief

## Intent

Create or refresh one mutable, evidence-backed brief of one source session, so a human or agent can reuse what happened (research, decisions, corrections, implementation, validation, open state) without rereading the transcript, and refresh it later from a stored checkpoint.

Not for: conversational summaries, handoffs, threads, work-unit checkpoints, Session Captures, or Practices; storing transcripts, reasoning, secrets, or bulk tool output; committing, publishing, or mutating the source.

Success: a cold reader can tell what happened, separate decisions from proposals, see what's unresolved, verify consequential claims, and refresh without rereading; unsupported state rebuilds visibly and safely.

## Scenarios

- **"Create a refreshable Session Brief for this prior session"** and **"refresh the brief for `ses_x`"**: loads `agent-sessions` and `artifact-context`, resolves one source, destination, and consumer.
- **"Summarize this conversation"**, "write a handoff", "add these sessions to a thread": left to their owning workflows.
- **OpenCode creation**: one full snapshot of the parent and direct children; checkpoint stored through the helper; validator passes.
- **No-op and append refresh**: one delta from the exact stored checkpoint; only new meaning merged; one short history entry.
- **Missing, legacy, or rejected checkpoint**: full rebuild that keeps valid narrative, original creation time, and useful history.
- **Brief of the session that's still running**: records the movement as a visible gap, no interpretation child.
- **Decision attributed only to a child session's output**: fails; decisions and corrections need a parent human message.
- **Claude Code source**: native checkpoint and locators, no OpenCode fields.

## Decisions

- **Model-invoked on explicit requests** (2026-08-08). Users ask for it in natural language, and it needs references and dependencies a command can't carry.
- **One parent session is the identity**; children are topology, not separate sources.
- **`agent-sessions` owns retrieval; this skill owns acceptance, synthesis, storage, and lifecycle.** A checkpoint format change there must be reconciled here (contract, validator, transport helper, tests) in the same change.
- **Checkpoints move only through `scripts/set-adapter-state.py`.** In a live run a model hand-copied the state and transposed one hex character in a source fingerprint; the validator accepted it and the next refresh failed. Structural validation can't catch source-inexact state.
- **Only parent human messages establish decisions and corrections.** Child prompts are delegated assistant direction, and child reports or tool success can't show acceptance. Locator syntax can't prove the role, so the agent checks it after writing.
- **Refresh safety over cursor compatibility.** Anything other than a verified append rebuilds instead of being converted.
- **Enabled in the base profile but off in Personal**, while its retained source still names `artifact-context` for the durable artifact.

## Sources

None external. Depends on the `agent-sessions` OpenCode snapshot/delta adapter, checkpoint version 2.
