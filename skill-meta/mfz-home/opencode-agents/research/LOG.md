# Log

## 2026-08-08 - Evidence-Grounded Refactor

- Kept Research as a distinct external-documentation role after a read-only audit found 60 native calls, 53 completions, and strong results for APIs, SDKs, CLIs, integrations, protocols, and upstream repositories.
- Replaced the 92-line defensive prompt with a compact positive contract that delegates source ordering to workspace instructions and preserves one hard boundary around local implementation work.
- Added explicit read-only capability denies, FFF, current documentation tools, and the Claude Code documentation skill while leaving path policy to global configuration.
- Kept sensitive-path and external-directory policy in global configuration rather than duplicating it in the agent.
- Added a bounded fallback rule after a current Luna/high run used 30 web searches and 36 fetches with 15 errors before returning a useful result.
- Kept Luna/high as the current policy while noting that only four audited children exercised that configuration.
- Required callers to provide exact external questions rather than whole OpenSpec changes after historical sessions produced local seam analysis and one complete implementation briefing.
- Source audit: Explore child `ses_01f9df6d2ffetdjIcTSSjnvbO2`, covering Research usage from 2026-06-06 through 2026-08-04.
- Enabled the filtered Code Mode gateway after rendered-profile probe `ses_01f8519b6ffecPcqQ2AnXmTgzW` could only inspect Context7 resources, then fell back to one web search and one official fetch instead of calling the configured documentation tools.
- Replaced the agent-level wildcard deny with explicit capability denies after upstream probe `ses_01f817a4effe9I6Tu9r0Q9upJe` showed that the wildcard overrode global reference-directory access and forced five remote fetches after local reads failed.
- Tightened FFF and skill-use discipline after isolated-reference probe `ses_01f7d1814ffeOC1TWjZUcdptK7` successfully used global reference access and returned accurate upstream paths, but made 12 Code Mode calls and 15 reads; the React probe also loaded `claude-code-docs` despite having no Claude Code question.

## 2026-08-08 - Rendered Dogfooding

- Environment: OpenCode `1.18.15`; `mfz-home` base revision `3ba0d67` with the Research changes uncommitted; rendered Personal profile applied; `mfz smoke-opencode`, `mfz doctor`, all 159 Vitest tests, and TypeScript type checking passed.
- Exact documentation: parent `ses_01f77e8b4ffe2k9s577rcbIVL0`, Research child `ses_01f77ced8ffehGd4ekKcuIP2Cp`, Luna/high, about 39 seconds, three Code Mode calls and one official-page fetch. It used Context7 library `/react/react`, cited React's `useEffectEvent` reference, returned the requested guarantee and restriction, and did not load an unrelated skill. Limitation: it issued two similar Context7 queries before the official fetch and added one short alternative-API suggestion beyond the direct question.
- No external question: parent `ses_01f823cbffferVjUrZstZO2cJz`, Research child `ses_01f821cd7ffeuaTcdFJAr8aov4`, Luna/high, about 7 seconds, zero tools. It stated that no external research was needed and stopped without local discovery or implementation advice.
- Upstream repository: parent `ses_01f7a5497ffe8VJTKGAv2XB6yu`, Research child `ses_01f7a188effeVi548qMr236rLH`, Luna/high, about 24 seconds, one FFF search and one targeted read against isolated clone revision `fe82a1b6ca4f535beb973b0867017e3f639f85ed`. It cited `packages/opencode/src/cli/cmd/run.ts:595-619`, separated fact from inference, and stopped once the bounded behavior was supported.
- The first direct CLI probe was discarded because `opencode run --agent research` rejects a subagent as a primary agent and falls back to the configured default. Live evaluations must delegate Research through native `task` and verify the child session's recorded agent and model.
