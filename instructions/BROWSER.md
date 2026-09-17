# Browser automation

- For the user's live Windows Chrome tabs, existing logins, extensions, or human handoffs, load `browser-control` and use its MCP tools or CLI through the WSL relay. Use a new session-owned tab unless the task requires an existing user tab; attach or adopt only the intended tab. Create a distinct Browser Control session for each task or agent and pass its ID explicitly on subsequent calls.
- For WSL browser automation and isolated or unattended tasks, load `agent-browser` and follow the WSL guidance below. Use a disposable profile for tasks that require isolation; use the shared profile only when the task needs its existing login state.
- Keep one browser ownership path for each task. Follow an explicit user choice of browser or tool.

## WSL files in Windows Chrome

Goal: Preview WSL files in Windows Chrome through localhost HTTP.

Command:

```sh
python3 -m http.server <port> --bind 127.0.0.1 --directory <absolute-content-directory>
```

Verification: Open `http://localhost:<port>/<file>` with Browser Control and verify the rendered content.

Owned-server lifecycle: Reuse an appropriate development server when possible. Track any server you start; leave it running with its URL for user inspection, otherwise stop it when finished. Preserve pre-existing servers.

## WSL Chrome

Use WSL's standard Google Chrome, not Chrome for Testing. The shared authenticated browser profile is `~/.agent-browser/profiles/personal`; it contains private login state and must never be inspected, printed, copied, or committed.

- Shared-profile automation: launch a visible WSLg browser with `agent-browser --headed --executable-path /usr/bin/google-chrome --profile "$HOME/.agent-browser/profiles/personal"`. Use the selected profile on every agent-browser command in the session.
- Existing WSL browser: use `agent-browser --auto-connect` only when a WSL Chrome instance was deliberately launched with `--remote-debugging-port=9222`. Inspect its tabs and select the task tab before interacting.
- User-managed login: when the user asks for a browser without CDP or needs Google authentication, launch WSL Chrome with `google-chrome --user-data-dir="$HOME/.agent-browser/profiles/personal" <target-url>` and no remote-debugging flags. The user completes authentication in the visible window. Close that window before agent-browser reopens the same profile.

## Profile recovery

- Before destructive repair, preserve authentication from a profile or session that still launches with agent-browser's supported restore or state mechanism. Treat snapshots as credentials: protect them from inspection, output, source control, and disclosure. They cover cookies and localStorage; CLI help also advertises sessionStorage, but not IndexedDB migration. Load `agent-browser skills get core` for current syntax.
- Treat singleton files as stale only after confirming that no Chrome process owns the profile, the recorded PID is absent, and the recorded socket is not listening. With explicit mutation authority, remove only `SingletonLock`, `SingletonSocket`, and `SingletonCookie`.
- Compare failures with a disposable empty profile using the same executable and headed command. A working control localizes the fault to the original profile or path. If the emptied and recreated original path still fails, stop deleting profile data; suspect path-specific or agent-browser sidecar state, then use a fresh profile path or investigate the sidecar separately.
- Raw copies of Chrome cookie or local-storage databases are unsupported. If no prior state snapshot exists and the profile cannot launch, preserve it unchanged when possible and reauthenticate in a fresh profile instead of attempting database repair.
