## Host environment

- **Fact:** This environment runs in WSL with a Windows host; Windows binaries are reachable from the shell.
- **Fact:** This machine uses OpenCode V2. For OpenCode documentation, use the V2 docs at `https://opencode.ai/v2/docs`; pages under `https://opencode.ai/docs` describe the older V1 release.
- **Fact:** OpenCode reloads skills, agent definitions, reloadable configuration, and MCP servers in the running server when their runtime files change.

## Tool selection

- **Tool:** Use `visual-explainer` only when the user explicitly requests that skill.
- **Tool:** When the user asks to open projects in Zed, open them all in one window as a multi-root workspace by passing every folder to a single `zed` invocation; do not open a separate window per project. From WSL, run the Windows CLI (`/mnt/c/Users/*/AppData/Local/Programs/Zed/bin/zed`) as `zed --wsl <user>@<distro> -n <folder>...`, taking the user from `whoami` and the distro from `wslpath -w /` (`\\wsl.localhost\<distro>\`); `$WSL_DISTRO_NAME` can be empty in agent shells, and a blank distro fails with "Failed to connect to WSL".
- **Tool:** Load `technical-writing` and `unslop` only when explicitly requested or when drafting or substantively revising a human-facing deliverable, such as a README, documentation page, RFC, article, or PR description. Routine replies, short commit messages, and primarily agent-consumed instructions, plans, handoffs, coordination records, and evidence do not trigger these skills. Choose by intended audience and purpose, not file type or location. This restriction takes precedence over broader loading directives in either skill.

## Working preferences

- **Behavior:** When an assumption could materially change the outcome, assess it and explain any disagreement rather than treating the user's suggestion as settled.
- **Behavior:** When the user thinks aloud or asks for your view, answer with a recommendation and wait for their direction before changing files. A request to make a change is that direction.
- **Behavior:** Write scripts in Node, not Python or another language: skill scripts, project tooling, and one-off helpers alike. Code that belongs to a project written in another language follows that project.
- **Behavior:** Prefer exact dependency versions. Install machine-wide tools and global packages released at least one day ago; inside a project, follow the project's own minimum release age setting.
- **Behavior:** Saving output changes the output, not execution routing. Capture and resume use `effort-context` when requested; neither selects orchestration nor starts ongoing maintenance. Only explicit human selection activates `orchestrate` or standalone design partnership.

## Version and freshness

- **Behavior:** Ground version-sensitive work on maintained libraries, frameworks, SDKs, CLIs, APIs, and services in current evidence rather than model knowledge of releases, availability, defaults, or limitations.
- **Behavior:** For existing projects, establish the applicable dependency version, API version, release channel, or service compatibility settings from project evidence and use matching documentation.
- **Behavior:** For new adoption, upgrades, or current-state questions, verify the latest stable release or current service behavior through official release notes, registry metadata, or authoritative documentation; a search snippet, Context7 result, or unversioned page alone does not establish freshness. Distinguish stable releases from previews; the newest release is not automatically the appropriate installation target.

## Session location

- **Behavior:** When a session in a folder containing several repositories is about to make changes that belong mainly to one of them, move the session to that repository before the first change so its instructions and configuration govern the work. Brief investigation does not warrant a move. If one repository owns the core change and the others only adapt to it, move to the owning repository; if none is primary, stay at the shared parent. Move once and state the destination and reason when moving.
- **Tool:** Claude Code agents cannot move a session; ask the user to run `/cd <path>`.

## OpenCode session compaction

- **Behavior:** Invoke manual session compaction only when the user explicitly requests it. Context pressure or a task milestone alone does not authorize it.

## Git and CI

- **Behavior:** For delegated Git operations, provide the repository, intended changes, authorized operations, and relevant validation results. Preserve the user's exact scope and require the resulting commit identity, push status, and remaining changes as applicable.
- **Style:** Use Conventional Commits.

## Code judgment

- **Behavior:** Before adding complexity for a speculative race, failure, or security edge case, explain the concrete failure mode, its likelihood, and the complexity cost, and get agreement.
- **Behavior:** Do not revalidate values already guaranteed by a schema, constructor, or type; validate at the owning boundary and pass typed values inward.
- **Behavior:** Extract a helper only when it is reused or names a real concept that makes the caller read as the main path; otherwise keep the logic inline.
- **Behavior:** Comment non-obvious constraints and surprising behavior, not obvious assignments or control flow.

## Testing

- **Behavior:** Tautological tests considered harmful.
- **Behavior:** Change-detector tests considered harmful.
- **Behavior:** Do not create regression tests for bug fixes without a genuine gap in behavior testing.

## JavaScript and TypeScript

- **Tool:** Load `anti-slop` before editing JavaScript or TypeScript project files and run its final check on the changed source and test files, including delegated changes.
