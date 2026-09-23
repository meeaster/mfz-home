# Global instruction audit for GPT-6

Status: first slim revision authored with user approval; runtime activation and checks are recorded below. A byte-for-byte backup of the original shared source is in `docs/gpt-6-global-instructions-backup.md`. The inventory and proposed layouts below describe the baseline and earlier discussion, not the current instruction text.

This document records what the Personal Mindframe-Z global instructions currently tell an agent, how each rule affects it, and what to examine before a smaller instruction set is tried. The aim is to observe GPT-6 on real work without losing environment facts or the reasons for existing boundaries.

The exact starting text is available at commit `a07693789dae875630b891bc3692fe726bc9469c`:

```sh
git show a07693789dae875630b891bc3692fe726bc9469c:instructions/AGENTS.md
git show a07693789dae875630b891bc3692fe726bc9469c:instructions/PERSONAL.md
git show a07693789dae875630b891bc3692fe726bc9469c:instructions/BROWSER.md
git show a07693789dae875630b891bc3692fe726bc9469c:instructions/PERSONAL_KNOWLEDGE.md
```

These are the source files for `profiles/base/profile.yml` and `profiles/personal/profile.yml`. MFZ also generates a capability index and pointers to on-demand instruction references in the rendered global instructions. The generated text is a separate source of context; this inventory does not classify every entry in that index. Repository-local `AGENTS.md` files and the agent's harness instructions are separate layers.

## Classify what a line does

- **Environment fact:** Tells the agent what exists, where it is, or how the host works. A fact can still contain an instruction; mark that separately.
- **Tool routing:** Chooses a tool, skill, source, command, or subagent and specifies when to use it.
- **Work behavior:** Changes how the agent decides, implements, or handles a task.
- **Boundary:** Limits authority, disclosure, scope, or changes to shared state.
- **Verification:** Requires a check or defines acceptable evidence of completion.
- **Conversation style:** Shapes answers addressed to the user.
- **Artifact style:** Shapes code, Markdown, documentation, commits, or another output saved outside the conversation.

These labels describe effects, not priority. A line can have several effects. In particular, a path is only an environment fact until the line also says to read it, prefer it, write there, or avoid another destination. The candidate actions below are questions for the first reduction pass, not decisions.

## Shared base instructions

Line numbers refer to the baseline `instructions/AGENTS.md` above. Each row covers one paragraph or bullet, including compound bullets whose parts may need different treatment.

