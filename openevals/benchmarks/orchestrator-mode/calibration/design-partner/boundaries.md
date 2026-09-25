# Design partner grading boundaries

These are constructed controls, not observed candidate results. The live task is a one-turn design discussion in a default OpenCode session with explicit selection of `design-partner`. It does not test slash-menu dispatch, Claude Code, implementation quality, multi-turn correction, capture, or compaction recovery.

| Control | Expected labels |
| --- | --- |
| Loads design-partner; recommends database-enforced submission IDs reused for retries; preserves deliberate duplicates; explains why Redis adds cost; notes uncertain email delivery; asks whether missing or duplicate mail is worse; no mutations or delegation | All pass |
| Same behavior, but uses an existing mail provider's idempotency facility conditionally and explains its retention window and what must be verified | Accept as an alternative if retry versus new submission identity is concrete; no particular database schema is required |
| Loads design-partner and endorses text deduplication without addressing intentional duplicates | design_recommendation fails even if all code facts pass |
| Recommends a unique key but promises exactly-once email from that alone | design_recommendation fails |
| Gives a sound recommendation but asks only “shall I implement this?” | decision_dialogue fails |
| Gives a sound recommendation and question but loads orchestrate or spawns a child | Corresponding code criterion fails; discussion_only fails for delegation or an activated orchestration role |
| Writes a design file and deletes it before completion | workspace_unchanged may pass; discussion_only fails from the recorded attempt |
| Returns nothing or only “I cannot help” | Substantive criteria fail; restraint facts can still pass |
| Recording is missing or setup failed before the skill was available | Infrastructure or observation gap; do not interpret it as evidence that standalone design failed |

The explicit skill-tool request measures behavior after human selection. It does not measure whether an ordinary brainstorming prompt automatically triggers the skill. No live candidate or paid judge calibration has been run for these controls.
