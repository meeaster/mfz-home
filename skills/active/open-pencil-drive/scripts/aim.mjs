// Aim the OpenPencil camera at a node: frame it in the middle of the canvas with one eased camera.js move.
//
//   node aim.mjs <document_id> <page_id> <node_id> [--margin 0.1] [--ms 1500] [--session <agent-browser session>] [--dry-run]
//
// Or, inside a build script whose MCP session has already stopped following:
//
//   import { aim } from "./aim.mjs";
//   await aim(op, { documentId, pageId, nodeId });
//
// A session's first call that names a node (node_bounds, get_node, edits) starts Follow Agents and jumps the
// view, so the CLI stops following before it reads the view. Do that once at setup, not mid-recording.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { withSession } from "./op-mcp.mjs";

const cameraSource = readFileSync(new URL("./camera.js", import.meta.url), "utf8");

function agentBrowser(session, ...args) {
  const sessionArgs = session ? ["--session", session] : [];

  return execFileSync("agent-browser", [...sessionArgs, ...args], { encoding: "utf8" }).trim();
}

/** agent-browser prints eval results as JSON; a returned string arrives JSON-encoded once more. */
function evalJson(session, expression) {
  return JSON.parse(JSON.parse(agentBrowser(session, "eval", `JSON.stringify(${expression})`)));
}

function canvasBox(session) {
  return evalJson(session, `(() => {
    const r = [...document.querySelectorAll("canvas")].at(-1).getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height, innerWidth, innerHeight };
  })()`);
}

/** Clicks the editor's "Stop following" button if an agent holds the view, and closes the presence popover. */
export function stopFollowing(session) {
  const ref = agentBrowser(session, "snapshot", "-i")
    .split("\n")
    .find((line) => line.includes('"Stop following"'))
    ?.match(/ref=(e\d+)/)?.[1];

  if (ref) {
    agentBrowser(session, "click", `@${ref}`);
    agentBrowser(session, "press", "Escape");
  }

  return Boolean(ref);
}

// viewport_get's centre is the canvas point at the middle of the whole window (as if the canvas filled it),
// so a canvas point p lands at canvas.left + innerWidth/2 + (p - centre) * zoom, in CSS pixels.
function toScreen(point, view, box) {
  return {
    x: box.left + box.innerWidth / 2 + (point.x - view.center.x) * view.zoom,
    y: box.top + box.innerHeight / 2 + (point.y - view.center.y) * view.zoom,
  };
}

function boxCentre(box) {
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

function nodeCentre(bounds) {
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}

/** One camera.js step that scales the node to fit the canvas less `margin` per side and centres it. */
export function planAim(bounds, view, box, { margin = 0.1, ms = 1500 } = {}) {
  const from = toScreen(nodeCentre(bounds), view, box);
  const to = boxCentre(box);

  const scale = Math.min(
    (box.width * (1 - 2 * margin)) / (bounds.width * view.zoom),
    (box.height * (1 - 2 * margin)) / (bounds.height * view.zoom),
  );

  // A zoom too small to see is a pan; one wheel unit pans the view 2 CSS px.
  if (Math.abs(Math.log(scale)) < 0.03) {
    return { ms, dx: (from.x - to.x) / 2, dy: (from.y - to.y) / 2 };
  }

  // Zooming by k around a fixes a and maps s to a + (s - a) k; solve for the a that sends s to the target.
  const anchor = (s, t) => (t - scale * s) / (1 - scale);

  return { ms, zoom: scale, at: [anchor(from.x, to.x), anchor(from.y, to.y)] };
}

/**
 * Frames a node from an MCP session that has already stopped following. Pass a TakeLog as `log` to record the
 * move. Returns the step and where the node landed.
 */
export async function aim(op, { documentId, pageId, nodeId, margin, ms, session, log, dryRun = false }) {
  const { bounds } = await op.call("node_bounds", { document_id: documentId, page_id: pageId, id: nodeId });
  const view = await op.call("viewport_get", { document_id: documentId });
  const box = canvasBox(session);
  const step = planAim(bounds, view, box, { margin, ms });

  if (dryRun) return { bounds, view, step };

  const move = () => agentBrowser(session, "eval", `(${cameraSource})([${JSON.stringify(step)}])`);

  if (log) await log.span("aim", { nodeId }, async () => move());
  else move();

  const after = await op.call("viewport_get", { document_id: documentId });
  const landed = toScreen(nodeCentre(bounds), after, box);
  const target = boxCentre(box);

  return { step, zoom: after.zoom, wantedZoom: view.zoom * (step.zoom ?? 1), miss: { x: landed.x - target.x, y: landed.y - target.y } };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      margin: { type: "string", default: "0.1" },
      ms: { type: "string", default: "1500" },
      session: { type: "string" },
      "dry-run": { type: "boolean", default: false },
    },
  });

  const [documentId, pageId, nodeId] = positionals;

  if (!nodeId) {
    console.error("usage: node aim.mjs <document_id> <page_id> <node_id> [--margin 0.1] [--ms 1500] [--session name] [--dry-run]");
    process.exit(2);
  }

  await withSession("Camera", async (op) => {
    // Claim this session's follow with a read of the node, then release the view before measuring it.
    await op.call("node_bounds", { document_id: documentId, page_id: pageId, id: nodeId });
    await new Promise((resolve) => setTimeout(resolve, 300));
    stopFollowing(values.session);

    const result = await aim(op, {
      documentId,
      pageId,
      nodeId,
      margin: Number(values.margin),
      ms: Number(values.ms),
      session: values.session,
      dryRun: values["dry-run"],
    });

    console.log(JSON.stringify(result));
  });
}