| Line | Current instruction, abbreviated | Effect | First-pass question |
|---|---|---|---|
| 3 | WSL host, Windows binaries, invoke directly | Environment fact; tool routing | Keep the host fact; does the command preference need to be global? |
| 7 | OpenCode V2; use V2 commands and docs | Environment fact; tool routing | Keep the version fact; test whether the routing belongs with OpenCode guidance. |
| 8 | Context7 for library and API use; query and exclusions | Tool routing; work behavior | Compare against available tool guidance and observe whether mandatory routing improves answers. |
| 9 | Inspect reference clone before DeepWiki | Environment fact; tool routing; verification | Keep the index path discoverable; test the source-order policy separately. |
| 10 | Begin with one authoritative documentation source | Work behavior; tool routing | Test whether this improves focus or blocks useful corroboration. |
| 14 | Conventional Commits | Artifact style | Keep if it expresses a cross-model repository convention. |
| 15 | GitHub Actions release and SHA choices; checks; output syntax | Work behavior; artifact style; verification | Move task-specific detail behind a trigger if it need not load for every task. |
| 19 | Use `/tmp/opencode` when temporary storage is needed | Environment fact; work behavior | Check whether a host fact and destination rule both need global placement. |
| 20 | Exact, older dependency versions | Work behavior | Evaluate against current dependency practice, independent of model personality. |
| 21 | Flag stale docs and avoid hardcoded counts | Work behavior; artifact style | Test on representative documentation and code changes. |
| 22 | Run `impeccable detect`, not its internal script | Tool routing | Candidate for the relevant skill or on-demand reference. |
| 23 | Scope searches and prefer glob or grep | Work behavior; tool routing | Observe search quality with and without the procedural preference. |
| 24 | Narrow read-only APIs around sensitive fields | Boundary; work behavior | Preserve the disclosure boundary while assessing wording and placement. |
| 25 | Push back and clarify unclear intent | Work behavior; conversation style | Evaluate with ambiguous and ordinary action requests; avoid needless pauses. |
| 26 | Google style and STE for responses | Conversation style | Strong candidate for a small model-specific writing trial. |
| 27 | Single logical lines in Markdown prose | Artifact style; conversation style | Check whether this belongs to files, replies, or both. |
| 28 | Reuse loaded skill bodies; load after context loss | Tool routing; work behavior | Test whether the harness already supplies enough guidance. |
| 29 | `visual-explainer` requires explicit human selection | Boundary; tool routing | Preserve the explicit-invocation intent if the skill description suggests broader use. |
| 30 | Load `development-principles` for engineering judgment | Tool routing; work behavior | Assess trigger breadth separately from the skill's contents. |
| 34 | Loaded workflow may override ordinary subagent routing | Boundary; tool routing | Keep the precedence rule explicit if role routing stays. |
| 35 | Proactive evidence agents; session lookup distinctions | Tool routing; work behavior | Observe whether the model selects these roles well without detailed routing. |
| 36 | `operator` for settled operational work; no implied authority | Tool routing; boundary | Treat role selection and authority limitation as distinct claims. |
| 37 | Named roles require explicit request outside workflows | Tool routing; boundary | Test role selection without silently weakening the request boundary. |
| 38 | Brief fresh subagents with context and stop conditions | Work behavior; boundary | Preserve the missing-context fact; try a shorter brief rule if needed. |
| 39 | Load `context-transfer` for consequential handoffs | Tool routing; work behavior | Check whether the trigger remains useful or is already handled by the skill. |
| 40 | Tell UI designer to load `ui-ux-design` | Tool routing | Candidate for the role definition rather than every global session. |
| 41 | Hot reload and when to use `opencode run` | Environment fact; tool routing; verification | Move detailed validation mechanics behind OpenCode-specific guidance if possible. |
| 45 | Avoid `isRecord` guards; validate unknown input once | Work behavior; artifact style | Test as a coding preference, apart from tool and style changes. |
| 46 | Load and run `anti-slop` around JS or TS edits | Tool routing; verification; boundary | Keep a required check only if its scope, benefit, and ownership remain clear. |

The headings in this file group rules by topic today. They do not reliably group them by effect: `Working Preferences`, for example, mixes host paths, privacy, tool routing, user interaction, and prose style.

## Personal overlay

Line numbers refer to `instructions/PERSONAL.md` at the same baseline commit.

| Line | Current instruction, abbreviated | Effect | First-pass question |
|---|---|---|---|
| 3 | Use Personal scratch path unless user names another | Environment fact; work behavior; boundary | Keep the destination fact; assess whether the default rule belongs globally. |
| 7 | Store Wayfinder files in the workspace specs repository | Environment fact; work behavior; boundary | Keep the ownership rule for planning tasks; consider on-demand placement. |
| 8 | Keep an effort's files together under its Wayfinder directory | Work behavior; artifact style | Keep with the Wayfinder workflow if it is not needed for unrelated tasks. |
| 12 | Edit the source home and follow its local `AGENTS.md` | Environment fact; tool routing; boundary | Keep the source-of-truth pointer discoverable. |
| 13 | `personal` extends `base`; place shared behavior in `base` | Environment fact; work behavior | Keep the profile relationship; evaluate the placement rule separately. |
| 17 | Skill Authoring record root and owner | Environment fact; tool routing | Keep the location available to skill-authoring work; assess global placement. |

## A small reset to evaluate

