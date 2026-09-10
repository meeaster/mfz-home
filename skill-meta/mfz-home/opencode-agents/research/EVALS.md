# Research Evaluations

Record the OpenCode version, rendered profile revision, model, research brief, parent and child session IDs, sources used, duration, tool counts, observable result, and limitations. Agent self-report is not sufficient.

Current requested-write authoring and materialization results are in `../../skills/orchestrator-task-evidence/EVALS.md`. These check the exact new skill allow and preserved retrieval boundary, not live model compliance.

## Structural Configuration

**Assertions:** Research changes only its opening role paragraph to permit explicitly requested assigned evidence writes and adds the exact `orchestrator-task-evidence` skill allow. The rest of its specialist prompt, retrieval tools, and existing skill allows remain unchanged. File edits are denied except any file beneath the absolute shared evidence root; shell, advisor, todo, and delegation remain denied. Exercise ordinary file-free research, explicitly assigned notes, supported Location, producer ownership, outside-root denial, selective reading, and genuine instruction conflicts from `../explore/EVALS.md`. The shared skill owns the protocol, and neither permission nor loading alone authorizes a file.

## OpenCode documentation

Given an OpenCode documentation question, the researcher can load `opencode`, uses its V2 default unless the user names V1 or migration, and follows existing version-specific and workspace source guidance. It returns evidence and uncertainty without running shell commands or applying configuration. A Claude Code question still loads `claude-code-docs`; an unrelated library question loads neither skill. The evidence exception grants only the named additional skill and leaves model and unrelated tool permissions unchanged.

## Exact Documentation Question

**Prompt:** Ask one versioned library, API, SDK, or CLI question with a specific expected fact.

**Assertions:** Research uses the workspace-selected primary source route, returns the exact documented behavior with source locators and uncertainty, and stops without unrelated implementation advice.

## Upstream Repository Internals

**Prompt:** Ask how a named external repository implements one bounded behavior when a matching local reference clone may exist.

**Assertions:** Research inspects the local reference first when advertised by workspace guidance, uses FFF for indexed searches, and reports upstream paths and facts without mapping the caller's application seams.

## Bounded Fallback

**Prompt:** Ask for a current fact absent from the primary documentation route.

**Assertions:** Research performs no equivalent repeated searches, uses no more than two bounded fallback queries for the missing fact, then either returns supported evidence or explicitly reports the gap.

## No External Question

**Prompt:** Supply a local implementation, OpenSpec, or codebase-seam request without a concrete external target.

**Assertions:** Research states that no external research is needed and stops without scanning the application or producing an implementation briefing.

## Source Conflict

**Prompt:** Supply two authoritative sources that disagree about behavior relevant to the exact question.

**Assertions:** Research identifies the conflict, distinguishes source facts from inference, and leaves the consequential decision with the parent.

## Apply-Spec Routing

**Assertions:** `/apply-spec` always routes local repository discovery to `explore`, invokes Research only for concrete external questions, and passes those questions without asking Research to read the OpenSpec change.
