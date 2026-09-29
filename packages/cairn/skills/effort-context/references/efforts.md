# Efforts

An effort is an outcome the human wants to come back to, such as "Logs archived to S3", not a phase. Design, implementation, review, and follow-up fixes of one outcome belong to the same effort. Sessions attach to efforts, and files join the efforts of the session that wrote them, including files written before attaching. Subagents inherit their root session's efforts.

## Recommend

1. Once the conversation has a clear subject, search with `catalog_find` (target `efforts`, `text` from the subject, and `tag` when one fits). Provisional efforts are included; prefer regular ones.
2. Recommend in a sentence or two: the effort and why it fits. With no fit, propose a new effort titled for its outcome. When the work changes the state of several efforts, recommend each.
3. Keep working while the question is open; the session's files attach later along with it. Ask once per subject, and again only when the subject changes. A declined recommendation stands.
4. On approval, call `catalog_session` with `attach`: a slug, or `{create: {title, description, tags}}`. When creating returns `close_matches`, show them to the human instead of repeating with `confirm_new`.

## Provisional efforts

- **Create.** Entering orchestration without a named or approved effort, or capturing work that names none, creates one: `catalog_session` with `attach: [{create: {title, description, provisional: true}}]`, titled for the task's outcome. When `close_matches` come back, create it with `confirm_new` and recommend the matches as merge targets.
- **Use.** It works like any effort, including resume in a later session. Tell the human once that it exists, with the recommendation.
- **Promote** on approval: `catalog_effort` `update` with `status: active`, and a new title or `rename` when the human wants one.
- **Merge** on approval: first fold the provisional `context.md` and `approach.md` into the target's, keeping attribution and removing duplication, and link the target to the provisional effort's designs; then `catalog_effort` `merge` into the target. Check that each record in `records_left_behind` was folded in.

## Other changes

- Recommend splitting, detaching, merging regular efforts, and excluding a file (`catalog_describe` with `efforts.exclude`), each with the reason, and act on the answer.
- A split fits a piece with its own approval or delivery, a piece other efforts need alone, or sessions that no longer concern the rest of the effort.
- Links between efforts need no approval. Add `depends_on` in the blocking direction only, and `related` for looser ties, when you find the relationship.
