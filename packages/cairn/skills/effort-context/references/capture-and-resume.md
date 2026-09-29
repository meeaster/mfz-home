# Capture and resume

## Capture current work

1. Identify the effort. Attach the one the request names. Otherwise create a provisional effort and recommend what should become of it, following [efforts](efforts.md).
2. Preserve recoverable goals, constraints, human preferences and corrections, accepted decisions and rationale, remaining proposals, work performed, verification actually observed, unresolved commitments, and useful next steps.
3. Describe this session's undescribed files that you can identify (`catalog_find` artifacts with this `session` and status `undescribed`), with their source identity and limits. They join the effort through the session; don't move or copy producer files. Do not restart discovery to manufacture a more formal past. Label missing or partial history; recheck only a material continuation gap within authority.
4. Put validated state in the effort's `context.md`: the human's decisions and accepted items, purpose, scope, and open questions. Put the run's state in the session's `coordination.md`: proposals not yet accepted, work performed, verification, commitments, and next steps. Create `approach.md` only when accepted technical detail for this effort needs it. What a system is and why belongs in its design when the effort works on one (`design-docs`), not in `approach.md`. Avoid duplicating findings across these files. Get new record paths from `catalog_location` with the effort, or for `coordination.md`, without it.
5. Return the effort, record paths, and material gaps. Capture is complete; ongoing maintenance or orchestration requires a separate assignment or explicit selection.

A combined request to capture and enter orchestration authorizes both bounded capture and the named entry workflow. Neither operation implies the other.

## Resume

- **Locate.** For a named effort, `catalog_effort` `show` it. Otherwise search with `catalog_find` and recommend the likely effort rather than guess.
- **Read.** The effort view, then the full `context.md` of each effort being resumed, the full `design.md` of each design linked to it (a member file under `designs/`) with the end of its `changes.md`, the summary of efforts one link away, and the latest session's `coordination.md` when continuing that run (`catalog_find` sessions for the effort). Select design and evidence needed for the next action. An absent file is missing state, not a requirement for full session archaeology.
- Read synthesis designated for continuation before proceeding, whether returning after compaction or in a fresh session. Establish the goals, accepted direction, unresolved choices, completed work, and next topic. Continue the human's discussion or assignment from there; a request to continue talking does not require first populating every maintained file.
- **Attach.** Attach this session to the resumed effort; the request to resume is the approval.
- Preserve attribution and unresolved proposals. Reconcile current instructions, latest human-selected role, authority, and materially mutable state before acting.
- Resume restores understanding. It does not reactivate a historical mode unless the current human request selects or continues it. If the request genuinely depends on an unknown selection, ask rather than infer from complexity.
- Rebuild missing working records only when requested or assigned; mark partial coverage. Use the harness continuity reference for consequential historical gaps.
- An interrupted response is not compaction. Reconcile pending operations and known effects before retrying; a missing return does not prove that nothing happened.

## Synthesis and handoff

Create synthesis only when requested, including a request to preserve the discussion in depth or prepare a handoff for continuation. Ordinary capture still follows the record operation above. Handoff names the purpose; the document is a synthesis artifact, not a separate required file type. Use a path from `catalog_location` and describe it with category `synthesis`.

### Preserve understanding

- Preserve the human's goals, perspective, constraints, and reasons; decisions and their rationale; corrections, rejected alternatives, qualifications, and unresolved ideas. Distinguish human choices from assistant proposals and illustrative examples.
- Retain useful findings and concrete examples that shaped the discussion, alongside completed work, verification actually observed, unfinished commitments, remaining work, and the next questions. Identify material gaps rather than inventing missing history.
- Use no fixed length target. Distill repetition without compressing away necessary meaning. Include enough explanation for a successor to continue thoughtfully without asking the human to repeat the discussion or routinely reconstructing it from a transcript.
- Reference existing complete artifacts for supporting detail rather than replace them with successive summaries. Explain what each selected reference contributes; keep the context needed to understand the discussion in the synthesis itself.
- When several outcomes emerge, explain their shared background, the material relevant to each, and any dependencies. Preserve suggested boundaries as suggestions until accepted; several efforts can use the same synthesis without copies.
- Check the result from the successor's position: can it explain why the work matters, what changed the direction, what is settled or still proposed, what has happened, and where to continue? The decision owner develops conclusions; Scribe records established meaning. A requested reader-facing deliverable can use its applicable authoring workflow.

### Leave a way back in

- For an established effort covered by the handoff request, update its `context.md` with the current starting state, a pointer to the synthesis and why it must be read, and the next discussion or work topic. A brief entry is enough when detailed context has not yet been organized. Distinguish completed discussion or investigation from implementation that has not started; do not invent settled scope or design.
- A synthesis-only handoff can remain in the session folder without creating an effort. Return its path and where to pick up. Creating or attaching efforts follows the effort rules when requested; a handoff alone does not trigger provisional-effort creation.
- As authorized capture or maintenance develops the effort records, incorporate current validated meaning and keep the synthesis accessible for its fuller reasoning and unresolved alternatives. Incorporation does not consume or replace the source synthesis. Later decisions should be distinguishable from the earlier discussion, without implying that earlier proposals were always accepted.
