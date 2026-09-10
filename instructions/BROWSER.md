# WSL Browser Automation

Use WSL's standard Google Chrome, not Chrome for Testing. The shared authenticated browser profile is `~/.agent-browser/profiles/personal`; it contains private login state and must never be inspected, printed, copied, or committed.

- Default automation: launch a visible WSLg browser with `agent-browser --headed --executable-path /usr/bin/google-chrome --profile "$HOME/.agent-browser/profiles/personal"`. Use this profile on every agent-browser command in the session.
- Existing browser: use `agent-browser --auto-connect` only when a WSL Chrome instance was deliberately launched with `--remote-debugging-port=9222`. Inspect its tabs and select the task tab before interacting. Do not use the Windows Chrome bridge.
- User-managed login: when the user asks for a browser without CDP or needs Google authentication, launch WSL Chrome with `google-chrome --user-data-dir="$HOME/.agent-browser/profiles/personal" <target-url>` and no remote-debugging flags. The user completes authentication in the visible window. Close that window before agent-browser reopens the same profile.

## Profile recovery

- Before destructive repair, preserve authentication from a profile or session that still launches with agent-browser's supported restore or state mechanism. Treat snapshots as credentials: protect them from inspection, output, source control, and disclosure. They cover cookies and localStorage; CLI help also advertises sessionStorage, but not IndexedDB migration. Load `agent-browser skills get core` for current syntax.
- Treat singleton files as stale only after confirming that no Chrome process owns the profile, the recorded PID is absent, and the recorded socket is not listening. With explicit mutation authority, remove only `SingletonLock`, `SingletonSocket`, and `SingletonCookie`.
- Compare failures with a disposable empty profile using the same executable and headed command. A working control localizes the fault to the original profile or path. If the emptied and recreated original path still fails, stop deleting profile data; suspect path-specific or agent-browser sidecar state, then use a fresh profile path or investigate the sidecar separately.
- Raw copies of Chrome cookie or local-storage databases are unsupported. If no prior state snapshot exists and the profile cannot launch, preserve it unchanged when possible and reauthenticate in a fresh profile instead of attempting database repair.
