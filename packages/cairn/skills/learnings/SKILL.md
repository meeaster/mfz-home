---
name: learnings
description: Use when work taught you something reusable, such as how to run a command, a library usage that failed and the one that worked, or a gotcha in the code. Covers what a lesson records and where it goes.
---

# Learnings

A lesson preserves an incidental working method for later agents. It is not another copy of your findings; those belong in your result.

## Where

- A subagent writes to the learnings path its system context names. Cairn credits the file to it, describes it, and tells the parent it exists.
- Without a named path, get one from `catalog_location` with the topic `learnings`, and describe the file with `catalog_describe`, category `learning`.
- Keep one file for the assignment, with a short section per lesson.

## What

- Record a lesson only when it is new and reusable. State the problem, a failed approach when it helps, what worked, and when it applies. Leave out the attempt-by-attempt history.
- Supplied lessons stay as they are. When one proves wrong, record the correction in your own file, naming the earlier note and the conditions.
- Keep local observations local. Turning a lesson into permanent guidance needs separate authority.
