// How a decision's options measure up against the requirements, from each
// option's "Meets R1: Yes · how [E1]" fields. A row where every option has the
// same verdict and words becomes one merged cell.
//
//   ::: comparison D1
//   :::

const VERDICT = /^(Yes|Partly|No)\s*·\s*(.*?)\s*(?:\[([^\]]*)\])?$/i;

export default function comparison({ props, model, field, ref, marks, verdict, inline, esc, error }) {
  const id = props.args.find((arg) => /^D\d+$/.test(arg));
  const decision = model.records[id];

  if (decision?.kind !== "decision") {
    error(`comparison: '${id ?? ""}' isn't a decision in design.md; write ::: comparison D1`);

    return "";
  }

  const options = decision.options.filter((option) => option.status !== "set aside");
  const meets = (option, requirement) => field({ fields: option.fields }, `Meets ${requirement}`);
  const named = new Set(options.flatMap((option) => Object.keys(option.fields).filter((name) => /^meets /i.test(name)).map((name) => name.slice(6).trim())));
  const requirements = [...named].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));

  const cell = (option, requirement) => {
    const value = meets(option, requirement);
    const match = VERDICT.exec(value ?? "");

    if (match === null) {
      error(`comparison ${id}: option ${option.id} has no 'Meets ${requirement}'`);

      return { key: "", html: "" };
    }

    return { key: value, html: `${verdict(match[1], inline(match[2]))}${marks(match[3] ?? "")}` };
  };

  const rows = requirements.map((requirement) => {
    const record = model.records[requirement];
    const label = `<td>${ref(requirement)} ${esc(field(record, "Short") ?? record?.title ?? "")}</td>`;
    const cells = options.map((option) => cell(option, requirement));

    if (cells.length > 1 && cells.every((item) => item.key === cells[0].key)) {
      return `<tr>${label}<td colspan="${cells.length}">${cells[0].html}</td></tr>`;
    }

    return `<tr>${label}${cells.map((item) => `<td>${item.html}</td>`).join("")}</tr>`;
  });

  const head = options.map((option) => {
    const colour = /^[A-D]$/.test(option.id) ? ` class="opt-${option.id.toLowerCase()}"` : "";
    const chip = /^\d+$/.test(option.id) ? `<span class="numeral">${esc(option.id)}</span>` : `<span class="letter sm">${esc(option.id)}</span>`;

    return `<th${colour}><span class="opt-head">${chip}${esc(field({ fields: option.fields }, "Short") ?? option.title)}</span></th>`;
  });

  return `<div class="table-wrap">\n<table class="table">\n<thead><tr><th>Requirement</th>${head.join("")}</tr></thead>\n<tbody>\n${rows.join("\n")}\n</tbody>\n</table>\n</div>`;
}
