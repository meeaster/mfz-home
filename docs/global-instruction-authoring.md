# Global instruction authoring preferences

This document records the preferences established during the GPT-6 instruction reset for the Personal Mindframe-Z home. It guides future discussion and editing of global instructions and their on-demand companion files. It is a human-facing reference, not a skill or an automatically loaded instruction file.

These preferences apply to the global configuration in this home. Repository-local `AGENTS.md` files have their own purpose and conventions. The MFZ guide remains responsible for configuration mechanics.

## Purpose

- Keep instructions easy for the human to inspect, question, and change.
- Supply environment knowledge and deliberate preferences that help the agent do useful work.
- Start with a small instruction set when reconsidering behavior for a new model.
- Add guidance in response to observed problems or explicit preferences, rather than assumptions about what a model needs.
- Preserve the previous text before a substantial reset so useful rules can be recovered.

## Structure

- Group instructions by topic, such as host environment, browser automation, or Git and CI.
- Label each bullet by its primary effect: `Fact`, `Tool`, `Behavior`, or `Style`.
- Express one independently changeable fact or instruction per bullet.
- Split a fact from a behavioral rule when either might be changed independently.
- Include only headings and labels needed by the content. Empty sections invite unnecessary instructions.
- Keep explanations, historical rationale, and evaluation results in supporting documentation.
- Use fenced blocks for commands when they are easier to read than inline text.

The topic answers “What is this about?” The label answers “How does this affect the agent?” This preserves the convenience of related guidance in one place while exposing the rules that steer behavior.

## Labels

- **Fact:** Information about the environment, available material, ownership, or tool capabilities. Example: “This environment runs in WSL with a Windows host.”
- **Tool:** Selection or use of a capability, including a skill, command, source, or subagent. Example: “Use `visual-explainer` only when the user explicitly requests that skill.”
- **Behavior:** A decision preference, constraint, or required action. Example: “Coordinate operations that affect shared browser state.”
- **Style:** Presentation or formatting of an output. Example: “Use Conventional Commits.”

Labels describe the primary effect, not priority or authority. Tool and style instructions also change behavior in the broad sense. A fact can influence decisions without prescribing a method. Avoid elaborate multi-label classification in the live file.

For writing rules, make the output explicit. A preference for replies to the user should not silently become a rule for code, documentation, or other saved artifacts.

## Concise wording

- State the relevant condition and action directly.
- Keep qualifiers and exceptions that change the instruction's meaning.
- Prefer plain words over invented terminology or compressed shorthand.
- Remove repetition before shortening individual sentences.
- Keep each rule understandable without requiring the reader to reconstruct omitted context.
- Give every bullet a concrete purpose: supply a needed fact, change a decision, select a tool, define a constraint, or shape an output.
- Evaluate an instruction by the work it causes or prevents across a completed task. Consider additional reads, skill loads, delegation, verification, and repair alongside its length.

Concise bullets are an authoring preference for human inspection. They are not established proof of better model performance. A short rule with several hidden obligations can be harder to evaluate than separate explicit bullets.

## What belongs globally

- Keep environment facts the model cannot reliably infer, such as WSL behavior, source-of-truth locations, and local ownership conventions.
- Keep deliberate user preferences when they remain useful across tasks or models.
- Question generic advice that may already be supplied by the model's harness, tool instructions, or a relevant skill.
- Reconsider work methods, delegation rules, and writing prescriptions when model behavior changes.
- Judge placement by useful context and readability, not by whether every instruction applies to every task.
- When moving guidance behind a pointer, make the loading condition recognizable before the agent needs the omitted information. Check for missed and unnecessary loads.

A short specialized rule can belong inline. The GitHub Actions guidance was retained because a pointer and separate document would add little benefit. Progressive disclosure is useful when it removes substantial branch-specific detail; it is not a requirement to move every specialized instruction out of the global file.

Environment facts also need maintenance. A path, command, or capability can become stale even if it is less model-dependent than a behavioral preference.

## Compare with existing instruction layers

- Inspect the effective harness prompt for the model and version being used.
- Compare local tool guidance with the current tool skill before consolidating it.
- Distinguish repeated instructions from intentionally stricter preferences.
- Check whether custom agent prompts replace or extend the default prompt.
- Account for instructions supplied by MCP servers, loaded skills, and repository-local files.

Removing a local instruction does not necessarily remove the behavior. For example, Context7 can supply its own documentation-use instructions. OpenCode also supplies communication, temporary-directory, and model-specific guidance. A slimmer Mindframe-Z file therefore exposes the remaining configured defaults, not an unprompted model.

The browser comparison illustrates a meaningful distinction: the tool supports an implicit MCP session, while the old local rule required explicit sessions for every task. The revised local rule names concurrent tasks or agents sharing an MCP process as the condition that needs separate explicit sessions.

## Skills and workflow dependencies

- Treat removing a global loading rule, disabling a skill, and rewriting a skill as separate changes.
- Check direct consumers before disabling a skill.
- Update stale pointers when their target is disabled.
- Keep disabled source material available when restoration may be useful.
- Record workflow assumptions affected by a reset instead of claiming unchanged behavior without evidence.
- Split a skill when distinct uses justify separate guidance; avoid creating replacement skills merely to complete a taxonomy.

During this reset, `session-brief` and `session-derived-knowledge` were disabled in the Personal profile. Global triggers for `context-transfer` and `development-principles` were removed, while the skills remained available to specialist consumers. A possible human-focused and agent-focused split of Context Transfer was deferred.

## Observe and evaluate

- Distinguish source inspection, user preference, hypotheses, and observed results.
- In supporting records, distinguish deliberate preferences, workflow requirements, and corrections for observed failures. For failure-specific rules, record the supporting evidence and changes that would justify reconsideration.
- Use normal work to identify behaviors worth correcting.
- Restore or add the smallest instruction that addresses an observed problem.
- For future OpenEvals comparisons, hold the model, harness, task, tools, and permissions consistent where practical.
- For efficiency comparisons, measure billing-weighted cost across the completed task, including child agents and corrective work. Evaluate completion quality and human intervention alongside cost.
- Judge artifacts and observable actions, including whether differences materially affect the outcome.
- Include human judgment for preferred writing and interaction style.
- Record the instruction revision and relevant environment for each comparison.
- Use fresh sessions for cleaner comparisons; earlier instructions and loaded skills remain part of an ongoing conversation.

OpenEvals comparisons were discussed but deferred. Neither the reset nor this writing structure has been shown to improve model performance through behavioral evaluation.

## Related records

- [Global instruction audit](gpt-6-global-instruction-audit.md): baseline classification, OpenCode prompt findings, accepted reset decisions, and activation checks.
- [Original shared instructions](gpt-6-global-instructions-backup.md): verbatim backup of the shared file before the reset.
- [Earlier context-reduction work](mindframe-z-context-reduction.md): background on capability indexes and on-demand instruction references.

The separate [skill structuredness note](skill-structuredness.md) discusses a hybrid prose-and-bullet approach for skills. This global-instruction preference does not impose a new structure on skills or replace their authoring guidance.
