# open-pencil-drive

## Intent

Lets an agent film the running OpenPencil editor: smooth camera moves, page tours, and designs built over MCP section by section while recording. Supports the human's plan to mock up presentation scenes in OpenPencil and show the work as video.

Not for: designing or editing without recording (`open-pencil`), or generic window capture (`windows-app-recording`, which this skill layers on).

Success: a recording where each built section is visible as it arrives, the camera shows where the work is, no editor popover or follow banner covers the canvas, and no MCP sessions are left holding slots.

## Scenarios

- **"Record yourself building a landing page in OpenPencil"**: pre-creates a fixed root frame, claims and stops following, renders sections between camera moves, zooms out at the end.
- **"Make a clip touring the model-comparison pages"**: clicks page buttons, fits each page, records.
- **MCP returns `503 Too many active MCP sessions`**: waits for idle sessions to expire and closes its own, rather than restarting the editor and losing unsaved tabs.
- **Camera keeps snapping back during a build**: recognises Follow Agents and stops following.
- **"Change this button's colour in OpenPencil"** with no recording: this skill shouldn't load.

## Decisions

- **Name `open-pencil-drive`** (human, 2026-10-13), beside the vendored `open-pencil` skill.
- **Camera by in-page wheel events** (2026-10-13): MCP `viewport_set` and agent-browser `mouse wheel` don't move the user's view; keyboard, Hand-tool drag, middle drag, and dispatched `WheelEvent`s do. Constants measured on 0.16.0-beta.3: ctrl-wheel `deltaY d` zooms by `exp(-0.0139 d)`; a pan unit is about 2 CSS px; single events near ±100 zoomed by a different rule (one sequence hit the 2% minimum), so steps stay small.
- **Stop following before filming** (2026-10-13): the first MCP call from a session that names a node, reads included (`node_bounds`, `get_node`), pins the view to its cursor; `viewport_get` doesn't. Follow Agents can't be changed through `update_settings` and wasn't found in the settings dialog. After one "Stop following", later calls from that session leave the view alone, hence one session per take.
- **Fixed-size root frame** (2026-10-13): keeps camera targets stable while sections arrive; a hugging frame grows and moves them.
- **Global Follow Agents switch first** (2026-10-13): GPT-6.1 Sol (OpenCode) lost its first take to following and found the AI-panel toggle ("Stop following agents as they work" / "Follow agents as they work"), which flips `chat.followAgents`; verified both ways. The per-session "Stop following" click stays as the fallback.
- **Harness MCP connection before new sessions** (2026-10-13): in the same run `op-mcp.mjs` got 503 because the pool was full; the harness's existing connection (OpenCode code mode) kept working.
- **Close MCP sessions explicitly** (2026-10-13): the server caps sessions at 10 with a 15-minute idle expiry; three `claude -p` runs that exited without DELETE blocked the next run for about 15 minutes.
- **Aim at layers** (human asked to test, 2026-10-13): `viewport_get`'s centre is the canvas point at the middle of the whole window, not of the canvas element; with that mapping a single anchored zoom (anchor solved so the node centre lands on the canvas centre) or a 2 CSS px-per-unit pan framed hero, features, CTA, footer, page, and a card within 2 px. The first misses (up to 580 px) came from a new session's `node_bounds` read jumping the view mid-plan.
- **Record whole, edit afterwards** (human, 2026-10-13): camera moves are for shots editing can't fake (sharp close-ups); crops, cuts, and speed changes happen in post, guided by `take-log.mjs`'s timeline and canvas box. Checked on a logged take: the aim spans matched the frames and the canvas box matched the canvas element.
- **Hold after zoom-ins** (2026-10-13): the retained canvas shows the previous frame scaled and blurred until it redraws.
- **Node for helper scripts** (human, 2026-10-13): the relay already needs Node and Node has `fetch`, so the MCP client and aiming helper are `.mjs`; browser-side code stays plain JS.

## Sources

| Source | Revision | Local use |
|---|---|---|
| OpenPencil desktop and `@open-pencil/mcp` | 0.16.0-beta.3 (session limits read from `@open-pencil/mcp` 0.15.1 source) | All behaviour above, observed 2026-10-13 on Windows via WSL |
