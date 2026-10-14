# windows-app-recording

## Intent

Lets an agent in WSL record smooth video of a Windows desktop app, and drive it while recording: Chromium-based apps (Electron, WebView2) over CDP, terminal apps in Windows Terminal through `termctrl`. Grew out of recording OpenPencil and OpenCode Desktop for a presentation, then OpenCode's TUI so it looks as it does in the user's terminal, then the TUI, web, and desktop clients side by side on one session; smoothness and faithful appearance are the priorities.

Not for: recording web pages in a normal browser (agent-browser's own recording covers that), terminal recordings where termctrl's own renderer is acceptable (`termctrl video`), app-specific choreography (that lives in skills like `open-pencil-drive`), or editing the video afterwards.

Success: a finished MP4 of just the app window (or, for several apps, the whole monitor with each app in its own cell) with every display frame captured, started and stopped around the agent's other work, and checked by counting distinct frames and looking at extracted frames.

## Scenarios

- **"Record OpenCode Desktop while I demo a session"**: launches with a debug port only if driving is needed, records the window with `record-window.sh`, stops cleanly, reports distinct fps.
- **"Make a video of an agent building something in OpenPencil"**: this skill supplies launch, relay, and capture; `open-pencil-drive` supplies the camera and build.
- **App already running without debugging**: asks the user to quit it instead of killing it.
- **Port 9222 taken** (a leftover `netsh portproxy` rule held it here): picks another port instead of adding forwarding rules.
- **"Record OpenCode in my terminal"**: opens a dedicated fullscreen Windows Terminal window under `termctrl run`, records it with `--title` and `--screen`, drives it with `termctrl`; leaves the user's other terminal windows alone.
- **Terminal launch fails**: reads the exit file instead of relaunching into duplicate windows.
- **"Record the TUI, web app, and desktop app at the same time"**: arranges equal grid cells, lowers display scaling until each app shows its full layout, turns HDR and notifications off with the user's knowledge, records the whole monitor once, and restores the settings afterwards; doesn't record each app separately through CDP.
- **Recording a website in Chrome**: this skill shouldn't load.

## Decisions

- **Two skills** (human, 2026-10-13): generic Windows-app capture here, OpenPencil choreography in `open-pencil-drive`, so OpenCode Desktop and later apps reuse this one.
- **Windows ffmpeg `ddagrab` is the default capture** (human chose smoothness, 2026-10-13). Measured on the same overlay that changes every frame: ddagrab 60 distinct fps on OpenCode Desktop (3202x2002) and OpenPencil (3840x2160 desktop); agent-browser `record` about 27-29 fps on OpenCode Desktop and about 15 on OpenPencil; `gdigrab` captured a blank white WebView2 window.
- **Stop through a named pipe** (2026-10-13): ffmpeg finalizes the MP4 on `q`; killing it from WSL leaves no moov atom. A held-open FIFO lets `start` and `stop` run as separate commands while the agent works in between.
- **Whole window by default, `--region` on request** (human, 2026-10-13): the original take stays complete for editing; a partial capture is for when the user explicitly wants one area. The frame is trimmed to the monitor work area after a take showed the taskbar.
- **Sidecar `<out>.json`** (human asked for editing data, 2026-10-13): capture area, client origin, and a first-frame time taken as the `q` time minus the duration, since ffmpeg's start-up delay varies.
- **Fail when the window can't be raised** (2026-10-13): Windows' focus-stealing protection let a test capture the user's terminal instead of OpenPencil. `window-rect.ps1` sends a synthetic zero-distance mouse move before `SetForegroundWindow` and exits 3 if the window still isn't in front. A synthetic Alt press was tried first: it put OpenPencil in menu mode, which froze the page and its DevTools port until Escape.
- **Background jobs detach from the caller's output** (2026-10-13): `start` called through Node's `execFileSync` never returned, because ffmpeg and the pipe holder inherited the captured stdout.
- **HDR off, not tone-mapping** (human, 2026-10-13): ddagrab frames were far darker than CDP screenshots of the same view (RGB 21,23,32 → 6,7,11; earlier `#1E1E1E`→`#111111`). The display was in Windows HDR mode; with HDR switched off the capture matched the app's pixels exactly. Turning HDR off for the take was chosen over a 10-bit capture plus tone-mapping, which needs a tuned brightness target for no gain on SDR apps.
- **Check the active tab** (2026-10-13): a stray `about:blank` target in the WebView became agent-browser's active tab and screenshots came back flat.
- **64-bit ffmpeg, real binary** (2026-10-13): a 32-bit build crashed in ddagrab with exit 5; calling a mise Windows shim from WSL can trigger a toolset install.
- **Relay over `netsh portproxy`**: portproxy must listen on an address WSL can reach, exposing full app control, and its rules held 9222 on this machine. The relay costs about a third of CDP throughput (48 vs 77 screencast fps at 4K), which ddagrab capture doesn't need.
- **agent-browser for driving** (human, 2026-10-13): validated for connect, clicks, shortcuts, eval, and recording against both apps. Its `mouse wheel` hit the wrong element and `keydown Space` never arrived, hence in-page `WheelEvent` dispatch.
- **Environment-specific by design** (human): WSL with a Windows host. The skill names no machine paths; `WINDOWS_FFMPEG` and the Windows `node.exe` path are supplied per machine.

- **Terminal apps live here, not in a new skill** (human, 2026-10-13): the capture is the same; only driving differs, and `terminal-control` is vendored, so it stays about driving.
- **Real Windows Terminal over `termctrl video`** (human, 2026-10-13): termctrl renders recordings itself, which didn't look like OpenCode in the user's terminal. `termctrl run` draws in the real window and keeps agent control.
- **`--title`** (2026-10-13): Windows Terminal runs every window in one process, so the main-window lookup could have filmed the user's own OpenCode window. PowerShell passes `$null` to a `string` parameter as `""`, so `FindWindow` needs `[NullString]::Value`.
- **`terminal-window.sh` writes the command to a launcher file** (2026-10-13), each line from a failure: `wt.exe` splits its whole command line on `;`, including inside `--title`, opening extra tabs and windows (the title escapes it as `\;`); `wsl.exe -d ""` fails because `WSL_DISTRO_NAME` was empty in the agent shell, so the distro comes from `wslpath -w /`; the `wsl.exe`-started shell lacked mise's PATH, and switching to an interactive shell took up to 40 s, so the agent relaunched and got duplicate windows. Passing the caller's PATH starts the app in under a second.
- **Interop outages are retried, not relaunched** (2026-10-13): Windows calls from WSL failed for minutes with `UtilAcceptVsock ... accept4 failed 110`, then recovered on their own.
- **Launcher always exits 0** (2026-10-13): Windows Terminal keeps a failed or killed command's tab open as "process exited", which needed Ctrl+D sent to the focused window to close; the exit code goes to a file instead.
- **Fullscreen with `--screen` for demos** (human chose fullscreen, 2026-10-13): no tab or title bar; a windowed take of a too-tall window lost the input box below the work area.
- **BT.709 conversion and tags in the recorder** (2026-10-13): ddagrab frames carry an sRGB transfer tag and swscale defaulted to the BT.601 matrix, leaving `color_space=unknown`, `color_transfer=iec61966-2-1`; `-color_trc` on the output didn't override the frame tag, `setparams` in the filter chain did.
- **`--screen` doesn't require the window in front** (2026-10-13): after HDR was switched off, an invisible Notification Center window held the foreground and `start` refused every take, though a whole-monitor take doesn't depend on focus.
- **One whole-monitor take for several apps** (human, 2026-10-13): agreed over a ddagrab take of the terminal plus agent-browser recordings of the web apps, which would run at 15–30 fps, need two flaky WSL relays alive for the whole take, and need lining up in editing.
- **Equal grid cells, unused cell left as is** (human, 2026-10-13): the user crops in ffmpeg afterwards, so matching cell sizes mattered more than filling the screen.
- **Lower display scaling instead of per-app zoom** (human, 2026-10-13): one switch shrinks every app and its window frame consistently. At 250% each 1920-pixel cell was 768 CSS px and OpenCode's web UI fell into its phone layout; at 175% its TUI (109 columns) hid the sidebar, which appears from about 120. 150% fit both; the user then chose 125% because a cell cropped into a 1080p edit still reads normally. The scale step is set through the undocumented DisplayConfig device-info types (-3 get, -4 set) that Settings uses, since Windows has no public API that applies without a sign-out.
- **Notifications off through the global toast switch** (human asked for Do Not Disturb, 2026-10-13): Windows 11's Do Not Disturb state has no stable scriptable switch; the documented-by-use `NOC_GLOBAL_SETTING_TOASTS_ENABLED` value suppresses toasts the same way, and deleting it restores the default. OpenCode Desktop's "Response ready" toast and Chrome's site notification prompt had both landed in test takes.
- **mise's conda `ffmpeg` is fine** (2026-10-13): an early check wrongly reported it lacked `ddagrab`; rechecked it lists `ddagrab` and `libx264`, and a 2 s 3840x2160 60 fps capture worked. Its mise shim is a `.cmd`, hence the `Library/bin` path.

## Sources

| Source | Revision | Local use |
|---|---|---|
| FFmpeg `ddagrab`, `gdigrab` | Windows ffmpeg 9.0.2 (64-bit; conda build via mise) | Capture; behaviour measured 2026-10-13 |
| Terminal Control (`termctrl run`) | 1.2.1 | Driving terminal apps in Windows Terminal |
| agent-browser | 0.39.0 | Driving and CDP recording measurements |
| WebView2 `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS` | Edge WebView2 155, OpenPencil 0.16.0-beta.3 | Debug-port launch for Tauri apps |
| Electron `--remote-debugging-port` | OpenCode Desktop 2.0.28 (Electron 44) | Debug-port launch |
| Windows DisplayConfig API (`DisplayConfigGetDeviceInfo` / `SetDeviceInfo`) | Windows 11; scale types -3/-4 undocumented, advanced colour types 9/10 documented | `display-scale.ps1`, `display-hdr.ps1` |
| `cdp-relay.mjs` | adapted from the Personal home's `opencode-desktop-debug` relay | Same interop bridge, generic port and node path |
