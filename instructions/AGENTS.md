For any file search or grep in the current git-indexed directory, use fff tools.

## Documentation Sources

- For library, framework, SDK, API, or CLI usage, use Context7 even for familiar libraries. Resolve the library with the user's full question, prefer an exact or version-specific reputable match, then query that library. Do not use it for business logic, refactoring, code review, scripts from scratch, or general programming concepts.
- For GitHub repository internals, inspect a matching clone from `~/.mindframe-z/references.md` first. Use DeepWiki only when no useful clone exists, the source is insufficient, or the user requests it; verify version-sensitive claims against source.
- Use one documentation source unless the user asks for a comparison. Prefer documentation MCPs over general web search.

## Git And CI

- Use Conventional Commits.
- For GitHub Actions, prefer mature current releases pinned to commit SHAs; validate with `actionlint` and `zizmor --min-severity high`. Declare local or reusable action outputs in metadata and write step outputs to `$GITHUB_OUTPUT`.

## Working Preferences

- Prefer exact dependency versions and packages older than 7 days.
- Flag documentation made obsolete by code changes and avoid hardcoded counts.
- Push back on flawed assumptions and ask when intent is unclear.
- Write Markdown prose and list items as single logical lines. Let the renderer wrap display text; preserve line breaks only for Markdown structure, such as headings, tables, fenced code, blockquotes, and intentional hard breaks.
- Bash permissions match exact shell text. Prefer narrow, reusable read-only commands; prefixes, wrappers, and chaining may require separate approval.
- Prefer the smallest correct implementation that fits the surrounding code. Avoid unused features, premature abstractions, unnecessary configuration, and compatibility paths without a concrete requirement.
- Write repeatable tests for observable behavior rather than mocks of internal implementation details.

## Personal Knowledge

- When private Personal context is relevant, start with the matching entry point under `/home/mark/workspace/knowledge/personal-knowledge`: `.openwiki/wiki/quickstart.md` for accepted synthesis, `practices/index.md` for current guidance, `session-captures/index.md` for capture boundaries, `threads/index.md` for retrospective evidence, or the relevant `work-units/` entry for continuity. Load only what is relevant.
- Canonical Session Captures live under `/home/mark/workspace/knowledge/personal-sources/session-captures`. Use the `session-derived-knowledge` skill for a new or revised Session Capture or Practice, then follow the destination's `AGENTS.md`.
- Session Captures are evidence, not automatically current guidance; Practices may guide future work but do not override source systems. Treat this material as private derived context: preserve provenance and uncertainty, keep source systems authoritative, and do not copy it into Work without explicit approval.

## Code Conventions

- Do not use `isRecord`-style guard helpers; understand the code path types directly, and when input shape is uncertain validate it once at the boundary with a schema instead of scattering guards through the logic.

## WSL + Chrome/agent-browser

This environment runs inside WSL2. Chrome runs on the Windows host. Use `--auto-connect` to discover and connect to it automatically.

**If agent-browser cannot connect** — tell the user to run these on Windows (Command Prompt as Administrator):

```
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=9222 connectaddress=127.0.0.1 connectport=9222
netsh advfirewall firewall add rule name="WSL Chrome Debug" dir=in action=allow protocol=TCP localport=9222
```

Then start Chrome on Windows (CMD):

```
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%TEMP%\chrome-devtools-profile"
```

Or if using PowerShell:

```
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="$env:TEMP\chrome-devtools-profile"
```
