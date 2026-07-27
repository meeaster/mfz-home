# Log

## 2026-07-25 - Initial Design

- Chose user invocation because skill authoring is deliberate work and should not consume invocation context on unrelated turns.
- Made `/writing-great-skills` a required loaded dependency to preserve the complete doctrine rather than maintain a lossy duplicate.
- Made `/skill-patterns` conditional and placed it after preliminary structure so examples support design without anchoring every skill to known forms.
- Standardized `VISION.md`, `EVALS.md`, `MAINTENANCE.md`, and `LOG.md` for every authored skill.
- Placed the process artifacts under `meta/` because they describe the skill throughout its life but do not belong in ordinary runtime context.
- Kept process artifact filenames uppercase and the category directory lowercase.
- Defined portability as freedom from private machine, workspace, project, and knowledge-system assumptions; shareable skill dependencies remain acceptable.
- Assigned Git ordinary textual history and `LOG.md` selected behavioral rationale, observed effects, and reversals.
- Renamed the skill from `skill-workbench` to `skill-authoring` because authoring directly describes its full create, revise, evaluate, and maintain scope.

## 2026-07-26 - Consolidated References And Assessment Routing

- Bundled the complete `writing-great-skills` doctrine because its user-invoked configuration made cross-skill loading unreliable and a summary risked information loss.
- Moved the pattern catalogue into conditional references so skill authoring is one coherent skill rather than several cooperating skills.
- Preserved upstream snapshot provenance and an explicit refresh procedure for later updates.
- Separated assessment from implementation so review, diagnosis, evaluation, and design do not imply authorization to edit.
- Added a consequential-decision gate that permits stated reversible assumptions while reserving behavioral-contract choices for the user.
- Added evaluation coverage for doctrine loading, non-mutating review, and maintenance.

## 2026-07-26 - First Live OpenCode Evaluation

- Ran Skill Authoring with Sol Medium in an isolated task directory and inspected the complete OpenCode session before deleting the disposable session.
- Confirmed that the bundled doctrine loaded first, the generated package was coherent, all writes stayed isolated, and the four meta artifacts were substantive.
- Observed that the pattern catalogue and skeletons loaded without an explicit structural uncertainty and that Skill Authoring's own `meta/EVALS.md` leaked into ordinary runtime context.
- Tightened both context pointers and added a disclosed testing loop for isolated execution, trace-based verification, evidence classification, smallest authorized revision, and rerun.
- Treated two recovered validation-command failures as ordinary tool noise rather than evidence for another instruction change.
- A same-scenario rerun closed the original pattern and meta-context leaks but loaded `testing-workflow.md` during static creation; narrowed that pointer to explicit live harness execution, session-based verification, or trace-supported revision.
- A second same-scenario rerun passed every context-boundary assertion: only the doctrine loaded, all optional references remained disclosed, and all writes stayed in the isolated workspace.
- The adjacent non-mutating review also passed: it read the target package's meta files, loaded no optional Skill Authoring reference, issued no writes, and left every checksum unchanged.

## 2026-07-26 - Bounded Dogfooding Synthesis

- Added `DOGFOODING.md` specifically for Skill Authoring because repeated real uses produce behavioral evidence that is useful before it becomes an accepted decision.
- Defined it as a living synthesis rather than an append-only session log so many runs aggregate into coverage, active observations, confirmed patterns, and recently resolved items.
- Kept reusable scenarios in `EVALS.md`, accepted decisions in `LOG.md`, and raw session detail in harness stores or temporary artifacts.
- Established promotion and pruning rules so resolved observations leave the active frontier while Git preserves history.

## 2026-07-26 - Flattened Reference Layout

- Flattened `references/` because the nested source-skill directories added navigation without representing a runtime or maintenance boundary.
- Renamed every reference with a descriptive lowercase filename so context pointers and traces identify both its source or subject and its role.
- Removed standalone-skill frontmatter from the bundled Writing Great Skills doctrine because it is reference content inside Skill Authoring, not an independently invocable skill.
- Kept source provenance and refresh adaptations in `MAINTENANCE.md` rather than preserving upstream package structure in local paths.
- Added only the general flat, lowercase reference convention to the authoring workflow; the decision to adapt bundled skills remains local to this package.

## 2026-07-26 - External Guidance Composition

- Reversed the package-local bundling decision after comparing the current workflow with OpenAI, Anthropic, Sentry, and the user's source-grounded experience.
- Kept `VISION.md`, `EVALS.md`, `MAINTENANCE.md`, and `LOG.md` as the user's consistent skill-development contract.
- Restored Writing Great Skills as a separately managed dependency responsible for runtime writing quality instead of maintaining another adapted copy.
- Made configured OpenAI guidance conditional for concrete examples, degrees of freedom, reusable resources, scaffolding, structural validation, and Codex-specific metadata.
- Kept the default evaluation loop intentionally small: fresh harness process, captured session and parent events, artifact inspection, smallest supported revision, and rerun.
- Made testing capability-oriented so environment guidance owns agent CLI commands and session-store mechanics without named helper-skill dependencies.
- Kept Anthropic's benchmark and viewer machinery and Sentry's regression framework as optional sources rather than default runtime requirements.
- Verified the composition in a fresh OpenCode and Sol Medium process: Skill Authoring loaded the separate writing guidance, left its own meta and testing reference unloaded, and produced the requested five-file package without optional sidecars.

## 2026-07-26 - Bundled Guidance Restored

- Reversed the separate-skill runtime dependency because Writing Great Skills is user-invoked and cross-skill invocation is not a portable contract across OpenCode, Claude Code, and Codex.
- Restored Writing Great Skills as bundled reference content so the complete authoring path travels with Skill Authoring.
- Added a narrow agent-agnostic adaptation of OpenAI's deprecated Codex creator rather than installing a competing creator or copying its complete workflow.
- Kept OpenAI's concrete examples, degrees of freedom, reusable-resource planning, and layered validation; removed provider commands, initialization scripts, conflicting package policy, and duplicated writing doctrine.
- Preserved capability-oriented live testing so harness execution and session-inspection mechanics remain outside the portable core.
- Loaded both bundled guides at the start after a fresh trace showed that a visible pointer to required planning material was eagerly followed; their narrow, non-overlapping roles make the direct composition honest and predictable.

## 2026-07-26 - Optional Comparative Baselines

- Adapted Anthropic's baseline concept without adopting its Claude-specific evaluation suite.
- Use no skill as the baseline for a new skill and the previous revision for an update only when incremental value is the question.
- Keep the default trace-based loop unchanged for explicit contract verification, where a baseline would add cost without changing the decision.
