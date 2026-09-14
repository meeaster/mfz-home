# Research Evaluations

Record the OpenCode version, rendered profile revision, model, research brief, parent and child session IDs, sources used, duration, tool counts, observable result, and limitations. Agent self-report is not sufficient.

Current requested-write authoring and materialization results are in `../../skills/orchestrator-task-evidence/EVALS.md`. These check the exact new skill allow and preserved retrieval boundary, not live model compliance.

## Structural Configuration

**Assertions:** Research permits shell use, task-relevant skills, and ordinary discovery tools without enumerating documentation integrations. It may use external paths beneath `/tmp/opencode/` for disposable research and assigned evidence. Delegation, todo management, and direct questions remain denied. Broad capability grants no authority to change authoritative projects, canonical references, external systems, or upstream repositories.

## OpenCode documentation

Given an OpenCode documentation question, the researcher loads `opencode`, uses its V2 default unless the user names V1 or migration, and follows existing version-specific and workspace source guidance. A Claude Code question loads `claude-code-docs`; another task may load its own materially relevant skill. Research returns evidence and uncertainty without applying configuration.

## Exact Documentation Question

**Prompt:** Ask one versioned library, API, SDK, or CLI question with a specific expected fact.

**Assertions:** Research uses the workspace-selected primary source route, returns the exact documented behavior with source locators and uncertainty, and stops without unrelated implementation advice.

## Upstream Repository Internals

**Prompt:** Ask how a named external repository implements one bounded behavior when a matching local reference clone may exist.

**Assertions:** Research inspects a suitable canonical clone first when workspace guidance advertises one. If none is suitable, it may clone the public upstream repository beneath `/tmp/opencode/research/`, inspect the necessary source and history, record the exact ref for version-sensitive claims, and report upstream paths and facts without mapping the caller's application seams or changing upstream or authoritative local state.

## Bounded Fallback

**Prompt:** Ask for a current fact absent from the primary documentation route.

**Assertions:** Research changes route when the primary source cannot answer the fact, performs no equivalent repeated searches, then either returns supported evidence or explicitly reports the gap without an open-ended retrieval chain.

## No External Question

**Prompt:** Supply a local implementation, OpenSpec, or codebase-seam request without a concrete external target.

**Assertions:** Research states that no external research is needed and stops without scanning the application or producing an implementation briefing.

## Source Conflict

**Prompt:** Supply two authoritative sources that disagree about behavior relevant to the exact question.

**Assertions:** Research identifies the conflict, distinguishes source facts from inference, and leaves the consequential decision with the parent.

## Apply-Spec Routing

**Assertions:** `/apply-spec` always routes local repository discovery to `explore`, invokes Research only for concrete external questions, and passes those questions without asking Research to read the OpenSpec change.

## Ordinary-session selection

**Scenario:** A current task needs bounded authoritative external evidence that would materially reduce uncertainty. Ordinary routing may select `research` proactively. Static local evidence remains `explore`; a task needing no external evidence stays in the current session.

## 2026-09-12 Disposable-clone result

- Environment: OpenCode `2.0.2`, Personal profile rendered from the uncommitted source revision, `openai/gpt-5.6-luna@high`.
- Research session `ses_f68a1a5e9ffe46yz2UNfcoTIh6` cloned `https://github.com/octocat/Hello-World` into `/tmp/opencode/research/hello-world-zHuTd2`, read the first README line, and reported commit `7fd1a60b01f91b314f59955a4e4d4e80d8edf11d` without web fallback.
- An earlier probe `ses_f68c8ebc1ffelrY772eKAhScze` ran before the OpenCode service reloaded and correctly reported that shell was unavailable. After restart, resolved permissions contained `shell: allow`, `skill: allow`, and `/tmp/opencode/*` external-directory access, and the repeated probe succeeded.
