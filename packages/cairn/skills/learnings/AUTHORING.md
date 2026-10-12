# learnings

## Intent

What a subagent writes down when its work taught it something reusable for later agents, such as how to run a command, a library usage that failed and the one that worked, or a gotcha in the code, and where that file goes.

Not for: the subagent's findings, which belong in its result; turning a lesson into permanent guidance; attempt-by-attempt history.

Success: a later agent finds a short, applicable lesson. Supplied lessons stay intact, and corrections are attributed.

## Scenarios

- **Implementer finds the right test command after two failures**: one short lesson with the failed approach, what worked, and when it applies, in the learnings path its system context names.
- **Explorer completes a routine read with nothing new**: writes no learnings file.
- **A supplied lesson proves wrong**: leaves the earlier note untouched and records the correction in its own file, naming that note and the conditions.
- **No learnings path named**: gets one from `catalog_location` with topic `learnings` and describes it with category `learning`.
- **A lesson looks like it should become a rule**: stays local, and the agent reports it rather than editing guidance.

## Decisions

- **Lessons are separate from results** (human, 2026-10-08). Every subagent produces a result, so the Cairn plugin now saves and describes it automatically. Lessons are occasional, so a small skill for them is fine. This replaced the `task-output` skill, under which subagents wrote, named, and described their own output files.
- **The plugin supplies the location; the skill supplies the content** (human, 2026-10-08). Mainly subagents write lessons, not the lead, so the plugin injects the path into the subagent's system context and credits and describes the file. The orchestrator doesn't pass the path in briefs.
- **Start bare** (human, 2026-10-08). The skill holds minimal guidance on purpose. Add guidance only when use shows lessons going wrong.

## Sources

None external. The content rules carry over from `task-output`'s operational-learnings reference, which this skill replaced.
