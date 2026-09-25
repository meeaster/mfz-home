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

## Task output

- **Behavior:** A dispatched subagent writes its response to one file through `task-output` and replies with the path, the completion state, and a brief summary of what was done. When dispatching, assign the output file path from `effort-context`'s storage location, tell the subagent to load `task-output`, and state the information needed, not the reply's form; read the returned file in full, and after a follow-up read what changed. Scribe and helpers nested inside a subagent's assignment return directly.
- **Behavior:** Save the substantive findings of a deliberate investigation done in this session as one file through `task-output` and answer with its pointer. Use `effort-context` only when a storage location is needed; otherwise follow the assigned output convention. Nearby code reads during an edit, routine preflight, and bounded continuity checks do not each need a file.
- **Behavior:** Saving output changes the output, not execution routing. Capture and resume use `effort-context` when requested; neither selects orchestration nor starts ongoing maintenance. Only explicit human selection activates `orchestrate`, `orchestrate-chief`, or standalone design partnership.

## Explanatory artifacts

- **Behavior:** In pages or visual artifacts created to explain something, omit authoring-process commentary, research provenance, snapshot dates, and artifact approval or lifecycle statuses unless explicitly requested.
- **Behavior:** Integrate necessary supporting information into the relevant page elements rather than detached footnotes. Make the presentation understandable through its layout and labels rather than instructions on how to read it.
- **Behavior:** Omit footer summaries and takeaway callouts that merely repeat information already clear from the page’s headings, labels, or content.

## Diagrams

- **Behavior:** When using `diagram-design` to create or revise a diagram, inspect screenshots of the rendered result at its intended display sizes, checking both the whole diagram and native-size detail against the skill’s applicable design rules. Repair observed defects and recheck affected views. Report what was inspected and any checks that remain unverified.
- **Behavior:** When inspecting `diagram-design` output, trace each connector from source to destination. Confirm its endpoints align with the intended element boundaries, arrowheads visibly join the line and meet the intended target, and the route has no unintended overlaps with elements, labels, or other connectors.

## Version and freshness

- **Behavior:** Ground version-sensitive work on maintained libraries, frameworks, SDKs, CLIs, APIs, and services in current evidence rather than model knowledge of releases, availability, defaults, or limitations.
- **Behavior:** For existing projects, establish the applicable dependency version, API version, release channel, or service compatibility settings from project evidence and use matching documentation.
- **Behavior:** For new adoption, upgrades, or current-state questions, verify the latest stable release or current service behavior through official release notes, registry metadata, or authoritative documentation. Distinguish stable releases from previews; the newest release is not automatically the appropriate installation target.
- **Behavior:** Check consequential version-sensitive claims against the applicable primary source. A search snippet, Context7 result, or unversioned page alone does not establish freshness.
- **Behavior:** Reuse sufficiently current evidence within the assignment; recheck when the target changes, sources conflict, or freshness could materially change the decision.

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

## Testing

- **Behavior:** Tautological tests considered harmful.
- **Behavior:** Change-detector tests considered harmful.
- **Behavior:** Do not create regression tests for bug fixes without a genuine gap in behavior testing.

## JavaScript and TypeScript

- **Tool:** Load `anti-slop` before editing JavaScript or TypeScript and run its final check on the changed source and test files, including delegated changes.
- **Behavior:** Complete the anti-slop checkpoint without in-scope diagnostics or suppressions; follow the skill's scope and verification rules.
