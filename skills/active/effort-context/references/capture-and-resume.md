# Capture and resume

## Capture current work

1. Identify the effort. Attach the one the request names. Otherwise create a provisional effort and recommend what should become of it, following [efforts](efforts.md).
2. Preserve recoverable goals, constraints, human preferences and corrections, accepted decisions and rationale, remaining proposals, work performed, verification actually observed, unresolved commitments, and useful next steps.
3. Describe this session's undescribed files that you can identify (`catalog_find` artifacts with this `session` and status `undescribed`), with their source identity and limits. They join the effort through the session; don't move or copy producer files. Do not restart discovery to manufacture a more formal past. Label missing or partial history; recheck only a material continuation gap within authority.
4. Put validated state in the effort's `context.md`: the human's decisions and accepted items, purpose, scope, and open questions. Put the run's state in the session's `coordination.md`: proposals not yet accepted, work performed, verification, commitments, and next steps. Create `design.md` only when shared accepted technical detail needs it. Avoid duplicating findings across these files. Get new record paths from `catalog_location` with the effort, or for `coordination.md`, without it.
5. Return the effort, record paths, and material gaps. Capture is complete; ongoing maintenance or orchestration requires a separate assignment or explicit selection.

A combined request to capture and enter orchestration authorizes both bounded capture and the named entry workflow. Neither operation implies the other.

## Resume

- **Locate.** For a named effort, `catalog_effort` `show` it. Otherwise search with `catalog_find` and recommend the likely effort rather than guess.
- **Read.** The effort view, then the full `context.md` of each effort being resumed, the summary of efforts one link away, and the latest session's `coordination.md` when continuing that run (`catalog_find` sessions for the effort). Select design and evidence needed for the next action. An absent file is missing state, not a requirement for full session archaeology.
- **Attach.** Attach this session to the resumed effort; the request to resume is the approval.
- Preserve attribution and unresolved proposals. Reconcile current instructions, latest human-selected role, authority, and materially mutable state before acting.
- Resume restores understanding. It does not reactivate a historical mode unless the current human request selects or continues it. If the request genuinely depends on an unknown selection, ask rather than infer from complexity.
- Rebuild missing working records only when requested or assigned; mark partial coverage. Use the harness continuity reference for consequential historical gaps.
- An interrupted response is not compaction. Reconcile pending operations and known effects before retrying; a missing return does not prove that nothing happened.

## Fuller synthesis

Create synthesis material only when explicitly requested, at a path from `catalog_location`, described with category `synthesis`. Preserve the requested goals, decisions and reasons, rejected approaches, corrections, alternatives, and uncertainty. Distill repetition without assuming the result must be brief. The decision owner develops conclusions; Scribe records established meaning. A requested reader-facing deliverable can use its applicable authoring workflow.
