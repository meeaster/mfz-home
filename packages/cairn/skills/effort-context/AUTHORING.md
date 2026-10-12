# effort-context

## Intent

The bounded operations around Cairn efforts and their material: recommend, capture, synthesize or hand off, resume, write up evidence into knowledge articles and re-check them, save meetings and email threads as sources, register Jira and Confluence links, bring in earlier material, maintain assigned records, and find where output goes. Each operation ends at its completion condition.

Not for: starting a workflow or ongoing maintenance just because the skill loaded, `mfz work` operations, Session Briefs, or promoting material into Personal knowledge.

Success: a successor session can pick up the human's work without the human explaining it again, the knowledge base stays organized by subject and checkable, and efforts stay the human's own organization.

## Scenarios

- **Capture after a small change grew**: goal, corrections, work done, actual checks, evidence pointers; no mode entry.
- **Capture after history loss**: names the gap instead of inventing decisions or redoing research.
- **"Where should this evidence go?"**: a path from `catalog_location`, no effort created.
- **Resume by name**: reads the effort's records and synthesis and attaches without asking again.
- **Work gains a clear subject**: recommends an effort with a reason and keeps working; attaching before the human answers, or asking again on the same subject, fails.
- **Handoff without an effort yet**: one synthesis with intent, findings, corrections, rejected ideas, open boundaries, and limits; no efforts, extra handoff file, or compaction.
- **Continue after compaction**: reads the synthesis, recovers accepted choices and open alternatives, doesn't re-pitch a rejected idea.
- **Eight evidence files on one AWS environment**: one subject-organized article with dated, sourced sections; every file either informs it or is reported as left out; disagreements surfaced, not silently resolved. A later contradicting finding updates the section in place.
- **Evidence from an origin already registered**: reuses the origin and adds the access method; observation date, not write-up date.
- **Pasted meeting transcript touching two efforts**: saved with a summary of candidates; nothing written to records; a colleague's agreement isn't a decision.
- **New replies on a known email thread**: appended to the same file; only messages after `Reviewed through` go to intake.

## Decisions

- **Efforts are the human's organization of their work** (human, 2026-09-25). Agents know which efforts exist and recommend; the human approves attaching, creating, promoting, splitting, merging, and excluding. Naming an effort in a request counts as approval.
- **No effort per session** (human, 2026-09-25). Session folders already keep their files, and an effort for every session would bury the recommendations. A provisional effort appears only for a capture that names none.
- **Cairn's layout is the only layout** (human, 2026-09-27); no pre-Cairn storage paths.
- **Records hold validated state only.** Proposals stay attributed in producer artifacts, synthesis, or session coordination, so a later reader can't mistake an assistant suggestion for the human's decision.
- **A handoff is a synthesis, not another record type**, with no fixed length: remove repetition, keep meaning, so a successor doesn't need the human to explain again.
- **Knowledge lives in subject-organized articles at the Cairn root** (human, 2026-09-29). Evidence is organized by the question each assignment answered, and ten files on one subject can't be reread every time. Per-claim findings in the effort were proposed and rejected because they can't carry a connected model such as an AWS environment's layout. Several efforts rely on one subject and it outlives them, so articles and sources join efforts through membership.
- **One growing file per email thread, one folder per meeting** (human, 2026-09-29). Replaced a file per thread per session chained by `Continues:`; the meeting summary is what intake and designs cite.
- **Freshness lives on references, not statuses** (human, 2026-10-06 and 2026-10-07). Knowledge needs periodic re-checks; a reference records what was looked at in an origin and when, so a re-check doesn't need the original evidence. Origin kinds are an open list agents extend after checking what exists, so a new system like Sentry needs no code change. Jira and Confluence stay separate, first-class pointers to the work around efforts.

## Sources

None external. Paths and file purposes come from Cairn (`catalog_location`); `references/storage.md` owns the layout.
