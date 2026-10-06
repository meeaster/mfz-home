// The plan as a map, drawn from the deliverables: each in a column by what must be delivered first, so those in one
// column can run in parallel, with an arrow from each deliverable to the ones that follow it. A card shows its status,
// its group's colour and its Jira items; clicking it opens the deliverable's modal.
//
//   ::: plan-map
//   :::
//
// The map sits in a canvas the reader can pan and zoom; without the script it scrolls.

const CARD_WIDTH = 220;

const CARD_HEIGHT = 118;

const COLUMN_GAP = 64;

const ROW_GAP = 28;

const PILL = { done: "decided", progress: "leaning", planned: "outline", proposed: "outline" };

const LABEL = { done: "Done", progress: "In progress", planned: "Planned", proposed: "Proposed" };

export default function planMap({ model, esc, inline, error }) {
  const ids = Object.keys(model.records)
    .filter((id) => model.records[id].kind === "deliverable")
    .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));

  if (ids.length === 0) {
    error("plan-map: the design has no deliverables; add them to design.json's plan");

    return "";
  }

  const follows = (id) => (model.records[id].follows ?? []).filter((parent) => ids.includes(parent));
  const depth = new Map();

  const depthOf = (id, seen = new Set()) => {
    if (depth.has(id)) return depth.get(id);

    if (seen.has(id)) return 0;

    seen.add(id);

    const parents = follows(id);
    const value = parents.length === 0 ? 0 : 1 + Math.max(...parents.map((parent) => depthOf(parent, seen)));

    depth.set(id, value);

    return value;
  };

  const columns = [];

  for (const id of ids) {
    const column = depthOf(id);

    columns[column] = [...(columns[column] ?? []), id];
  }

  // Each column sits in the order of the rows its deliverables follow from, so arrows cross as little as they can.
  const row = new Map();

  columns.forEach((column, index) => {
    if (index > 0) {
      const weight = (id) => {
        const parents = follows(id);

        return parents.length === 0 ? 0 : parents.reduce((sum, parent) => sum + (row.get(parent) ?? 0), 0) / parents.length;
      };

      column.sort((a, b) => weight(a) - weight(b) || Number(a.slice(1)) - Number(b.slice(1)));
    }

    column.forEach((id, position) => row.set(id, position));
  });

  const groupIndex = (id) => model.groups.indexOf(model.records[id].group);
  const place = new Map(ids.map((id) => [id, { x: depthOf(id) * (CARD_WIDTH + COLUMN_GAP), y: row.get(id) * (CARD_HEIGHT + ROW_GAP) }]));

  const nodes = ids.map((id) => {
    const record = model.records[id];
    const { x, y } = place.get(id);
    const group = groupIndex(id) >= 0 ? ` grp-${(groupIndex(id) % 6) + 1}` : "";
    const keys = (record.jira ?? []).map((item) => `<a class="jira-key${item.type === "epic" ? " epic" : ""}" href="${esc(item.url)}"${item.state ? ` data-state="${item.state}"` : ""}>${esc(item.key)}</a>`);
    const foot = keys.length > 0 ? `<div class="jira-keys">${keys.join("")}</div>` : '<span class="none">No Jira item yet</span>';

    return [
      `<div class="node deliverable opens${group}" data-detail="${id}-detail" tabindex="0" style="--x:${x};--y:${y};--w:${CARD_WIDTH};--h:${CARD_HEIGHT}">`,
      `<div class="top"><span class="mono">${id}</span><span class="status ${PILL[record.state] ?? "outline"}">${LABEL[record.state] ?? ""}</span></div>`,
      `<div class="q">${inline(record.title)}</div>`,
      `<div class="foot">${foot}</div>`,
      "</div>",
    ].join("");
  });

  // From each deliverable to the ones that follow it: across the gap beside it, then along the gutter above the
  // follower's row when the arrow has columns to cross.
  const edges = [];

  ids.forEach((id) => {
    for (const parent of follows(id)) {
      const from = place.get(parent);
      const to = place.get(id);
      const x1 = from.x + CARD_WIDTH;
      const y1 = from.y + CARD_HEIGHT / 2;
      const x2 = to.x;
      const y2 = to.y + CARD_HEIGHT / 2;
      const near = x1 + COLUMN_GAP / 2 + (row.get(parent) % 3) * 4 - 4;

      if (depthOf(id) - depthOf(parent) === 1) {
        edges.push(y1 === y2 ? `<path class="edge" d="M${x1} ${y1} H${x2}"/>` : `<path class="edge" d="M${x1} ${y1} H${near} V${y2} H${x2}"/>`);
      } else {
        const gutter = to.y - ROW_GAP / 2;
        const far = x2 - COLUMN_GAP / 2;

        edges.push(`<path class="edge" d="M${x1} ${y1} H${near} V${gutter} H${far} V${y2} H${x2}"/>`);
      }
    }
  });

  const width = columns.length * CARD_WIDTH + (columns.length - 1) * COLUMN_GAP;
  const height = Math.max(...columns.map((column) => column.length)) * (CARD_HEIGHT + ROW_GAP) - ROW_GAP;
  const legend = model.groups.map((group, index) => `<span class="grp-${(index % 6) + 1}"><i></i>${esc(group)}</span>`).join("");

  return [
    '<div class="plan-canvas" data-canvas>',
    legend === "" ? "" : `  <div class="plan-groups">${legend}</div>`,
    '  <div class="canvas-viewport diagram-scroll">',
    `    <div class="diagram plan-map" style="--w:${width};--h:${height}">`,
    `      <svg class="edges" viewBox="0 0 ${width} ${height}">\n        ${edges.join("\n        ")}\n      </svg>`,
    `      ${nodes.join("\n      ")}`,
    "    </div>",
    "  </div>",
    '  <div class="canvas-controls" hidden><button type="button" data-zoom="out" aria-label="Zoom out">−</button><span class="zoom-level">100%</span><button type="button" data-zoom="in" aria-label="Zoom in">+</button><button type="button" data-zoom="fit">Fit</button></div>',
    "</div>",
  ]
    .filter(Boolean)
    .join("\n");
}
