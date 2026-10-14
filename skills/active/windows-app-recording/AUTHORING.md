# windows-app-recording

## Intent

Lets an agent in WSL record smooth video of a Windows desktop app, and drive Chromium-based apps (Electron, WebView2) over CDP while recording. Grew out of recording OpenPencil and OpenCode Desktop for a presentation; smoothness is the priority.

Not for: recording web pages in a normal browser (agent-browser's own recording covers that), app-specific choreography (that lives in skills like `open-pencil-drive`), or editing the video afterwards.

Success: a finished MP4 of just the app window with every display frame captured, started and stopped around the agent's other work, and checked by counting distinct frames and looking at extracted frames.

## Scenarios

- **"Record OpenCode Desktop while I demo a session"**: launches with a debug port only if driving is needed, records the window with `record-window.sh`, stops cleanly, reports distinct fps.
- **"Make a video of an agent building something in OpenPencil"**: this skill supplies launch, relay, and capture; `open-pencil-drive` supplies the camera and build.
- **App already running without debugging**: asks the user to quit it instead of killing it.
- **Port 9222 taken** (a leftover `netsh portproxy` rule held it here): picks another port instead of adding forwarding rules.
- **Recording a website in Chrome**: this skill shouldn't load.

## Decisions

- **Two skills** (human, 2026-10-13): generic Windows-app capture here, OpenPencil choreography in `open-pencil-drive`, so OpenCode Desktop and later apps reuse this one.
- **Windows ffmpeg `ddagrab` is the default capture** (human chose smoothness, 2026-10-13). Measured on the same overlay that changes every frame: ddagrab 60 distinct fps on OpenCode Desktop (3202x2002) and OpenPencil (3840x2160 desktop); agent-browser `record` about 27-29 fps on OpenCode Desktop and about 15 on OpenPencil; `gdigrab` captured a blank white WebView2 window.
- **Stop through a named pipe** (2026-10-13): ffmpeg finalizes the MP4 on `q`; killing it from WSL leaves no moov atom. A held-open FIFO lets `start` and `stop` run as separate commands while the agent works in between.
- **Whole window by default, `--region` on request** (human, 2026-10-13): the original take stays complete for editing; a partial capture is for when the user explicitly wants one area. The frame is trimmed to the monitor work area after a take showed the taskbar.
- **Sidecar `<out>.json`** (human asked for editing data, 2026-10-13): capture area, client origin, and a first-frame time taken as the `q` time minus the duration, since ffmpeg's start-up delay varies.
- **Fail when the window can't be raised** (2026-10-13): Windows' focus-stealing protection let a test capture the user's terminal instead of OpenPencil. `window-rect.ps1` sends a synthetic zero-distance mouse move before `SetForegroundWindow` and exits 3 if the window still isn't in front. A synthetic Alt press was tried first: it put OpenPencil in menu mode, which froze the page and its DevTools port until Escape.
- **Background jobs detach from the caller's output** (2026-10-13): `start` called through Node's `execFileSync` never returned, because ffmpeg and the pipe holder inherited the captured stdout.
- **Colour caveat, not a fix** (2026-10-13): ddagrab frames were consistently darker and more saturated than CDP screenshots of the same view (`#1E1E1E`→`#111111`, `#2054B4`→`#0943FF`); encoding a PNG through the same x264 settings preserved colours exactly, and ddagrab reported an 8-bit desktop, so the shift happens in capture, most likely display colour management. Cause unconfirmed.
- **Check the active tab** (2026-10-13): a stray `about:blank` target in the WebView became agent-browser's active tab and screenshots came back flat.
- **64-bit ffmpeg, real binary** (2026-10-13): a 32-bit build crashed in ddagrab with exit 5; calling a mise Windows shim from WSL can trigger a toolset install.
- **Relay over `netsh portproxy`**: portproxy must listen on an address WSL can reach, exposing full app control, and its rules held 9222 on this machine. The relay costs about a third of CDP throughput (48 vs 77 screencast fps at 4K), which ddagrab capture doesn't need.
- **agent-browser for driving** (human, 2026-10-13): validated for connect, clicks, shortcuts, eval, and recording against both apps. Its `mouse wheel` hit the wrong element and `keydown Space` never arrived, hence in-page `WheelEvent` dispatch.
- **Environment-specific by design** (human): WSL with a Windows host. The skill names no machine paths; `WINDOWS_FFMPEG` and the Windows `node.exe` path are supplied per machine.

## Sources

| Source | Revision | Local use |
|---|---|---|
| FFmpeg `ddagrab`, `gdigrab` | Windows ffmpeg 9.0.2 (64-bit) | Capture; behaviour measured 2026-10-13 |
| agent-browser | 0.39.0 | Driving and CDP recording measurements |
| WebView2 `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS` | Edge WebView2 155, OpenPencil 0.16.0-beta.3 | Debug-port launch for Tauri apps |
| Electron `--remote-debugging-port` | OpenCode Desktop 2.0.28 (Electron 44) | Debug-port launch |
| `cdp-relay.mjs` | adapted from the Personal home's `opencode-desktop-debug` relay | Same interop bridge, generic port and node path |
