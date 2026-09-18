---
name: skill-authoring
description: Design, create, revise, review, or evaluate an agent skill or explicit command from intended behavior. User-invoked.
disable-model-invocation: true
argument-hint: "What skill or command are you authoring, reviewing, or evaluating?"
---

# Skill Authoring

Turn intended agent behavior into useful, economical instructions. Preserve human intent, authoring principles, discriminating evaluation scenarios, and maintenance knowledge that is costly to reconstruct. Load and update material relevant to the current change.

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

Start with the target's runtime instructions and its authoring record's `PRINCIPLES.md` and `VISION.md`, when present. Read the principles before proposing changes; they guide authoring, not ordinary execution of the target skill. Select further material by the task:

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

When authorized work includes commits, commit changed runtime files in their repository and changed authoring records in the record repository. Keep the commits separate, report both commit identifiers, and do not leave an accepted change half-committed. Do not change an accurate record only to create a companion commit.

### Preserve the next author's context

Every skill authoring record requires `PRINCIPLES.md`, including small skills. Create it when authoring a new skill or next revising an existing one that lacks it; migrate only the target, not other skills. A read-only assessment reports a missing required file without creating it. Explicit-command records may use the same form, but this requirement applies to skills.

Record responsibilities:

- `VISION.md`: purpose, intended outcomes, and scope boundaries.
- `PRINCIPLES.md`: concise, target-specific rules for future authoring choices, preserving the human's priorities, consequential tradeoffs, and their rationale. Extract these from accepted discussion and existing intent rather than inventing requirements to fill the file. Move principles out of vision instead of duplicating them. Keep procedures in the runtime artifact and measurements in supporting evidence. Principles are human-owned and can change through an explicit accepted direction.
- `EVALS.md`: only concrete scenarios and observable expectations that distinguish success from plausible failure. Group by behavior, consolidate overlapping cases, and express lessons from failures as reusable scenarios. Keep run results, status, session IDs, hashes, activation reports, and revision history out of this file.

Keep principles in the resolved authoring record, outside runtime discovery and ordinary skill loading. Beyond required principles and external identity, a trivial skill may omit a record document that adds no useful information. Preserve enough intent and examples to assess future changes without empty templates or copied generic guidance.

Create `MAINTENANCE.md` only when an outside source materially influences the skill and future upkeep needs that relationship explained. Identify the source, adopted revision when applicable, intentional adaptations, and what a refresh must compare or preserve. Omit it when no such relationship needs explanation. Generic authoring procedures belong here or in Writing for Agents; runtime rules and readily discoverable configuration stay with their owners.

Do not require `LOG.md`, create a replacement decision file by default, or append an entry for every edit. Preserve still-relevant rationale beside the concern it explains: authoring tradeoffs in principles, source adaptations in maintenance, and failure conditions in evaluation scenarios. A separate decision record needs substantial reasoning that future authors are likely to revisit. Treat existing logs as historical material to consult when relevant; assess useful content and obtain authority before deleting or consolidating history. An authorized cleanup does not require moving removed material into another archive.

Additional evidence files need a concrete purpose and a reading condition. Keep substantial traces outside routine authoring context. Restatement earns its place only when it contributes a distinct decision, testable assertion, or maintenance fact. Let Git preserve ordinary textual history.

## 3. Check behavior

Check the change against the target's principles and surface unresolved conflicts with the requested direction. Apply Writing for Agents' pruning tests to runtime instructions and references. For records, ask whether each passage helps a future author decide or verify something. Remove stale material and repetition that adds no distinct value.

Check structure, reference links, and coherence for the changed branches. Evaluate applicable invocation and execution behavior separately: realistic positive and adjacent prompts for model invocation, explicit invocation and argument handling for commands, and observable outcomes after loading.

When the task requires live execution, session-based verification, or revision from an observed failure, read [testing workflow](references/testing-workflow.md). It owns isolated runs, neutral subagent prompts, evidence classification, comparisons, and reruns. Static review and writing scenarios do not require that reference.

Report observed results in the task report, supported by existing artifacts and execution traces, with the artifact revision, model, harness, relevant configuration, and limitations. Prefer artifacts and traces to self-report. Identify untested behavior there; static coherence does not prove execution quality. Create a separate durable results report only for an authorized concrete reuse need, never as a routine authoring record or a substitute log.

## 4. Hand off

For implementation, report changed files, behavioral rationale, checks performed, unresolved uncertainty, and activation or promotion still needed. For assessment, prioritize findings and distinguish recommendations from accepted changes.

Finish when the requested outcome is met, relevant behavior has a result or an explicit untested status, and the record preserves what the next author needs without requiring unrelated history. Environment guidance owns activation procedures.
