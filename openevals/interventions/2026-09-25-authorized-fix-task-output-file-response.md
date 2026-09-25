---
date: 2026-09-25
evals: [authorized-fix, explore-evidence]
criterion: producer_return_pointer   # also dispatches_wrote_files, returned_files_read, brief_quality
skill: task-output                    # renamed from task-evidence; also orchestration, evidence-gathering, global AGENTS.md, explore.md
file: SKILL.md
change: restructure
outcome: effective
environment: live
preset: gpt6
models:
  primary: { agent: build, model: openai/gpt-6-sol, variant: medium }
  subagents:
    explore: { model: openai/gpt-6-luna, variant: high }
    worker: { model: openai/gpt-6-sol, variant: medium }   # authorized-fix lacked agent-models.json; see Result
  judge: { model: openai/gpt-6-sol, variant: high }
runs: { before: "0/2", after: "2/2" }
---

# Every dispatched agent writes its response to a file and replies with the path

## Behavior targeted

The human wants every dispatched subagent's response kept on the file system and read once by the parent, with nothing duplicated in the reply. Scribe and helpers nested inside an assignment are the only exceptions. The earlier contract saved files only for deliberate investigations and asked for a digest return; two digest attempts ([1](2026-09-25-explore-evidence-digest-return.md), [2](2026-09-25-explore-evidence-digest-followup-file.md)) had no effect, because coordinator briefs prescribed the return ("quote decisive lines … Return concise full answer").

The judges were changed first and confirmed failing on the current recordings:

- `producer_return_pointer` replaced `producer_return_digest` in both rubrics: a reply gives each written file's path and the completion state, and nothing of the content.
- `returned_files_read` (code, `returnedFilesUnread`): the root reads every file a dispatched agent wrote under the workspace root, in full (no `offset` or `limit`), after its last write.
- `dispatches_wrote_files` was added to `explore-evidence`.
- `explore-evidence` `brief_quality` now fails a brief that asks for findings, excerpts, citations, or a summary in the reply.

Before: `authorized-fix` `eval_9597cfb7` failed `dispatches_wrote_files`, `returned_files_read`, and `producer_return_pointer` (the worker "returned the actual change and validation results directly"). `explore-evidence` `eval_80a3abf2` failed `returned_files_read` (after a follow-up it read the file from line 45), `brief_quality`, and `producer_return_pointer`.

## Change

- Renamed `task-evidence` to `task-output` (skill, catalog, profile, required overlay, fact helpers, judge tests, agent references, skill-continuity plugin migration).
- `task-output/SKILL.md` rewritten. Key lines:
  - "Every dispatched assignment writes its response to one file: investigation, review, design, implementation, and operations alike. Scribe is the exception, since the records it maintains are its output. A helper inside another agent's assignment returns to that agent, which incorporates what it uses."
  - "What a brief or role definition asks you to return is the file's content. The reply below stays the same whatever the request."
  - "Reply with the path of each file you wrote or changed, including any learnings file, and the completion state: completed, partial, or blocked. The answer, findings, changes, check results, and blockers are in the file, not the reply."
  - "The parent reads the whole file, so size it to that need"; "A follow-up revises or extends the file so it remains one current response."
- `orchestration/SKILL.md`: "Every producer except Scribe writes its response through `task-output`: its brief names that skill and states the information needed, leaving the form of the file and the reply to it." and "Read each returned file in full before acting on it, and again after a follow-up changes it, along with any learnings file the reply names."
- `assignments-and-dependencies.md`: the Outputs row no longer allows "an explicit direct return"; "Check the return" starts "Read the returned file in full"; successors get the producer's file unchanged.
- `evidence-gathering/SKILL.md` and the global `AGENTS.md` (section renamed "Task output") follow the same contract, including default mode.
- `opencode/agents/explore.md`: the output bullet read "For an assignment, follow `task-output` … and reply as it directs", and the closing line said to "deliver your findings as the bullet above directs". Both were reverted after this run at the human's request; the human prefers the dispatch prompt over agent system prompts for this contract.

Placement: the reply contract sits in the skill the producer loads, and the coordinator guidance tells briefs to stay out of it, because the earlier attempts showed producers follow the brief over the skill.

## Result

2/2 on one repetition each (`authorized-fix` `eval_3a4cc304`, `explore-evidence` `eval_d4e2c83f`).

- Every reply was the path and state only, for example "Completed. Findings are saved at `…/resume-slots--explore.md`." The worker's brief still asked it to "Report exact changed path, diff gist, verification outputs"; the worker put that in its file and replied with the path.
- The coordinator read each file whole, and reread the whole explore file after the follow-up updated it. It re-ran none of the worker's checks.
- `explore-evidence` first scored `brief_quality` 0 because the follow-up asked for "verbatim short line-numbered excerpts" in the file. That is information the coordinator needs, not a reply format; the rubric was clarified to allow evidence requirements for the file and fail only reply-content requests. The same recording then passed every criterion.
- The `authorized-fix` fixture had no `agent-models.json`, so its worker ran on the candidate model rather than the preset's `gpt-6-luna` max. It was regenerated for later runs.

## Interpretation

Hypothesis: a return contract holds when it is the only contract the producer sees and its content has a stated destination. Earlier digest wording lost to briefs that asked for citations; stating that whatever a brief asks to return goes in the file resolved the conflict without the coordinator changing how it briefs. A run where a brief's return request lands in the reply would refute it.

## Locators

Source commit `e39141b` with a dirty working tree (22 working-tree overrides). Results in `benchmarks/orchestrator-mode/results/2026-09-25T01-35-03.317Z-db10aa67`.
