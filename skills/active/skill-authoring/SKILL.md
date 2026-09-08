---
name: skill-authoring
description: Design, create, revise, review, or evaluate an agent skill or explicit command from intended behavior. User-invoked.
disable-model-invocation: true
argument-hint: "What skill or command are you authoring, reviewing, or evaluating?"
---

# Skill Authoring

Turn intended agent behavior into useful, economical instructions. Preserve human intent, discriminating evaluation scenarios, and maintenance knowledge that is costly to reconstruct. Create additional records only for a concrete need. Load and update material relevant to the current change.

Load `writing-for-agents` and read [planning guidance](references/openai-skill-creation.md) before authoring work. Follow Writing for Agents' `SKILL-MECHANICS.md` pointer for skill packaging and invocation. Read [OpenCode command mechanics](references/opencode-commands.md) when a command is the target or a genuine candidate.

Read Skill Authoring's own record only when assessing or changing Skill Authoring itself, using the same selective-loading rules as for any target.

## 1. Establish intent and authority

Determine the requested outcome. Creation or revision authorizes implementation within the request. Review, diagnosis, evaluation, and design produce findings or proposals unless the user also authorizes changes. For maintenance, establish which outcome the user wants.

Inspect destination instructions and the target. Resolve one authoring record:

1. Use the user's selected location.
2. Otherwise, if environment guidance declares a record root, derive `<root>/<repository-name>/<artifact-kind>/<artifact-name>`. Use the Git root basename, `skills` or `opencode-commands`, and the declared skill name or logical command name.
3. Otherwise, use `<skill>/meta` or a destination-owned `meta/` beside an unrendered command source package. Ask for a safe location if a command has only a runtime file.

External records contain a short `TARGET.md` identifying the repository, artifact kind, and source path. Verify that identity against the repository. Surface competing local and external records or ambiguous identities for a user decision. Command records must stay outside rendered command-discovery paths, including when the user selects the location.

### Load by relevance

Start with the target's runtime instructions and concise `VISION.md`, when present. Select further material by the task:

| Task | Additional context |
|---|---|
| Narrow revision | Affected evaluation scenarios and references |
| Upstream or dependency refresh | Relevant maintenance guidance, source changes, and affected scenarios |
| Regression or unexplained constraint | Related evidence and historical rationale |
| Full assessment or redesign | Broader runtime and record review for coherence and coverage |

Search headings or relevant terms before reading a large record in full. Expand when a conflict, dependency, or unexplained constraint could affect the decision. A file's existence alone does not require loading it. Missing optional records are not defects.

Establish the problem, intended outcome, invocation, representative uses, important variation, authority boundaries, and failure conditions. Use available evidence before asking questions. For revisions, distinguish tuning from redesign and reconcile the proposal with human intent. State reversible assumptions; ask about unresolved choices that change the behavioral contract. Agent implementation choices do not become human requirements without acceptance.

## 2. Shape or assess the artifact

Choose the form from behavior. Use a skill for model discovery, reusable cross-skill guidance, or packaged resources. Use an OpenCode command for an explicitly slash-invoked workflow that fits one prompt-template file; set `subtask: false` unless fresh context is intentional.

Write the smallest effective instructions. Add scripts, references, assets, or harness metadata only when execution needs them. Disclose branch-specific detail behind explicit reading conditions. Keep ordinary reference filenames lowercase and descriptive, and the directory flat unless grouping provides a real boundary. Consult patterns only to resolve a named structural uncertainty.

Keep portable behavior free of undeclared machine or workspace assumptions. Deliberately environment-specific artifacts must declare their boundary.

For assessment, return evidence-backed findings without repairing files. For implementation, update the runtime artifact and affected record content; a change does not require touching every file.

### Preserve the next author's context

The default record contains:

- `VISION.md`: purpose, human priorities, consequential tradeoffs, and boundaries. Keep it concise; leave execution mechanics in the runtime artifact.
- `EVALS.md`: concrete scenarios and observable expectations that distinguish success from plausible failure. Separate expected behavior from observed results. An unexecuted scenario is useful but is not evidence of success.

These are defaults, not a file-completeness requirement. A trivial skill may omit a record document that would add no useful information. Preserve enough intent and examples to assess future behavioral changes without manufacturing boilerplate.

Create `MAINTENANCE.md` when external provenance, intentional adaptations, or non-obvious upkeep warrants it. Record adopted revisions and how to evaluate a refresh. Generic authoring procedures and readily discoverable configuration do not justify this file.

Do not require `LOG.md`, create a replacement decision file by default, or append an entry for every edit. Preserve still-relevant rationale beside the concern it explains: tradeoffs in vision, upstream departures in maintenance, and demonstrated failures in evaluation scenarios. A separate decision record needs substantial reasoning that future authors are likely to revisit. Treat existing logs as historical material to consult when relevant; assess useful content and obtain authority before deleting or consolidating history.

Additional evidence files need a concrete purpose and a reading condition. Keep substantial traces outside routine authoring context. Restatement earns its place only when it contributes a distinct decision, testable assertion, or maintenance fact. Let Git preserve ordinary textual history.

## 3. Check behavior

Apply Writing for Agents' pruning tests to runtime instructions and references. For records, ask whether each passage helps a future author decide or verify something. Remove stale material and repetition that adds no distinct value.

Check structure, reference links, and coherence for the changed branches. Evaluate applicable invocation and execution behavior separately: realistic positive and adjacent prompts for model invocation, explicit invocation and argument handling for commands, and observable outcomes after loading.

When the task requires live execution, session-based verification, or revision from an observed failure, read [testing workflow](references/testing-workflow.md). It owns isolated runs, neutral subagent prompts, evidence classification, comparisons, and reruns. Static review and writing scenarios do not require that reference.

Record observed results with the artifact revision, model, harness, relevant configuration, and limitations. Prefer artifacts and traces to self-report. Mark untested behavior explicitly; static coherence does not prove execution quality.

## 4. Hand off

For implementation, report changed files, behavioral rationale, checks performed, unresolved uncertainty, and activation or promotion still needed. For assessment, prioritize findings and distinguish recommendations from accepted changes.

Finish when the requested outcome is met, relevant behavior has a result or an explicit untested status, and the record preserves what the next author needs without requiring unrelated history. Environment guidance owns activation procedures.
