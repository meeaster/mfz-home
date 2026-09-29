// A brief's decision map, drawn from the records: the brief's decisions, the
// ones they follow and the ones waiting on them (as context), in columns by
// what must be decided first, with the open questions each unsettled one waits on.
//
//   ::: decision-map
//   :::
//
// It maps the decisions this page has sections for; list others to map those
// instead (::: decision-map D1 D2). For a map drawn by hand, write a component
// of the design's own and bind its parts to the records.
//
// Questions sit to the right of decisions in the last column, and under the
// others: one or two in a row, more in pairs along a spine.

const CARD_WIDTH = 232;

const COLUMN_GAP = 64;

const BLOCK_GAP = 28;

const SIDE_GAP = 24;

const SIDE_WIDTH = 136;

const BELOW_WIDTH = 124;

const BELOW_DROP = 24;

const PAIR_GAP = 16;

const QUESTION_GAP = 10;

// Lines the text wraps to, word by word, so a box is tall enough for the words that don't fit.
function lines(text, perLine) {
  let count = 1;
  let used = 0;

  for (const word of text.split(/\s+/).filter(Boolean)) {
    const needed = used === 0 ? word.length : used + 1 + word.length;

    if (needed > perLine && used > 0) {
      count += 1;
      used = word.length;
    } else {
      used = needed;
    }
  }

  return count;
}

function questionHeight(text, width) {
  return 38 + lines(text, Math.floor((width - 22) / 6.4)) * 16;
}

function foot(record, shortDate) {
  if (/^given\b/i.test(record.fields.Status ?? "")) return record.fields.Source ?? "";

  if (record.state === "decided") {
    const where = [record.fields["Decided in"], record.fields["Worked out in"]].find((value) => /^meeting-\d{4}-\d{2}-\d{2}$/.test(value ?? ""));
    const decided = where === undefined ? "Decided" : `Decided ${shortDate(where.slice(8))}`;

    return record.chosen === null ? decided : `${decided} · ${record.chosen}`;
  }

  const shown = record.options.filter((option) => option.status !== "set aside").map((option) => option.id);
  const aside = record.options.filter((option) => option.status === "set aside").map((option) => option.id);

  if (shown.length > 0) return `Options ${shown.join(", ")}${aside.length > 0 ? ` · ${aside.join(", ")} set aside` : ""}`;

  return record.shapes ?? "";
}

// Questions beside a decision in the last column: stacked, centred on the card.
function besideLayout(questions, x, y, cardHeight) {
  const stack = questions.reduce((total, question) => total + question.height, 0) + QUESTION_GAP * (questions.length - 1);
  const qx = x + CARD_WIDTH + SIDE_GAP;
  const middle = y + cardHeight / 2;
  const placed = [];
  const edges = [];
  let qy = stack < cardHeight ? y + (cardHeight - stack) / 2 : y;

  for (const question of questions) {
    placed.push({ ...question, x: qx, y: Math.round(qy), width: SIDE_WIDTH });
    qy += question.height + QUESTION_GAP;
  }

  if (placed.length === 1) {
    edges.push(`M${x + CARD_WIDTH} ${Math.round(middle)} H${qx}`);
  } else if (placed.length > 1) {
    const spine = x + CARD_WIDTH + SIDE_GAP / 2;
    const top = Math.min(middle, placed[0].y + placed[0].height / 2);
    const bottom = Math.max(middle, placed.at(-1).y + placed.at(-1).height / 2);

    edges.push(`M${x + CARD_WIDTH} ${Math.round(middle)} H${spine}`, `M${spine} ${Math.round(top)} V${Math.round(bottom)}`);

    for (const question of placed) edges.push(`M${spine} ${Math.round(question.y + question.height / 2)} H${qx}`);
  }

  return { placed, edges, height: Math.max(cardHeight, stack) };
}

// Questions under a decision: one centred, two side by side, more in pairs along a spine.
function belowLayout(questions, x, y, cardHeight) {
  const centre = x + CARD_WIDTH / 2;
  const top = y + cardHeight + BELOW_DROP;
  const placed = [];
  const edges = [];
  let rowY = top;

  for (let index = 0; index < questions.length; index += 2) {
    const row = questions.slice(index, index + 2);
    const rowHeight = Math.max(...row.map((question) => question.height));

    row.forEach((question, side) => {
      const qx = row.length === 1 && questions.length === 1 ? centre - BELOW_WIDTH / 2 : side === 0 ? centre - PAIR_GAP / 2 - BELOW_WIDTH : centre + PAIR_GAP / 2;

      placed.push({ ...question, x: Math.round(qx), y: rowY, width: BELOW_WIDTH, height: rowHeight });
    });

    rowY += rowHeight + QUESTION_GAP;
  }

  if (questions.length <= 2) {
    for (const question of placed) {
      const qx = Math.round(question.x + BELOW_WIDTH / 2);

      edges.push(`M${qx} ${y + cardHeight} V${top}`);
    }
  } else {
    const last = placed.at(-1);

    edges.push(`M${centre} ${y + cardHeight} V${Math.round(last.y + last.height / 2)}`);

    for (const question of placed) {
      const edge = question.x < centre ? question.x + BELOW_WIDTH : question.x;

      edges.push(`M${centre} ${Math.round(question.y + question.height / 2)} H${edge}`);
    }
  }

  return { placed, edges, height: questions.length === 0 ? cardHeight : rowY - QUESTION_GAP - y };
}

