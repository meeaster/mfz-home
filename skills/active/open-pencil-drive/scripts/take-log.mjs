// Timeline for editing a take afterwards: what happened when, in video seconds, and where the canvas sits
// in the video's pixels.
//
//   import { TakeLog } from "./take-log.mjs";
//   const log = new TakeLog();
//   log.mark("render", { section: "hero", nodeId });      // instant event
//   await aim(op, { ..., log });                          // aim logs its own move as a span
//   // after `record-window.sh stop`, which wrote <video>.json:
//   log.save("take.mp4", { session });                    // writes take.mp4.take.json
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

function agentBrowserJson(session, expression) {
  const sessionArgs = session ? ["--session", session] : [];
  const printed = execFileSync("agent-browser", [...sessionArgs, "eval", `JSON.stringify(${expression})`], { encoding: "utf8" });

  return JSON.parse(JSON.parse(printed));
}

export class TakeLog {
  events = [];

  /** Records an instant event at the current time. */
  mark(label, details = {}) {
    this.events.push({ label, atMs: Date.now(), ...details });
  }

  /** Records an event with a duration; `run` is awaited and its result returned. */
  async span(label, details, run) {
    const startMs = Date.now();
    const result = await run();

    this.events.push({ label, atMs: startMs, endMs: Date.now(), ...details });

    return result;
  }

  /**
   * Writes <video>.take.json from the recorder's <video>.json: events in seconds from the first frame, and the
   * canvas element's box in video pixels (read now from the page, so the window must not have moved).
   */
  save(videoPath, { session } = {}) {
    const recording = JSON.parse(readFileSync(`${videoPath}.json`, "utf8"));

    const page = agentBrowserJson(session, `(() => {
      const r = [...document.querySelectorAll("canvas")].at(-1).getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height, dpr: devicePixelRatio };
    })()`);

    // The page fills the window's client area, so CSS pixels scale by dpr from the client origin.
    const originX = recording.client.x - recording.capture.x;
    const originY = recording.client.y - recording.capture.y;

    // Clipped to the video: the window can extend past the captured area (behind the taskbar, off screen).
    const left = Math.max(0, Math.round(originX + page.left * page.dpr));
    const top = Math.max(0, Math.round(originY + page.top * page.dpr));
    const right = Math.min(recording.video.width, Math.round(originX + (page.left + page.width) * page.dpr));
    const bottom = Math.min(recording.video.height, Math.round(originY + (page.top + page.height) * page.dpr));

    const canvas = { x: left, y: top, width: right - left, height: bottom - top };

    const seconds = (ms) => Math.round(ms - recording.startedAtMs) / 1000;

    const events = this.events.map(({ atMs, endMs, ...rest }) => (endMs === undefined
      ? { t: seconds(atMs), ...rest }
      : { t: seconds(atMs), end: seconds(endMs), ...rest }));

    const take = { video: videoPath, size: recording.video, canvas, events };

    writeFileSync(`${videoPath}.take.json`, `${JSON.stringify(take, null, 2)}\n`);

    return take;
  }
}
