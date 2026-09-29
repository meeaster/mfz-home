---
name: task-output
description: Use when a dispatch brief assigns you an output file. Write the assignment's response there and reply with the path and completion state. Covers operational learnings and reuse of earlier outputs without selecting an execution workflow.
---

# Task Output

A dispatched assignment's response lives in one file that its parent reads in full. The file is the response; the reply only hands it over. Let the task determine structure and depth.

## Ownership and location

- Every dispatched assignment writes its response to one file: investigation, review, design, implementation, and operations alike. Scribe is the exception, since the records it maintains are its output. A helper inside another agent's assignment returns to that agent, which incorporates what it uses.
- Work a session does for itself, including its own investigation, is answered in its reply rather than a file.
- A dispatched assignment writes only to the exact paths its brief assigns, as given: the response file and, for a lesson, the learnings file.
- Own your assigned files. A follow-up on the same assignment continues the same file. Never overwrite another producer's account.
- A brief can assign a knowledge article as the file to write. The article belongs to its subject, not to you: update it in place, keeping what still holds from earlier writers, and follow the write-up steps in `effort-context`'s knowledge reference. The reply names the article like any response file.
- The request and applicable instructions own scope and authority. Output writing does not authorize project edits, publication, or promotion into a personal knowledge base. If no path is assigned or a permitted write is unavailable, reply with the exact conflict and attributed file-ready content; never bypass a denial.

## Write the response

- Write what the parent needs from the assignment: the answer or resulting state, its support, verification and limits, uncertainty, blockers, unresolved side effects, and exact mutation or publication state. The parent reads the whole file, so size it to that need; include method or attempt history only when it bears on the result.
- What a brief or role definition asks you to report or return is the file's content. The reply below stays the same whatever the request.
- Put source locators, relevant commands or API details, results, and verification beside the claims they support. Include revision, time, or invalidation conditions when material.
- Preserve exact excerpts needed to act, reproduce, or decide. Summarize repetition and link accessible detail rather than copying tool traces.
- Distinguish observations, interpretations, recommendations, accepted decisions, and uncertainty. Attribute choices to their actual owner; a coordinator decision is not explicit human approval.
- Reuse applicable evidence with its qualifications. Identify additions, contradictions, corrections, or independent confirmation instead of duplicating the original investigation.
- Incorporate useful helper results with attribution and limits. Session IDs alone do not preserve the facts needed for continuation.
- A follow-up revises or extends the file so it remains one current response. Mark corrections to earlier content where they occur.
- When the work taught a reusable lesson, such as how to run a command, a library usage that failed and the one that worked, or a gotcha in the code, write it to your assigned learnings file. For lessons, raw captures, or screenshots, read [specialized outputs](references/evidence-and-learnings.md).

## Describe the files

- Before replying, describe every file you wrote under the Cairn root with `catalog_describe`: a category (`evidence` for a response unless `deliverable`, `synthesis`, or `source` fits better; `learning` for a learnings file; `knowledge` for an assigned knowledge article), a short title, and a one-sentence description of what it establishes. Later sessions choose what to open from these descriptions in search results and effort views.
- A file you changed that is already described needs a new description only when its meaning changed. Add `supersedes` when your file replaces an earlier one.

## Reply

- Finish writes and descriptions before replying. Reply with the path of each file you wrote or changed, including any learnings file, the completion state (completed, partial, or blocked), and a brief summary of what was done: a few lines, at most a couple of bullets. After a follow-up, the summary says what was added or corrected. The full answer, supporting findings, excerpts, and detailed results stay in the file.
- Name new learnings and corrections in the summary so the coordinator can pass them on. Producer completion is distinct from acceptance or independent review.
- Read selected existing outputs for reuse, checking freshness and applicability. Report material gaps without expanding the assignment or replaying sound completed work.

The operation ends when the file is complete and described and the reply names it, or the blocked write is disclosed with recoverable content. Response files remain working evidence rather than new authority; they reach a knowledge article only through a write-up.
