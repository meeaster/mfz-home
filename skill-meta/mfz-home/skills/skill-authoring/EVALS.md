# Evaluations

These scenarios specify expected behavior. They are not evidence that the current revision passes. Live results must identify the revision, model, harness, configuration, observed artifacts or trace, and limitations.

## Narrow revision and selective loading

Request a wording clarification to an existing skill with a long log, unrelated maintenance guidance, and several evaluation branches.

Expect the author to read the runtime instructions and intent, select affected scenarios, and leave unrelated history unloaded. The clarification preserves meaning, updates only affected content, and generates no routine log entry. If the wording exposes an unexplained constraint, the author searches related rationale before deciding.

## Small self-contained skill

Request a compact skill with a clear goal and no external upkeep.

Expect concise intent and useful acceptance examples where they add information. No maintenance, log, decision, or empty evidence file is created to satisfy a template. The author may omit a default document that adds no distinct value, while keeping the intended behavior assessable.

## Sparse versus rich intent

Request a skill first with an ambiguous consequential boundary, then with that boundary settled in supplied evidence.

Expect a targeted question in the first case and use of the supplied decision in the second. Reversible assumptions are stated. The author chooses a form from behavior and does not convert its own design preferences into human requirements or copy the supplied evidence into runtime prose.

## External-source refresh

Request an update to a skill adapted from a pinned upstream source that has changed behavior.

Expect maintenance guidance to identify the adopted revision, local departures, and refresh checks. The author compares source changes against local intent, updates affected scenarios, and preserves consequential adaptation rationale. Generic authoring instructions are not copied into maintenance.

## Review without repair

Request a full review of a skill with contradictory intent and runtime behavior, plus no maintenance or log file.

Expect broader relevant package review, a reported contradiction, and no writes. Optional-file absence is not a finding. Recommendations distinguish behavioral risks from cosmetic preferences.

## Historical rationale

Request a revision that would reverse a previously rejected approach described in an existing log.

Expect the author to find and assess the related rationale before making the decision. It preserves a still-relevant reason beside the current concern, or retains a substantial separate decision record when justified. It neither loads unrelated history by default nor deletes historical records without authority.

## Distinct record value

Review a package whose vision repeats execution steps and whose evaluations paraphrase instructions without circumstances that could expose failure.

Expect vision to retain human purpose and tradeoffs, and scenarios to gain discriminating inputs and observable expectations. Useful overlap, such as a review-preserves-files acceptance case, survives. The author does not create another general behavior specification or claim that written scenarios have passed.

## Record placement and identity

Create or revise a skill in environments with no configured root, a configured external root, and competing local and external records.

Expect `<skill>/meta` in the first case and `<root>/<repository-name>/skills/<skill-name>` plus `TARGET.md` in the second. The third requires an authoritative-location decision. Existing external identity is verified against the repository. Ordinary execution does not load these records.

## Explicit command boundary

Request a compact slash-only command, then a workflow needing model discovery and supporting resources.

Expect command mechanics to load for the first task, one rendered prompt-template file, and explicit `subtask: false` unless isolation is intended. Records stay outside command discovery, including for a user-selected path. The second task remains a skill. Argument handling and explicit invocation are checked separately from model invocation.

## Authoring context boundary

Create another skill through Skill Authoring without requesting live tests.

Expect Writing for Agents and the planning guidance to load. Skill Authoring's own record and testing workflow remain unloaded. Command mechanics load only if a command is a genuine candidate; patterns require a named structural uncertainty.

## Live evaluation and causality

Request a live evaluation, including a staged follow-up or a baseline comparison when incremental value is the question.

Expect isolated task files, ordinary user prompts without coaching the behavior under evaluation, captured traces and artifacts, and separately assessed invocation and execution. Independent runs use fresh context; staged work preserves the intended fixture. Comparisons keep the model, harness, effort, fixture, and assertions aligned. Findings distinguish skill effects, model variance, evaluation defects, environment noise, and inconclusive evidence. An authorized fix is followed by the same scenario and an adjacent regression case.

## Observed results

The selective-record revision introduced in September 2026 has no live evaluation results yet. Static checks can establish link and textual coherence only.

Prior-record reports describe successful July 2026 creation and context-boundary runs with OpenCode and Sol Medium, and August 7 external-record creation and reuse with OpenCode 1.18.14 and Luna High. Those runs tested the former mandatory-four-document contract and do not validate this revision. Consult `LOG.md` for historical composition rationale or `DOGFOODING.md` for provisional observations when investigating a related issue.
