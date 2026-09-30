// What each of a decision's options costs, from the Costs records: what every
// figure assumes and leaves out, a bar per option splitting the part every
// option shares from the difference, then the line items, grouped into those
// that differ between options and those that don't. A line differs when it
// "Varies with" this decision. Only the lines on the pages the decision reaches
// (its Page and Applies to, and the overview's own lines) count; a decision
// about the whole design counts every line.
//
//   ### What each option costs {#workers-d1-cost}
//   Monthly, at us-gov-west-1 list prices.
//
//   ::: cost-options D1
//   :::
//
// Every option is priced on the same basis and the same lines, each with its
// category. A line with no figure is Unknown, never $0: the totals count only
// what's known, and say which lines they leave out.

// The longest bar, in px; shorter when a total is a range and its label runs longer.
const BAR_WIDTH = 560;

const BAR_WIDTH_RANGE = 460;

function sumKnown(amounts) {
  let total = [0, 0];

  for (const amount of amounts) {
    if (amount !== null) total = [total[0] + amount[0], total[1] + amount[1]];
  }

  return amounts.every((amount) => amount === null) ? null : total;
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
  const totals = options.map((option) => sumKnown(lines.map((line) => amountFor(line, option))));
  const unknownFor = options.map((option) => lines.filter((line) => amountFor(line, option) === null));
  const partial = unknownFor.some((missing) => missing.length > 0);
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

  // Which lines the totals leave out: the same ones for every option reads as one phrase.
  const names = (missing) => missing.map((line) => line.title.charAt(0).toLowerCase() + line.title.slice(1)).join(", ");
  const sameForAll = unknownFor.every((missing) => names(missing) === names(unknownFor[0]));
  const scope = options.length === 2 ? "both" : "every option";
  const perOption = options.map((option, index) => (unknownFor[index].length > 0 ? `${option.id}, ${names(unknownFor[index])}` : "")).filter(Boolean).join("; ");
  const leftOut = sameForAll ? `${names(unknownFor[0])}, unknown for ${scope}` : `what's unknown (${perOption})`;

  const tags = (line) => {
    const when = line.when || "";
    const parts = [line.category ? `<span class="cost-tag">${esc(line.category)}</span>` : "", when ? `<span class="cost-tag when">${inline(when)}</span>` : ""].filter(Boolean);

    return parts.length === 0 ? "" : `<span class="cost-tags">${parts.join("")}</span>`;
  };

  const row = (line, differs) => {
    const amounts = options.map((option) => amountFor(line, option));
    const lowest = Math.min(...amounts.filter((amount) => amount !== null).map((amount) => amount[1]));

    const cells = options.map((option, index) => {
      const amount = amounts[index];
      const colour = /^[A-D]$/.test(option.id) ? ` opt-${option.id.toLowerCase()}` : "";

      if (amount === null) return `<td class="num"><span class="unknown">${/per use/i.test(line.monthly) ? "Per use" : "Unknown"}</span></td>`;

      if (differs && amount[1] > lowest) return `<td class="num${colour}"><span class="diff">${shown(amount)}</span></td>`;

      return `<td class="num">${shown(amount)}</td>`;
    });

    const cited = [...line.evidence, ...line.affected, ...(String(line.monthly).match(/\b[EQDR]\d+\b/g) ?? [])];

    return `<tr><td><span class="q">${esc(line.title)}</span>${tags(line)}</td><td class="soft">${inline(line.drives)}</td>${cells.join("")}<td>${marks([...new Set(cited)])}</td></tr>`;
  };

  const columns = options.length + 3;
  const heads = options.map((option) => `<th class="num">${esc(option.id)} · ${esc(field({ fields: option.fields }, "Short") ?? option.title)}</th>`);
  const group = (label) => `<tr class="group"><td colspan="${columns}">${label}</td></tr>`;
  const totalCells = totals.map((total) => `<td class="num">${total === null ? "unknown" : shown(total)}</td>`);
  const totalNote = partial ? esc(`Leaves out ${leftOut}.`) : "";

  const rows = [
    ...(differ.length > 0 ? [group("Differs between options"), ...differ.map((line) => row(line, true))] : []),
    ...(same.length > 0 ? [group(options.length === 2 ? "Same in both" : "Same for every option"), ...same.map((line) => row(line, false))] : []),
    `<tr class="total"><td>${partial ? "Known total per month" : "Total per month"}</td><td class="soft">${totalNote}</td>${totalCells.join("")}<td></td></tr>`,
  ];

  if (differ.length === 0) error(`cost-options ${id}: no cost line varies with ${id}; give one 'Varies with: ${id}'`);

  const basis = ["Assumes", "Leaves out"].flatMap((key) => (model.costBasis?.[key] ? [`<div><dt>${key}</dt><dd>${inline(model.costBasis[key])}</dd></div>`] : []));

  return [
    basis.length > 0 ? `<dl class="cost-basis">${basis.join("")}</dl>` : "",
    `<div class="cost-bars">\n${bars.join("\n")}\n</div>`,
    partial ? `<p class="cost-note">${esc(`Known costs only; leaves out ${leftOut}.`)}</p>` : "",
    `<div class="table-wrap">\n<table class="table">\n<thead><tr><th>Line item</th><th>What drives it</th>${heads.join("")}<th></th></tr></thead>\n<tbody>\n${rows.join("\n")}\n</tbody>\n</table>\n</div>`,
  ]
    .filter(Boolean)
    .join("\n");
}
