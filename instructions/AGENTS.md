## Host Environment

You run in WSL with a Windows host. Windows-side binaries (`powershell.exe`, `tasklist.exe`, anything on Windows `PATH`) are reachable from this shell; invoke them directly for Windows-side work.

## Documentation Sources

- **OpenCode:** This machine uses OpenCode V2. Use `opencode2` and V2 documentation and configuration unless the user explicitly requests V1.
- For library, framework, SDK, API, or CLI usage, use Context7 even for familiar libraries. Resolve the library with the user's full question, prefer an exact or version-specific reputable match, then query that library. Do not use it for business logic, refactoring, code review, scripts from scratch, or general programming concepts.
- For GitHub repository internals, inspect a matching clone from `~/.mindframe-z/references.md` first. Use DeepWiki only when no useful clone exists, the source is insufficient, or the user requests it; verify version-sensitive claims against source.
- Start with one authoritative documentation source. Add another when the first is insufficient, a consequential claim needs verification, or the user asks for a comparison. Prefer documentation MCPs over general web search.

## Git And CI

- Use Conventional Commits.
- For GitHub Actions, prefer mature current releases pinned to commit SHAs; validate with `actionlint` and `zizmor --min-severity high`. Declare local or reusable action outputs in metadata and write step outputs to `$GITHUB_OUTPUT`.

## Working Preferences

- If you need to use `/tmp`, use `/tmp/opencode` instead.
- Prefer exact dependency versions and packages older than 7 days.
- Flag documentation made obsolete by code changes and avoid hardcoded counts.
- For Impeccable detector scans, use `impeccable detect ...`; do not invoke the rendered skill's `scripts/detect.mjs` directly.
- Before enumerating repository files or matches, scope by path and type, exclude dependencies and generated output, and prefer dedicated glob or grep tools. Request broad shell output only when the complete inventory is necessary.
- Before calling a read-only API, consider whether its response may include sensitive data. When practical, prefer a narrower endpoint or field selection, and avoid surfacing sensitive fields that the task does not need.
- Push back on flawed assumptions and ask when intent is unclear.
- Write Markdown prose and list items as single logical lines. Let the renderer wrap display text; preserve line breaks only for Markdown structure, such as headings, tables, fenced code, blockquotes, and intentional hard breaks.
- Prefer the smallest correct implementation that fits the surrounding code. Avoid unused features, premature abstractions, unnecessary configuration, and compatibility paths without a concrete requirement.
- Load `development-principles` when making or evaluating a software design, implementation, test, refactor, or formal code review. For repository inventory, status checks, operational investigation, and source research, load it only when the work crosses into design or implementation judgment. Apply it after repository instructions and accepted requirements.

## Subagent Use

- Use `explore` and `research` proactively for bounded, read-only discovery or evidence gathering when they materially reduce uncertainty.
- Treat `operator` and `worker` as user-authorized mutation lanes. Route settled procedural and operational changes to `operator`; route application implementation, substantive code changes, difficult implementation investigation, and novel troubleshooting to `worker`. Choose by the primary accepted outcome and complexity, not whether a file is touched. Do not create or resume either merely because work remains.
- Treat `reviewer` as a user-authorized independent-judgment lane. When it reviews code, require it to load `thermo-nuclear-code-quality-review` and use that skill as its review guidance. Do not use it as a routine completion check or repeatedly recheck work without a new, stated review boundary.
- A request to continue permits ongoing work, but does not by itself authorize a new or resumed `operator`, `worker`, or `reviewer`.
- Fresh subagents do not share the parent conversation. Give them an intent-rich brief with the objective and why it matters, relevant user priorities and tradeoffs, accepted decisions, exact evidence and accessible paths, constraints and exclusions, authority limits, expected deliverable, verification, and stop conditions. Distill rather than transcribe, and name relevant skills for the child to load.
- Load `context-transfer` when audience, access, privacy, portability, publication, or lossless specialist handoff materially changes what must cross the boundary.
- When dispatching `ui-ux-designer`, tell it to load `ui-ux-design` before acting.
- In OpenCode 2, skills, agent definitions, reloadable configuration, and MCP servers update in the running server. When validation is needed after a change reaches the watched runtime path, use the current session's next model attempt or a native subagent; reserve `opencode2 run` for testing the CLI, a separate process, isolation, or fresh top-level context.

## Code Conventions

- Do not use `isRecord`-style guard helpers; understand the code path types directly, and when input shape is uncertain validate it once at the boundary with a schema instead of scattering guards through the logic.
- Before editing JavaScript or TypeScript, load `anti-slop` for its short preflight heuristics. After completing the batch, including delegated or subagent work, run it against the narrowest changed source or test path. The checkpoint must be clean for in-scope code: address diagnostics, remove source directives that suppress anti-slop rules, and rerun after edits. Do not scan dependencies or generated output, widen the change merely to silence a diagnostic, or claim a clean checkpoint while an in-scope suppression remains.
