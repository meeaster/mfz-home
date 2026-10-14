---
name: windows-app-recording
description: Record smooth video of a Windows desktop app from WSL, and drive Electron or WebView2 apps (OpenCode Desktop, OpenPencil, VS Code, Tauri apps) over the Chrome DevTools Protocol while recording. Use when asked to record, screen-capture, or film a Windows app or its window, to make a demo clip of a desktop app, or to attach agent-browser to a desktop app from WSL.
---

# Windows app recording

Record a Windows app's window from WSL with Windows ffmpeg, and, when the app is built on Chromium (Electron, or WebView2 as Tauri apps use), drive it through its DevTools port while the recording runs.

Requirements: WSL on Windows, a 64-bit Windows `ffmpeg.exe` whose `-filters` lists `ddagrab`, and, for driving, a Windows `node.exe` plus `agent-browser`.

## Choose the capture

| Method | Smoothness | Use when |
| --- | --- | --- |
| Windows ffmpeg `ddagrab` (`scripts/record-window.sh`) | Every display frame, 60 fps measured | Default. Works for any app. |
| `agent-browser record` over CDP | About 15–30 distinct fps at 4K, depending on the page | ffmpeg isn't available, or the app must be recorded while covered by other windows. |
| ffmpeg `gdigrab` | Blank white window for WebView2 and other GPU-drawn content | Avoid. |

Linux ffmpeg inside WSL can't see the Windows desktop; always run the Windows `ffmpeg.exe`. Use a 64-bit build: a 32-bit build crashed in `ddagrab` with exit code 5. Run the real binary, not a version-manager shim, which may start an install when called from WSL.

`ddagrab` films the screen, so the window has to stay visible: anything on top of it (notifications, other windows, the mouse pointer) is recorded too. It captures the primary monitor.

It also films the desktop after Windows' colour handling for the display, so colours can differ from the app's own pixels. On one machine `#1E1E1E` / `#2054B4` / `#F3F6FC` in an agent-browser screenshot recorded as `#111111` / `#0943FF` / `#FFFFFF`: darker shadows, stronger saturation, clipped near-whites. When colour matters, compare one recorded frame with a screenshot of the same view; if they differ, say so, or record through CDP, which captures the app's own pixels.

## Record

Record the whole window by default and keep that file as the untouched original; crop, cut, and reframe it afterwards. Record only part of the window (`--region`) when the user explicitly asks for a specific area.

```bash
export WINDOWS_FFMPEG=<WSL path to ffmpeg.exe>
scripts/record-window.sh start <ProcessName> <out.mp4> [--fps 60] [--no-mouse] [--region X Y W H | --screen]
# ... drive the app ...
scripts/record-window.sh stop <ProcessName>
```

`<ProcessName>` is the Windows process name without `.exe` (`OpenCode`, `OpenPencil`). `start` brings the window to the front, records its visible frame trimmed to the monitor's work area so the taskbar stays out (`scripts/window-rect.ps1`), and returns while recording continues. `--region` takes pixels of a whole-window take (`X Y` from its top-left); `--screen` records the whole monitor. If Windows refuses to bring the window forward (the user is typing in another window), `start` fails instead of recording whatever is on top; ask the user to click the app, then start again. `stop` sends ffmpeg `q` through a named pipe, so the MP4 is finalized, then moves it to `<out.mp4>`. Killing ffmpeg instead leaves an unplayable file.

`stop` also writes `<out.mp4>.json` for editing: `capture` (the recorded screen area, physical pixels), `client` (the screen position of the window's content area, below the title bar), `video` (size and duration), and `startedAtMs` (wall-clock time of the first frame, derived from when `q` was sent minus the duration). App-specific timelines line up against `startedAtMs`.

Keep the window size and position fixed during a take: the capture area is measured once at `start`.

## Make the app drivable

Skip this when the recording needs no in-app automation.

1. The app must be launched with remote debugging, and the flag only takes effect at launch. If it's already running without it, ask the user to quit it: closing it yourself can lose unsaved work.
2. Pick a port that's free on both Windows and WSL; start the search at 9222.
3. Launch it:
   - **Electron** (OpenCode Desktop, VS Code, Slack): `<App>.exe --remote-debugging-port=<port>`.
   - **WebView2** (OpenPencil and other Tauri apps): WebView2 ignores those arguments and reads `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS` instead. From PowerShell: `$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS="--remote-debugging-port=<port>"; & "<path to app.exe>"`.

   Done when `http://127.0.0.1:<port>/json/version` answers from Windows.
4. Reach the port from WSL. With WSL's default NAT networking, Windows loopback isn't visible from WSL; start `node scripts/cdp-relay.mjs <port> <WSL path to a Windows node.exe>` in the background, after the app is up. Avoid `netsh portproxy`: it has to listen on a network-reachable address, which exposes full control of the app, and its rules can hold the port and loop connections back into WSL. With mirrored networking, the relay isn't needed. Done when `curl http://127.0.0.1:<port>/json/list` lists the app's page.
5. `agent-browser connect <port>`. Give each app its own `--session <name>` when driving more than one.

The relay costs about a third of CDP throughput (48 instead of 77 screencast fps at 4K), which matters only when recording through CDP.

## Drive with agent-browser

- Pass absolute paths to `screenshot` and `record`; relative paths resolve against agent-browser's daemon directory, not yours.
- Check `agent-browser get url` before acting: a session can end up on a stray `about:blank` tab inside the app, where screenshots come back as one flat colour. `tab list`, then switch to the app's tab and close the blank one.
- Keyboard shortcuts (`press`) and `mouse down`/`move`/`up` reach the page. `mouse wheel` lands on the wrong element and `keydown Space` doesn't arrive. To scroll or zoom a canvas, dispatch the event in the page: `canvas.dispatchEvent(new WheelEvent("wheel", { clientX, clientY, deltaX, deltaY, ctrlKey, bubbles: true, cancelable: true }))`.
- For smooth motion, animate in the page (`requestAnimationFrame`, one small event per frame) and run it with a single `eval`, rather than issuing many CLI calls whose latency becomes visible stutter.
- Coordinates are CSS pixels; `devicePixelRatio` is often 2–2.5 on high-DPI screens, so the captured window is that many times larger.

## Check the result

Count distinct frames rather than trusting the container's frame rate, which repeats frames to fill gaps:

```bash
ffmpeg -i out.mp4 -vf mpdecimate=hi=768:lo=320:frac=0.33 -f null - 2>&1 | grep -o 'frame= *[0-9]*' | tail -1
```

For a smoothness test, inject `scripts/fps-probe.js` with `agent-browser eval` so every display frame differs, record a few seconds, and remove it afterwards. Then extract frames (`ffmpeg -ss <t> -i out.mp4 -frames:v 1 frame.png`) and look at them: confirm the crop holds the whole window and nothing covered it.
