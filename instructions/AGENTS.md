For any file search or grep in the current git-indexed directory, use fff tools.

## Documentation Sources

- For library, framework, SDK, API, or CLI usage, use Context7 even for familiar libraries. Resolve the library with the user's full question, prefer an exact or version-specific reputable match, then query that library. Do not use it for business logic, refactoring, code review, scripts from scratch, or general programming concepts.
- For GitHub repository internals, inspect a matching clone from `~/.mindframe-z/references.md` first. Use DeepWiki only when no useful clone exists, the source is insufficient, or the user requests it; verify version-sensitive claims against source.
- Use one documentation source unless the user asks for a comparison. Prefer documentation MCPs over general web search.

## Git And CI

- Use Conventional Commits.
- For GitHub Actions, prefer mature current releases pinned to commit SHAs; validate with `actionlint` and `zizmor --min-severity high`. Declare local or reusable action outputs in metadata and write step outputs to `$GITHUB_OUTPUT`.

## Working Preferences

- If you need to use `/tmp`, use `/tmp/opencode` instead.
- Prefer exact dependency versions and packages older than 7 days.
- Flag documentation made obsolete by code changes and avoid hardcoded counts.
- Push back on flawed assumptions and ask when intent is unclear.
- Write Markdown prose and list items as single logical lines. Let the renderer wrap display text; preserve line breaks only for Markdown structure, such as headings, tables, fenced code, blockquotes, and intentional hard breaks.
- Bash permissions match exact shell text. Prefer narrow, reusable read-only commands; prefixes, wrappers, and chaining may require separate approval.
- Prefer the smallest correct implementation that fits the surrounding code. Avoid unused features, premature abstractions, unnecessary configuration, and compatibility paths without a concrete requirement.
- Write repeatable tests for observable behavior rather than mocks of internal implementation details.

## Subagent Use

- Use `explore` and `research` proactively for bounded, read-only discovery or evidence gathering when they materially reduce uncertainty.
- Treat `worker` as a user-authorized mutation lane. Do not create or resume one merely because work remains.
- Treat `reviewer` as a user-authorized independent-judgment lane. Do not use it as a routine completion check or repeatedly recheck work without a new, stated review boundary.
- A request to continue permits ongoing work, but does not by itself authorize a new or resumed `worker` or `reviewer`.

## Personal Knowledge

- When private Personal context is relevant, start with the matching entry point under `/home/mark/workspace/knowledge/personal-knowledge`: `.openwiki/wiki/quickstart.md` for accepted synthesis, `practices/index.md` for current guidance, `session-captures/index.md` for capture boundaries, `threads/index.md` for retrospective evidence, or the relevant `work-units/` entry for continuity. Load only what is relevant.
- Canonical Session Captures live under `/home/mark/workspace/knowledge/personal-sources/session-captures`. Use the `session-derived-knowledge` skill for a new or revised Session Capture or Practice, then follow the destination's `AGENTS.md`.
- Session Captures are evidence, not automatically current guidance; Practices may guide future work but do not override source systems. Treat this material as private derived context: preserve provenance and uncertainty, keep source systems authoritative, and do not copy it into Work without explicit approval.

## Code Conventions

- Do not use `isRecord`-style guard helpers; understand the code path types directly, and when input shape is uncertain validate it once at the boundary with a schema instead of scattering guards through the logic.

## WSL + Chrome/agent-browser

Use WSL's standard Google Chrome, not Chrome for Testing. The shared authenticated browser profile is `~/.agent-browser/profiles/personal`; it contains private login state and must never be inspected, printed, copied, or committed.

- Default automation: launch a visible WSLg browser with `agent-browser --headed --executable-path /usr/bin/google-chrome --profile "$HOME/.agent-browser/profiles/personal"`. Use this profile on every agent-browser command in the session.
- Existing browser: use `agent-browser --auto-connect` only when a WSL Chrome instance was deliberately launched with `--remote-debugging-port=9222`. Inspect its tabs and select the task tab before interacting. Do not use the Windows Chrome bridge.
- User-managed login: when the user asks for a browser without CDP or needs Google authentication, launch WSL Chrome with `google-chrome --user-data-dir="$HOME/.agent-browser/profiles/personal" <target-url>` and no remote-debugging flags. The user completes authentication in the visible window. Close that window before agent-browser reopens the same profile.
