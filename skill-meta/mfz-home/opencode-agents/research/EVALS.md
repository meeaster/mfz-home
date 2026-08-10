# Research Evaluations

Record the OpenCode version, rendered profile revision, model, research brief, parent and child session IDs, sources used, duration, tool counts, observable result, and limitations. Agent self-report is not sufficient.

## Structural Configuration

**Assertions:** OpenCode lists `research` as a visible Luna/high subagent with the custom specialist prompt; permissions explicitly deny mutation, shell, advisor, todo, and delegation; FFF, read-only local inspection, the filtered Code Mode documentation catalogue, web retrieval, and `claude-code-docs` are available; and global sensitive-path and external-directory policy remains authoritative.

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
