---
name: session-derived-knowledge
description: Preserve knowledge from an AI session as a durable Session Capture or Practice. Use when explicitly asked to create or revise a durable knowledge artifact from session-derived material, including choosing between a capture and maintained guidance. Do not use for ordinary session lookup, summaries, handoffs, thread digests, or work-context checkpoints.
---

# Session-Derived Knowledge

Extract the useful result of an AI session into a durable artifact that supports
future work without making the session a routine dependency. Preserve selected
knowledge rather than reproducing the interaction.

## 1. Establish The Request

Confirm that the user wants durable preservation, not merely a session summary,
handoff, transcript, thread digest, or work-context checkpoint. Determine which
session material is in scope and which destination repository or knowledge store
owns the resulting artifact. Read its applicable instructions before writing.

Treat an explicit request to create or update an artifact as edit authority for
that artifact, subject to destination rules. It does not authorize committing,
publishing, or changing a different knowledge form.

**Done when:** the source scope, intended durability, destination, and edit
authority are clear.

## 2. Choose The Form

Create or update a **Practice** when the intended way of working and its purpose
are already understood. A Practice is maintained guidance for a recurring
situation, not a report of one session.

Create a **Session Capture** when something is worth retaining but its eventual
role is unclear, immediate synthesis would interrupt the work, or observations
may need to accumulate before a pattern is visible. A capture is a selected
record of what was worth keeping and why, not a complete transcript or accepted
guidance.

Use neither form when the need is transient continuation, complete session
reconstruction, status tracking, or operational authority. Route that need to the
destination's handoff, session, thread, work-context, issue, specification, or
other owning form.

The two forms are direct alternatives. A Practice may be created directly from a
live or past session, and a Capture need never become a Practice. Honor an
explicitly requested form unless it would misrepresent the artifact's authority;
surface that mismatch rather than silently changing forms.

**Done when:** the selected form matches the artifact's intended future role and
authority.

## 3. Gather Faithful Evidence

Use the current interaction or retrieve the relevant past session through the
available session source. A thread or summary may locate relevant evidence, but
when exact evidence materially affects the artifact and the original session is
available, inspect the original rather than relying only on a lossy digest. A
Practice may also combine session evidence with Captures, research, experiments,
observed outcomes, or direct judgment. Distinguish:

- human statements and accepted direction;
- source facts and exact excerpts;
- assistant proposals or interpretations;
- observed outcomes;
- uncertainty and unresolved questions.

Retain exact wording only where it carries continuing value. Preserve safe,
portable provenance when available, while following the destination's privacy
and authority boundaries. Do not imply that the extracted material is complete
or independently corroborated.

**Done when:** every consequential claim has an appropriate evidence state and
the extraction does not overstate the source.

## 4. Apply The Portability Contract

Make the artifact:

- **Self-contained:** ordinary use requires no transcript.
- **Reasoned:** conclusions retain their important rationale.
- **Evidence-aware:** exact excerpts and references remain where useful.
- **Stateful:** accepted guidance is distinguishable from proposals.
- **Revisable:** assumptions and reconsideration triggers are explicit.
- **Historical:** meaningful changes explain what was superseded and why.
- **Portable:** content does not depend on one agent harness or machine.
- **Bounded:** irrelevant session material is excluded.

Portability is not losslessness. The original session may remain an escalation
path for audit, exact attribution, or unanticipated questions. A fresh reader
given only the artifact should be able to explain what is understood or
recommended, why, what remains uncertain, and how new evidence could revise it.

When a named project, document, skill, or framework materially informs the
artifact, provide a canonical locator, the specific source and version when
behavior is version-sensitive, and enough context to explain its relevance. A
machine-local path may supplement those references but cannot be the only
locator.

**Done when:** ordinary continuation succeeds from the artifact alone and every
remaining dependency is an intentional escalation path.

## 5. Shape The Artifact

For a **Session Capture**, preserve what was selected, why it mattered, enough
independent context, valuable evidence or wording, uncertainty, open questions,
and safe source provenance. Keep it stable as a record of what was retained at
the time; place later synthesis in the artifact that owns the resulting current
view. When retaining a practice-like observation, also preserve the recurring
situation, desired outcome, emerging method, applicability, rationale,
alternatives, assumptions, and observed results that matter to later evaluation,
without presenting the observation as accepted guidance.

For a **Practice**, put current applicability and guidance first. Preserve the
desired outcome, method or decision rules, rationale, authority boundaries,
important alternatives, assumptions, limits, reconsideration triggers,
supporting evidence, meaningful evolution, and unresolved questions when they
matter. Keep detailed edit chronology in version history rather than turning the
Practice into a log.

Use content-specific depth instead of forcing either form into a universal
template. Repository instructions own filenames, front matter, indexes,
validation, privacy constraints, and publication mechanics.

**Done when:** the artifact is faithful to its form, satisfies its destination
contract, and contains no unsupported promotion of evidence into guidance.

## 6. Validate And Hand Off

Run destination-required validation and inspect the resulting artifact and diff.
Report the chosen form, destination, evidence limitations, validation performed,
and any unresolved questions. Commit or publish only when the user requested it
and the destination permits that workflow.

**Done when:** the durable artifact is reviewable in its owning destination and
all unperformed publication steps are explicit.
