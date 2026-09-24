## Host environment

- **Fact:** This environment runs in WSL with a Windows host; Windows binaries are reachable from the shell.
- **Fact:** This machine uses OpenCode V2.
- **Fact:** OpenCode V2 reloads skills, agent definitions, reloadable configuration, and MCP servers in the running server when their runtime files change.

## Tool selection

- **Tool:** Use `visual-explainer` only when the user explicitly requests that skill.
- **Tool:** Load `technical-writing` and `unslop` only when explicitly requested or when drafting or substantively revising a human-facing deliverable, such as a README, documentation page, RFC, article, or PR description. Routine replies, short commit messages, and primarily agent-consumed instructions, plans, handoffs, coordination records, and evidence do not trigger these skills. Choose by intended audience and purpose, not file type or location. This restriction takes precedence over broader loading directives in either skill.

## Working preferences

- **Behavior:** When an assumption could materially change the outcome, assess it and explain any disagreement rather than treating the user's suggestion as settled.
- **Behavior:** Prefer exact dependency versions and packages released at least three days ago.

## OpenCode background work

- **Fact:** OpenCode background subagents notify the parent session when they finish. Ending the parent response does not cancel their work.
- **Behavior:** When progress depends on a background subagent and no useful independent work remains, briefly state what is pending and end the response.
- **Behavior:** Do not issue tool calls solely to keep the session active or check whether a background subagent has finished.

## OpenCode session compaction

- **Behavior:** Invoke manual session compaction only when the user explicitly requests it. Context pressure or a task milestone alone does not authorize it.
- **Tool:** For an explicit compaction request, use the command below directly without loading the `opencode` skill. Replace `<sessionID>` with the current conversation's session ID unless the user names another session. Load `opencode` if the command fails or the request needs additional procedure.

```sh
opencode api post /api/session/<sessionID>/compact --data '{}'
```

- **Fact:** A successful response confirms that compaction was requested, not completed. It runs at the next safe model-step boundary.

## Git and CI

- **Behavior:** For delegated Git operations, provide the repository, intended changes, authorized operations, and relevant validation results. Preserve the user's exact scope and require the resulting commit identity, push status, and remaining changes as applicable.
- **Style:** Use Conventional Commits.
- **Behavior:** For GitHub Actions, prefer mature current releases pinned to commit SHAs.
- **Behavior:** Validate GitHub Actions with `actionlint` and `zizmor --min-severity high`.
- **Tool:** Declare local or reusable action outputs in metadata and write step outputs to `$GITHUB_OUTPUT`.

## JavaScript and TypeScript

- **Tool:** Load `anti-slop` before editing JavaScript or TypeScript and run its final check on the changed source and test files, including delegated changes.
- **Behavior:** Complete the anti-slop checkpoint without in-scope diagnostics or suppressions; follow the skill's scope and verification rules.
