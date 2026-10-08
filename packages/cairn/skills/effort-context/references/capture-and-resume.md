# Capture and resume

## Capture current work

1. Identify the effort. Attach the one the request names. Otherwise create a provisional effort and recommend what should become of it, following [efforts](efforts.md).
2. Preserve recoverable goals, constraints, the human's views and corrections, accepted decisions and rationale, remaining proposals, work performed, verification actually observed, and open questions.
3. Describe this session's undescribed files that you can identify (`catalog_find` artifacts with this `session` and status `undescribed`), with their source identity and limits. They join the effort through the session; don't move or copy producer files. Do not restart discovery to manufacture a more formal past. Label missing or partial history; recheck only a material continuation gap within authority.
4. Put the work's state in the effort's `effort.md`: where it stands, the human's decisions, accepted items and views, and open questions, as [storage](storage.md#layout) describes. What a system is and why goes in its design: the linked stable design (`design-docs`), or for small work or detail below a stable design, a local `design.md` in the effort folder. Proposals not yet accepted and fuller reasoning stay in a synthesis in the session folder that `effort.md` points to. Leave next steps out; a resuming agent proposes them from the state. Avoid duplicating findings across these files. Get new record paths from `catalog_location` with the effort.
5. Return the effort, record paths, and material gaps. When evidence on one subject has piled up, recommend writing it up into a [knowledge article](knowledge.md). Capture is complete; ongoing maintenance or orchestration requires a separate assignment or explicit selection.

A combined request to capture and enter orchestration authorizes both bounded capture and the named entry workflow. Neither operation implies the other.

## Resume

- **Locate.** `catalog_effort` `show` takes a slug. For an effort named by its slug, show it; for one named by its title or described, find it with `catalog_find` (target `efforts`, text from the name) and show the match. With no clear match, recommend the likely effort rather than guess.
- **Read.** The effort view, then the full `effort.md` of each effort being resumed and its local `design.md` when it has one, the full `design.md` of each stable design linked to it (a member file under `designs/`) with the `changes.md` entries since the effort's last session (below), and the summary of efforts one link away. Select the knowledge articles (the effort view's Knowledge group, or `catalog_find` with category `knowledge` and text from the subject) and evidence needed for the next action; an article on a subject comes before the evidence it was written from. An absent file is missing state, not a requirement for full session archaeology.
- **Changes since the effort's last session.**
  - The cutoff is the latest `last_activity_at` among the sessions `catalog_effort` `show` lists, leaving out your own session tree (your session, its root, and the root's other children). When all of them are in your tree, the effort has no earlier session, and only entries from outside the effort count.
  - An entry counts when it is dated on or after the cutoff's day and isn't the effort's own work. The effort's own work is an entry whose source is `session <id>` for one of the effort's sessions or a child of one (its `root` in `catalog_find` sessions is one of them). Entries from elsewhere dated the cutoff's day count, because a day can't be ordered against a time.
  - The IDs a counted entry names changed. Check what in the effort cites them; a phase is cited by its heading.
- **Report and propose.** Tell the human where things stand and what changed. When they want a plan, propose one from the records in the conversation; it becomes a file only when they ask, as a dated synthesis. A dispatched resume reports the same in its final message.
- Read synthesis designated for continuation before proceeding, whether returning after compaction or in a fresh session. Establish the goals, accepted direction, unresolved choices, completed work, and next topic. Continue the human's discussion or assignment from there; a request to continue talking does not require first populating every maintained file.
- **Attach.** Attach this session to the resumed effort; the request to resume is the approval. A read-only resume leaves attachments alone, and a subagent whose root session is attached already belongs to the effort.
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

- For an established effort covered by the handoff request, update its `effort.md` with where things stand, a pointer to the synthesis and why it must be read, and the open topic the discussion reached. A brief entry is enough when detailed context has not yet been organized. Distinguish completed discussion or investigation from implementation that has not started; do not invent settled scope or design.
- A synthesis-only handoff can remain in the session folder without creating an effort. Return its path and where to pick up. Creating or attaching efforts follows the effort rules when requested; a handoff alone does not trigger provisional-effort creation.
- As authorized capture or maintenance develops the effort records, incorporate current validated meaning and keep the synthesis accessible for its fuller reasoning and unresolved alternatives. Incorporation does not consume or replace the source synthesis. Later decisions should be distinguishable from the earlier discussion, without implying that earlier proposals were always accepted.
