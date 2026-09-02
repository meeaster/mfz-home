# WSL Browser Automation

Use WSL's standard Google Chrome, not Chrome for Testing. The shared authenticated browser profile is `~/.agent-browser/profiles/personal`; it contains private login state and must never be inspected, printed, copied, or committed.

- Default automation: launch a visible WSLg browser with `agent-browser --headed --executable-path /usr/bin/google-chrome --profile "$HOME/.agent-browser/profiles/personal"`. Use this profile on every agent-browser command in the session.
- Existing browser: use `agent-browser --auto-connect` only when a WSL Chrome instance was deliberately launched with `--remote-debugging-port=9222`. Inspect its tabs and select the task tab before interacting. Do not use the Windows Chrome bridge.
- User-managed login: when the user asks for a browser without CDP or needs Google authentication, launch WSL Chrome with `google-chrome --user-data-dir="$HOME/.agent-browser/profiles/personal" <target-url>` and no remote-debugging flags. The user completes authentication in the visible window. Close that window before agent-browser reopens the same profile.