export default function decisionMap({ props, model, pageDecisions = [], prefix = "", field, status, ref, esc, inline, shortDate, ids, error }) {
  const listed = props.args.filter((arg) => /^D\d+$/.test(arg));
  const scope = listed.length > 0 ? listed : pageDecisions;
  const unknown = scope.filter((id) => model.records[id]?.kind !== "decision");

  if (scope.length === 0 || unknown.length > 0) {
    error(`decision-map: ${unknown.length > 0 ? `${unknown.join(", ")} isn't a decision in design.md` : "no decisions to map; list them, or give the page ## D1 sections"}`);

    return "";
  }

  const byNumber = (a, b) => Number(a.slice(1)) - Number(b.slice(1));
  const included = new Set(scope);

  for (const id of scope) {
    for (const other of [...(model.records[id].follows ?? []), ...(model.records[id].unblocks ?? [])]) included.add(other);
  }

  const depth = new Map();

  const depthOf = (id, seen = new Set()) => {
    if (depth.has(id)) return depth.get(id);

    if (seen.has(id)) return 0;

    seen.add(id);

    const parents = (model.records[id].follows ?? []).filter((parent) => included.has(parent));
    const value = parents.length === 0 ? 0 : 1 + Math.max(...parents.map((parent) => depthOf(parent, seen)));

    depth.set(id, value);

    return value;
  };

  const columns = [];

  for (const id of [...included].sort(byNumber)) {
    const column = depthOf(id);

    columns[column] = [...(columns[column] ?? []), id];
  }

  // Every unsettled decision on the map shows the open questions it waits on, each question once.
  const cardHeight = 76 + Math.max(...[...included].map((id) => lines(model.records[id].title, 24))) * 20;
  const shownQuestions = new Set();
  const questionsOf = new Map();

  columns.forEach((column, index) => {
    const width = index === columns.length - 1 ? SIDE_WIDTH : BELOW_WIDTH;

    for (const id of column) {
      const record = model.records[id];
      const open = record.state === "decided" ? [] : ids(field(record, "Waiting on")).filter((q) => model.records[q]?.state === "open" && !shownQuestions.has(q));

      for (const q of open) shownQuestions.add(q);

      questionsOf.set(
        id,
        open.map((q) => {
          const text = field(model.records[q], "Short") ?? model.records[q].title;

          return { id: q, text, height: questionHeight(text, width) };
        }),
      );
    }
  });

  // Questions under the first column reach a little past its left edge.
  const firstHasBelow = columns.length > 1 && columns[0].some((id) => questionsOf.get(id).length > 1);
  const left = firstHasBelow ? (BELOW_WIDTH * 2 + PAIR_GAP - CARD_WIDTH) / 2 : 0;
  const nodes = [];
  const edges = [];
  const place = new Map();
  const heights = [];

  columns.forEach((column, index) => {
    const x = left + index * (CARD_WIDTH + COLUMN_GAP);
    const last = index === columns.length - 1;
    let y = 0;

    for (const id of column) {
      const record = model.records[id];
      const style = `--x:${x};--y:${y};--w:${CARD_WIDTH};--h:${cardHeight}`;
      const inScope = scope.includes(id);
      const inner = `<div class="top"><span class="mono">${id}</span>${status(id)}</div><div class="q">${inline(record.title)}</div><div class="foot">${inline(foot(record, shortDate))}</div>`;

      if (inScope && prefix !== "") {
        nodes.push(`<a class="node decision" href="#${esc(prefix)}-${id.toLowerCase()}" style="${style};text-decoration:none">${inner}</a>`);
      } else {
        nodes.push(`<div class="node decision${inScope ? "" : " context"}" style="${style}">${inner}</div>`);
      }

      place.set(id, { x, y });

      const laid = (last ? besideLayout : belowLayout)(questionsOf.get(id), x, y, cardHeight);

      for (const question of laid.placed) {
        nodes.push(`<div class="node question" style="--x:${question.x};--y:${question.y};--w:${question.width};--h:${question.height}">${ref(question.id)}${esc(question.text)}</div>`);
      }

      for (const path of laid.edges) edges.push(`<path class="edge link" d="${path}"/>`);

      y += laid.height + BLOCK_GAP;
    }

    heights.push(y - BLOCK_GAP);
  });

  // Must be decided first: from each decision to the ones that follow it.
  for (const id of included) {
    for (const next of model.records[id].unblocks ?? []) {
      if (!included.has(next)) continue;

      const from = place.get(id);
      const to = place.get(next);
      const x1 = from.x + CARD_WIDTH;
      const y1 = Math.round(from.y + cardHeight / 2);
      const y2 = Math.round(to.y + cardHeight / 2);
      const middle = x1 + COLUMN_GAP / 2;

      edges.push(y1 === y2 ? `<path class="edge" d="M${x1} ${y1} H${to.x}"/>` : `<path class="edge" d="M${x1} ${y1} H${middle} V${y2} H${to.x}"/>`);
    }
  }

  const hasSide = columns.at(-1).some((id) => questionsOf.get(id).length > 0);
  const width = left + columns.length * CARD_WIDTH + (columns.length - 1) * COLUMN_GAP + (hasSide ? SIDE_GAP + SIDE_WIDTH : 0);
  const height = Math.max(...heights);

  return [
    '<div class="diagram-scroll">',
    `  <div class="diagram" style="--w:${width};--h:${height}">`,
    `    <svg class="edges" viewBox="0 0 ${width} ${height}">\n      ${edges.join("\n      ")}\n    </svg>`,
    `    ${nodes.join("\n    ")}`,
    "  </div>",
    "</div>",
  ].join("\n");
}
