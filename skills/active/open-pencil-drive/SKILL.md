---
name: open-pencil-drive
description: Drive the running OpenPencil editor for video — camera moves (zoom, pan, page tours), building a design over MCP while it is filmed, and recording the result. Use when asked to record, film, demo, or animate work in OpenPencil, or to make a video of an agent building a design there. Editing designs without recording uses open-pencil.
---

# OpenPencil drive

Film the OpenPencil editor while its canvas moves and a design is built over MCP. Load `windows-app-recording` for launching OpenPencil with a DevTools port, connecting `agent-browser`, and recording the window; this skill covers what is specific to OpenPencil.

OpenPencil's desktop app is Tauri, which on Windows renders in WebView2, so its DevTools port comes from `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`, not a launch argument. Restarting it closes unsaved tabs: save the documents the user cares about (`save_file`) before asking them to quit.

## Two channels

- **MCP** builds and inspects the design. Use the OpenPencil connection the harness already has (MCP tools, or the `openpencil` namespace in OpenCode's code mode). Open your own session with `scripts/op-mcp.mjs` (`withSession(name, async (op) => op.call(tool, args))`, deleted even when the work throws) only from a standalone script; it connects to `http://127.0.0.1:7600/mcp` unless `OPENPENCIL_MCP_URL` says otherwise.
- **agent-browser** on the DevTools port moves the camera, clicks pages, presses shortcuts, and can record. In OpenCode's code mode it is also reachable as `tools['agent-browser']`.

MCP sessions are scarce: the server keeps at most 10 and drops one only after 15 minutes idle or an HTTP `DELETE /mcp` with its `mcp-session-id`. Clients that exit without that DELETE (such as `claude -p`) hold a slot until it expires, and new connections then get `503 Too many active MCP sessions`. When that happens, keep working through the harness's existing connection, or wait for expiry; restarting the app loses unsaved tabs.

## Follow Agents takes the camera

With the editor's Follow Agents preference on (the default), the first call from an MCP session that names a node pins the user's view to that agent's cursor at the current zoom, overriding every camera move. Reads count: `node_bounds` and `get_node` trigger it as edits do; `viewport_get` doesn't. MCP `update_settings` rejects the key, though `get_settings` reports it as `chat.followAgents`.

Turn it off for the take, and back on afterwards:

1. In the right-hand panel, open the **AI** tab and click **Stop following agents as they work** (next to "Conversation history"), then return to the **Design** tab.
2. Check `get_settings` shows `chat.followAgents: false` before recording.
3. After the take, click the same button, now labelled **Follow agents as they work**, and check `get_settings` reads `true` again.

If a "Following …" banner still appears, click its **Stop following** button and press `Escape` to close the "On this page" presence popover; that releases the view for that one session only. `stopFollowing()` in `scripts/aim.mjs` does those two clicks.

The agent's name tag stays on the canvas: with `render` into a parent frame it sits at that frame's top-left corner and doesn't travel to each new child, so the camera has to show where the work is happening.

## Moving the camera

| Input | Effect |
| --- | --- |
| `agent-browser press Shift+1` | Zoom to fit the page (instant cut) |
| `press h`, then `mouse down` / `move` / `up` | Pan with the Hand tool; `press v` returns to Move |
| `mouse down middle` drag | Pan |
| `scripts/aim.mjs` | Smooth move that frames a layer, from its node ID |
| `scripts/camera.js` | Smooth eased zoom and pan to screen points, run in the page |
| MCP `viewport_set`, agent-browser `mouse wheel` | No effect on the user's view |

Aim at layers rather than screen points. In a build script, after the session has stopped following, `await aim(op, { documentId, pageId, nodeId, margin, ms })` reads the node's bounds and the view, then runs one eased move that centres the node and scales it to fit the canvas less `margin` (default 0.1) per side; it returns how far the node landed from the centre, normally under 2 CSS px. From a shell or code mode, `node scripts/aim.mjs <document_id> <page_id> <node_id> [--margin 0.1] [--ms 1500]` does the same in its own short MCP session; with Follow Agents off it is safe mid-recording, otherwise its first read jumps the view. Pass `--session` / `session` when agent-browser drives OpenPencil under a named session.

For moves that aren't about one layer, `agent-browser eval "($(cat scripts/camera.js))([{ms:800},{ms:1600,zoom:2.5,at:[620,400]},{ms:2000,dx:500}])"` runs a whole shot in CSS-pixel screen coordinates and returns when it ends.

After a zoom-in, the canvas shows the old frame stretched and blurry until it redraws at the new zoom, so end zoom-ins with a hold of about a second. Small text renders garbled at low zoom (about 25%), so hold close-ups on text-heavy areas.

## Scripted build on camera

1. Create the page and an empty, fixed-size root frame before recording, so the layout and camera targets don't shift while sections arrive.
2. Turn Follow Agents off (above) and fit the view.
3. Start the recording, then for each section: `render` it into the root frame (`parent_id`), `log.mark` it, `aim` at the node ID it returns (passing `log`), and hold 1–2 seconds so it reads.
4. End with a zoom-out to the whole design and a hold, stop the recording, `log.save` the timeline, and close any MCP session you opened.

Running the build and the camera from one script keeps the timing deterministic; when a model builds live instead, its pauses and retries land in the video.

## Timeline for editing

Record the whole window (the `windows-app-recording` default) and log the take with `scripts/take-log.mjs`, so cuts, speed changes, and canvas-only crops can be made afterwards:

```js
const log = new TakeLog();
log.mark("render", { section: "pricing cards", nodeId });
await aim(op, { documentId, pageId, nodeId, log });   // logged as a span
// after record-window.sh stop:
log.save("take.mp4", { session });                     // writes take.mp4.take.json
```

`take.mp4.take.json` holds each event's `t` (and `end`) in seconds from the first frame, and `canvas`: the canvas element's box in video pixels, clipped to the video. Call `save` before moving the window. Crop to the canvas with `ffmpeg -vf crop=<width>:<height>:<x>:<y>`.

## Check

Extract frames across the take and look at them: each section visible as it is built, no popover or banner over the canvas ("Following …" means a session still holds the view), and the final frame showing the whole design.