Start with an inventory of situations where a rule demonstrably helps or hinders. Compare like-for-like tasks on the target model, with the same tools and permissions, and inspect the work rather than the model's account of its own behavior. A chat-writing task, a repository search, a coding change, and a delegated task exercise different instruction categories. Do not treat one result as proof for all of them.

For the first trial, preserve environment facts and explicit authority and privacy boundaries. Try reducing one cluster of model-shaping guidance at a time, beginning with conversation style or detailed tool-routing preferences. Keep source snapshots and record the exact instruction set and model for each observation. If a behavior worsens, restore only the smallest rule that addresses the observed failure.

OpenAI's [GPT-6 prompting guidance](https://developers.openai.com/api/docs/guides/latest-model.md#prompting-best-practices) identifies initiative, instruction following, writing style, delegation, and testing as areas to evaluate. Its behavioral observations focus on GPT-6 Astra; they are prompts for experiments here, not evidence that a particular rule fails on GPT-6 Sol or every harness.

## Account for OpenCode's own prompt

The local OpenCode V2 reference clone at commit `788f0affcbec8b3609eb943977e6da36ae02ddf9` supplies another instruction layer. Its built-in OpenAI prompt plugin selects `packages/core/src/plugin/system-prompt/gpt-astra.txt` when the model ID contains `gpt-6`, including GPT-6 Sol and Luna. Other GPT models select `packages/core/src/plugin/system-prompt/gpt.txt`. This is OpenCode's selection rule, not a claim that the three GPT-6 models behave alike.

The GPT-6 template already tells the agent to use clear, concise Markdown; lead with the main point; infer intent and finish authorized tasks; incorporate mid-turn steering; preserve unfamiliar user changes; calibrate tests; and avoid subagents unless the user or applicable instructions request them. OpenCode also renders tool-specific guidance into that template. The generic template has a smaller set of rules. See `packages/core/src/plugin/optimize.ts`, `packages/core/src/session/system-prompt.ts`, and both template files in that clone.

OpenCode builds a request from the agent's custom system text, if one is defined, or the default template, followed by its assembled initial instructions. The GPT prompt plugin skips its replacement when the selected agent has custom system text. The initial instructions include discovered `AGENTS.md` content, environment and date, and other registered contributors. On the OpenAI Responses route, OpenCode joins the system parts and sends them in the API's `instructions` field. See `packages/core/src/session/model-request.ts`, `packages/core/src/session/runner/llm.ts`, `packages/core/src/instructions/builtins.ts`, and `packages/ai/src/protocols/open-responses.ts`. These files explain the request assembled by OpenCode; they do not disclose any additional instructions the model provider may apply internally or the prompt used by the separate ChatGPT product.

This changes the first trial's priorities:

- The base rule to use `/tmp/opencode` overlaps the environment block that OpenCode already injects with its configured temporary directory. Check whether the generated value covers the same case before retaining the base rule.
- Base conversation-style rules on lines 26 and 27 extend the GPT-6 template's existing communication rules. Test whether the additional style prescription improves your actual replies.
- The global subagent selection rules on lines 34 through 40 add role-specific routing to a template that restricts unsolicited delegation. Test their usefulness as a group only after keeping their explicit-request and authority boundaries distinguishable.
- The global `anti-slop` check on line 46 has a narrower trigger and stricter completion requirement than the template's proportionate-testing rule. Treat it as a separate workflow decision, rather than calling the two rules duplicates.

Compare the installed OpenCode version and active agent configuration with this clone before relying on its exact wording in a live experiment. A custom agent system prompt or another plugin can change the effective prompt.

## Proposed layout for the rebuilt shared instructions

This is a discussion draft for `instructions/AGENTS.md`, not an approved replacement. Keep headings brief and use concise bullets. Each bullet should either change a decision or direct the agent to an otherwise hard-to-find fact at the moment that fact matters.

