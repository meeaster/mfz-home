# skill-authoring

## Intent

Help turn intended agent behavior into skills and commands that are cheap to load and useful in execution, and preserve the human's intent so later revisions don't silently redefine success. Works the same in Claude Code (personal) and OpenCode (work), and for tiny skills as well as consequential workflows.

Not for: replacing the lab skill-creators' evaluation tooling, or carrying writing doctrine that `writing-for-agents` already covers.

Success: a future author, possibly on a cheaper model, can make a relevant change after reading the skill and this record, without reconstructing the history.

## Scenarios

- **Narrow wording fix** on a skill with a long record: reads the record, changes only what's affected, leaves no log entry.
- **Small new skill**: produces a short record with real intent and decisions; doesn't pad sections to fill a template.
- **Change conflicts with a recorded decision**: raises the conflict when the request is ambiguous; updates the decision when the human explicitly changes direction.
- **Review only**: returns findings and edits nothing.
- **Upstream refresh**: compares the source change against the recorded revision and local departures before adopting it.
- **Old multi-file record**: merges it into one file as part of the revision and prunes what Git or the skill already says.

## Decisions

- **One `AUTHORING.md` inside each skill directory** (human, 2026-10-11). Seven files per skill was overhead, and records in a separate Personal repository couldn't serve work skills. Keeping it in the skill makes the record portable; the cost is that it ships with the skill, which is harmless because harnesses load only `SKILL.md`.
- **`skill-creator` drives creation and testing** (human, 2026-10-11). It's maintained by Anthropic and has the strongest evaluation loop, so this skill layers on top instead of competing. Trials showed it doesn't load on its own once this skill is invoked, hence the explicit load instruction.
- **Scenarios stay in the record; runnable evals live in `evals/evals.json`** (human, 2026-10-11). Some scenarios are too broad to run directly and can only be approximated by scoped-down evals, so the two can't be merged. Run outputs stay out of the skill.
- **Live evals are opt-in, on models the human picks** (human, 2026-10-11). Runs cost money, and the human may want to compare models. In trials, Opus and Sol tested on their own initiative, which multiplied cost.
- **`skill-creator` stays vendored, and OpenCode gets it through a mapping** (human, 2026-10-11). Claude Code at work runs through a gateway, so it gets no claude.ai-synced skills, and OpenCode can't read plugin skills. The mapping lives in this skill rather than as a patch to the vendored copy, so upstream updates apply cleanly. In trials without it, Sol wrote good skills but its self-built eval runs failed or never finished; with it, Sol ran the full loop with a baseline. The mapping's environment step exists because a child `opencode run` launched from inside an OpenCode session otherwise inherits the parent's directory.
- **The record has exactly four sections** (human, 2026-10-11). A trial added "Assumptions to confirm", which is the open-questions section the human had already rejected.
- **Decisions exclude what the skill or its guidance already says** (human, 2026-10-11). Trial records on Sonnet and Sol restated the skill's rules and generic choices, which buried the entries that mattered.
- **Skills are portable by default** (human, 2026-10-11). The same skills serve personal and work machines and several harnesses. A trial run left an eval runner in the skill with this machine's scratch path and model hardcoded.
- **Only `evals.json` ships; runners and outputs stay temporary** (human, 2026-10-11). Same trial: a 135-line runner landed in the skill folder.
- **Approved evals include a baseline** (human, 2026-10-11). In trials Sonnet skipped it; Opus's baseline was what showed the skill fixing a real failure.
- **Hidden from automatic selection, but loadable by workflows** (human, 2026-10-12). Skill authoring is deliberate work and shouldn't spend context on unrelated turns, but `orchestrate` has subagents that edit skills load it. OpenCode's `opencode/autoinvoke: false` hides it and still allows an explicit load; Claude Code's `disable-model-invocation: true` would block that load, so it isn't set. Codex keeps `allow_implicit_invocation: false`.
- **`writing-for-agents` stays a separate dependency.** Bundling it meant maintaining a lossy duplicate. Revisit only if a supported harness can't load it reliably.
- **Local writing preferences live here, not as patches to the vendored writing skill**, so vendor updates can't silently drop them.

## Sources

| Source | Revision | Local use |
|---|---|---|
| [Writing for Agents](https://github.com/mattpocock/skills) `skills/productivity/writing-for-agents` | `0986ebaf` | Separate writing dependency, qualified by local preferences |
| [Anthropic skill-creator](https://github.com/anthropics/skills) `skills/skill-creator` | vendored `9d2f1ae1` | Creation and eval loop in both harnesses; `references/skill-creator-opencode.md` maps its Claude Code mechanics to OpenCode. Recheck the mapping when the vendored revision changes |
| [OpenCode commands](https://opencode.ai/v2/docs) documentation and implementation | local source surveyed 2026-08-06 | `references/opencode-commands.md`; recheck version-sensitive mechanics when changing command support |
| [Claude Code skills](https://code.claude.com/docs/en/skills), [OpenCode V2 skills](https://opencode.ai/v2/docs/skills), [Codex skills](https://learn.chatgpt.com/docs/build-skills) | read 2026-10-11 | Invocation-control mechanics in the skill |
| [Agent Skills best practices](https://agentskills.io/skill-creation/best-practices) | read 2026-10-11 | Background; not copied in |
