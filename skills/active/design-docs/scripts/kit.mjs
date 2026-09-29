// The markup kit every component builds from, the skill's own and a design's.
// A component receives these on its context, already bound to the design's
// records, so its output matches the rest of the doc without copying markup:
//
//   export default ({ props, body, ref, status, table, inline }) => table(["ID", "Note"], rows)

const KIND_CLASS = { E: "ref-e", Q: "ref-q", D: "ref-d", R: "ref-r" };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const DECISION_PILL = { open: "open", leaning: "leaning", decided: "decided", later: "" };

const OPTION_CLASS = { "current leaning": "leaning", chosen: "chosen", "not chosen": "not-chosen" };

const OPTION_PILL = { "current leaning": ["leaning", "Current leaning"], chosen: ["decided", "Chosen"] };

export function esc(text) {
  return String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function icon(name, attrs = "") {
  return `<svg${attrs}><use href="#i-${esc(name.replace(/^i-/, ""))}"/></svg>`;
}

export function shortDate(iso) {
  const match = /^\d{4}-(\d{2})-(\d{2})$/.exec(iso ?? "");

  return match === null ? (iso ?? "") : `${MONTHS[Number(match[1]) - 1]} ${Number(match[2])}`;
}

export function longDate(iso) {
  const match = /^(\d{4})-\d{2}-\d{2}$/.exec(iso ?? "");

  return match === null ? (iso ?? "") : `${shortDate(iso)}, ${match[1]}`;
}

export function money(amount) {
  return `$${Math.round(amount).toLocaleString("en-US")}`;
}

// A list field's IDs: "E1, E2" or ["E1", "E2"].
export function ids(value) {
  const items = Array.isArray(value) ? value : String(value ?? "").split(",");

  return items.map((item) => item.trim()).filter((item) => /^[EQDR]\d+$/.test(item));
}

export function makeKit(model, inline) {
  const records = model.records;

  const field = (record, name) => {
    const wanted = name.toLowerCase();
    const key = Object.keys(record?.fields ?? {}).find((item) => item.toLowerCase() === wanted);

    return key === undefined ? undefined : record.fields[key];
  };

  const ref = (id) => `<a class="ref ${KIND_CLASS[id[0]] ?? ""}" href="#${esc(id)}">${esc(id)}</a>`;

  const marks = (list) => {
    const found = ids(list);

    return found.length === 0 ? "" : `<div class="marks">${found.map(ref).join("")}</div>`;
  };

  // A decision's status pill, as the decisions table shows it.
  const status = (id) => {
    const record = records[id];
    const text = field(record, "Status") ?? "Open";

    return `<span class="${["status", DECISION_PILL[record?.state] ?? ""].join(" ").trim()}">${esc(text)}</span>`;
  };

  const verdict = (kind, html) => `<span class="verdict ${esc(kind.toLowerCase())}">${html}</span>`;

  const table = (head, rows, { headClasses = {} } = {}) => {
    const cells = head.map((cell, index) => `<th${headClasses[index] ? ` class="${headClasses[index]}"` : ""}>${cell}</th>`).join("");
    const body = rows.map((row) => (Array.isArray(row) ? `<tr>${row.map((cell) => (cell.startsWith("<td") ? cell : `<td>${cell}</td>`)).join("")}</tr>` : row)).join("\n");

    return `<div class="table-wrap"><table class="table">\n<thead><tr>${cells}</tr></thead>\n<tbody>\n${body}\n</tbody>\n</table></div>`;
  };

  // An option's letter chip, or a numeral for a numbered option.
  const letter = (option, size = "") => {
    const numbered = /^\d+$/.test(option.id);
    const classes = numbered ? "numeral" : ["letter", size].filter(Boolean).join(" ");

    return `<span class="${classes}">${esc(option.id)}</span>`;
  };

  const optionColour = (option) => (/^[A-D]$/.test(option.id) ? `opt-${option.id.toLowerCase()}` : "");
  const optionClass = (option) => OPTION_CLASS[option.status] ?? "";

  const optionPill = (option) => {
    if (option.status === "not chosen") return `<span class="status">${esc(option.statusText)}</span>`;

    const pill = OPTION_PILL[option.status];

    return pill === undefined ? "" : `<span class="status ${pill[0]}">${pill[1]}</span>`;
  };

  // What a cited record says: the citing field's own words ("E1: text"), else the record's Short or title.
  const cite = (item) => {
    const match = /^([EQDR]\d+)(?::\s*(.*))?$/.exec(item.trim());

    if (match === null) return null;

    const record = records[match[1]];

    return { id: match[1], text: match[2] ?? field(record, "Short") ?? record?.title ?? "" };
  };

  const pageLink = (href, label, name = "arrow-right") => `<a class="page-link" href="#${esc(href)}">${icon(name)}${esc(label)}</a>`;

  return { esc, icon, shortDate, longDate, money, ids, field, ref, marks, status, verdict, table, letter, optionColour, optionClass, optionPill, cite, pageLink, inline };
}