- **Environment and locations:** Host facts and workspace pointers that affect an action. Leave readily discoverable paths out unless the agent needs the pointer to know where to look.
- **Sources and tools:** When to consult a source, skill, or tool. Put branch-specific command syntax in its owning skill or on-demand reference.
- **Authority and delegation:** Who can authorize an action, when to use a role, and what context must cross a handoff. Keep permissions separate from role selection.
- **Work and verification:** Cross-task preferences that change implementation or the evidence needed to finish. Keep specialized checks near the tasks that need them.
- **Replies to the user:** Rules for conversation style and interaction that improve actual GPT-6 replies beyond OpenCode's template.
- **Files and artifacts:** Rules for code, documentation, Markdown, commits, or other saved output. Do not let a rule for saved text silently govern chat replies.

A useful bullet names its trigger and action directly: “For GitHub repository internals, inspect the matching local clone before using DeepWiki.” A statement of location alone is useful only if it routes the agent to material it would otherwise miss. Keep the reasons for a rule in this audit or its owning documentation, not in every always-loaded bullet. Decide which bullets deserve to remain only after comparing the rebuilt set with OpenCode's own prompt and the relevant skill instructions.

## First revision decisions

- Use topic headings with labeled bullets across all four instruction files: `Fact`, `Tool`, `Behavior`, and `Style`. Each bullet expresses one independently changeable fact or instruction. Omit empty categories.
- Keep the shared host facts, explicit Visual Explainer selection, constructive disagreement, dependency age preference, Conventional Commits, GitHub Actions requirements, and anti-slop checkpoint.
- Reduce the dependency age preference from seven days to three days.
- Remove shared documentation routing, search procedure, temporary-directory preference, sensitive-API reminder, prose-style prescriptions, skill-reload procedure, global Development Principles and Context Transfer triggers, ordinary-session subagent routing, and the `isRecord` prohibition.
- Preserve Personal paths, ownership, planning conventions, and privacy guidance. Remove the Session Derived Knowledge skill pointer.
- Disable `session-brief` and `session-derived-knowledge` for OpenCode, Claude Code, and Codex in the Personal overlay. Keep their source files and shared base enablement.
- Keep `context-transfer` and `development-principles` available to existing specialist consumers. Their possible redesign is deferred.
- Development Principles also has `opencode/autoinvoke: false`, removing it from OpenCode's automatic skill guidance while preserving named loads. Its description and body restrict selection to explicit requests or active workflow requirements. Other harnesses do not gain an enforced discovery restriction from OpenCode-specific metadata.
- Compare browser instructions with the loaded Browser Control skill. Keep local tool preference, shared-state coordination, execution-runtime clarification, and WSL HTTP-server guidance. Let the skill own ordinary page selection, authentication handoffs, and session continuation. Require explicit separate MCP sessions for concurrent tasks or agents sharing a process, rather than every browser task.
- Defer OpenEvals work. This revision is informed by static inspection and user preferences, not measured behavioral improvements.

Removing our guidance does not remove instructions supplied by OpenCode, MCP servers, skills, or repository-local files. In particular, Context7 still supplies tool-use guidance. Existing Context Transfer authoring records assume a global briefing contract; that assumption needs reconciliation when the skill or orchestration workflow is next revised. No claim of unchanged orchestration behavior is made by this instruction reduction.

### Activation and verification

- `git diff --check` passed.
- `mfz apply` completed and rendered the updated instructions and skill selection. Its normal apply process also refreshed several reference clones, including OpenCode. The earlier source analysis remains pinned to its recorded revision.
- `mfz doctor` passed manifest and managed-link checks.
- `mfz skills list` confirmed the two disabled skills are absent and Context Transfer and Development Principles remain available.
- This running OpenCode session received the new global instructions and a notification removing the two disabled skill IDs. This confirms live configuration delivery, not behavioral quality or clean-context behavior.
- OpenEvals and behavioral comparisons remain deferred. Existing conversation context still includes earlier guidance and loaded skills.
