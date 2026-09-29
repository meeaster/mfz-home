// What each of a decision's options costs, from the Costs records: a bar per
// option splitting the part every option shares from the difference, then the
// line items, grouped into those that differ between options and those that
// don't. A line differs when it "Varies with" this decision. Only the lines on
// the pages the decision reaches (its Page and Applies to, and the overview's
// own lines) count; a decision about the whole design counts every line.
//
//   ### What each option costs {#workers-d1-cost}
//   Monthly, at us-gov-west-1 list prices.
//
//   ::: cost-options D1
//   :::

// The longest bar, in px; shorter when a total is a range and its label runs longer.
const BAR_WIDTH = 560;

const BAR_WIDTH_RANGE = 460;

function sum(amounts) {
  if (amounts.some((amount) => amount === null)) return null;

  return amounts.reduce((total, amount) => [total[0] + amount[0], total[1] + amount[1]], [0, 0]);
}

export default function costOptions({ props, model, field, marks, money, esc, inline, error }) {
  const id = props.args.find((arg) => /^D\d+$/.test(arg));
  const decision = model.records[id];

  if (decision?.kind !== "decision") {
    error(`cost-options: '${id ?? ""}' isn't a decision in design.md; write ::: cost-options D1`);

    return "";
  }

  const options = decision.options.filter((option) => option.status !== "set aside");
  const shown = (amount) => (amount === null ? "" : amount[0] === amount[1] ? money(amount[0]) : `${money(amount[0])} → ${money(amount[1])}`);

  // A line that varies with another decision costs what that decision's chosen, or leaned-towards, option costs.
  const current = (line) => {
    if (!line.varies) return line.amounts[""] ?? null;

    const other = model.records[line.varies];

    return line.amounts[other?.chosen ?? other?.leaning ?? ""] ?? null;
  };

  const reach = [field(decision, "Page") ?? "", ...String(field(decision, "Applies to") ?? "").split(",")].flatMap((page) => (page.trim() === "" ? [] : [page.trim()]));
  const lines = reach.length === 0 ? model.costs : model.costs.filter((line) => !line.page || reach.includes(line.page) || line.varies === id);
  const differ = lines.filter((line) => line.varies === id);
  const same = lines.filter((line) => line.varies !== id);
  const amountFor = (line, option) => (line.varies === id ? (line.amounts[option.id] ?? null) : current(line));
  const totals = options.map((option) => sum(lines.map((line) => amountFor(line, option))));
  const known = totals.filter((total) => total !== null);
  const base = known.length === 0 ? 0 : Math.min(...known.map((total) => total[1]));
  const longest = known.some((total) => total[0] !== total[1]) ? BAR_WIDTH_RANGE : BAR_WIDTH;
  const scale = known.length === 0 ? 0 : longest / Math.max(...known.map((total) => total[1]));

  const bars = options.map((option, index) => {
    const total = totals[index];
    const colour = /^[A-D]$/.test(option.id) ? ` opt-${option.id.toLowerCase()}` : "";
    const label = esc(field({ fields: option.fields }, "Short") ?? option.title);

    if (total === null) {
      return `<div class="cost-bar${colour}"><span class="letter sm">${esc(option.id)}</span><span class="label">${label}</span><span class="track"><span class="total">unknown</span></span></div>`;
    }

    const extra = total[1] - base;
    const segments = total[1] === 0 ? "" : `<span class="bar"><span class="seg" style="width:${Math.round(base * scale)}px"></span>${extra > 0 ? `<span class="seg diff" style="width:${Math.round(extra * scale)}px"></span>` : ""}</span>`;
    const delta = extra > 0 ? `<span class="delta">+${money(extra)} a month, about ${money(extra * 12)} a year</span>` : "";

    return `<div class="cost-bar${colour}"><span class="letter sm">${esc(option.id)}</span><span class="label">${label}</span><span class="track">${segments}<span class="total">${shown(total)}</span>${delta}</span></div>`;
  });

  const row = (line, differs) => {
    const amounts = options.map((option) => amountFor(line, option));
    const lowest = Math.min(...amounts.filter((amount) => amount !== null).map((amount) => amount[1]));

    const cells = options.map((option, index) => {
      const amount = amounts[index];
      const colour = /^[A-D]$/.test(option.id) ? ` opt-${option.id.toLowerCase()}` : "";

      if (amount === null) return `<td class="num">${inline(line.monthly)}</td>`;

      if (differs && amount[1] > lowest) return `<td class="num${colour}"><span class="diff">${shown(amount)}</span></td>`;

      return `<td class="num">${shown(amount)}</td>`;
    });

    return `<tr><td>${esc(line.title)}</td><td class="soft">${inline(line.drives)}</td>${cells.join("")}<td>${marks([...line.evidence, ...line.affected])}</td></tr>`;
  };

  const columns = options.length + 3;
  const heads = options.map((option) => `<th class="num">${esc(option.id)} · ${esc(field({ fields: option.fields }, "Short") ?? option.title)}</th>`);
  const group = (label) => `<tr class="group"><td colspan="${columns}">${label}</td></tr>`;
  const totalCells = totals.map((total) => `<td class="num">${total === null ? "unknown" : shown(total)}</td>`);

  const rows = [
    ...(differ.length > 0 ? [group("Differs between options"), ...differ.map((line) => row(line, true))] : []),
    ...(same.length > 0 ? [group(options.length === 2 ? "Same in both" : "Same for every option"), ...same.map((line) => row(line, false))] : []),
    `<tr class="total"><td>Total per month</td><td></td>${totalCells.join("")}<td></td></tr>`,
  ];

  if (differ.length === 0) error(`cost-options ${id}: no cost line varies with ${id}; give one 'Varies with: ${id}'`);

  return [
    `<div class="cost-bars">\n${bars.join("\n")}\n</div>`,
    `<div class="table-wrap">\n<table class="table">\n<thead><tr><th>Line item</th><th>What drives it</th>${heads.join("")}<th></th></tr></thead>\n<tbody>\n${rows.join("\n")}\n</tbody>\n</table>\n</div>`,
  ].join("\n");
}
