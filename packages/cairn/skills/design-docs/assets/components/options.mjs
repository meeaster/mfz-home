// A decision's options, from its #### records: a card per option still in the
// running or settled, then a line for each option set aside.
//
//   ::: options D1 A=d1-a B=d1-b A-security=d1-a-security B-security=d1-b-security
//   :::
//   ::: options D2 layout=row 1=d2-relay 2=d2-direct
//   :::
//
// <letter>=<component> is the option's diagram; <letter>-security adds a
// security view with the Architecture / Security switch. layout=row puts
// smaller options side by side, without their evidence lists.

function list(title, className, items, inline) {
  if (items.length === 0) return "";

  return `<div class="${className}"><h4>${title}</h4><ul>\n${items.map((item) => `        <li>${inline(item)}</li>`).join("\n")}\n      </ul></div>`;
}

function asList(value) {
  if (Array.isArray(value)) return value;

  return value === undefined || value === "" ? [] : [value];
}

function lowerFirst(text) {
  return /^[A-Z][a-z]/.test(text) ? text[0].toLowerCase() + text.slice(1) : text;
}

async function card(option, props, row, recommendedBy, context) {
  const { esc, inline, field, letter, optionColour, optionClass, optionPill, cite, ref, component } = context;
  const fields = { fields: option.fields };
  const summary = field(fields, "Summary");
  const whyNot = option.status === "not chosen" ? `<p class="why-not"><b>Not chosen:</b> ${inline(field(fields, "Why not") ?? "")}</p>` : "";
  const architecture = props[option.id];
  const security = props[`${option.id}-security`];
  const toggle = security === undefined ? "" : '\n      <div class="view-toggle"><button type="button" data-view="architecture">Architecture</button><button type="button" data-view="security">Security</button></div>';
  const pill = optionPill(option);
  // The AI's pick is advice, so it gets its own tag beside the option's status rather than changing it.
  const advice = recommendedBy === null ? "" : `<span class="ai-tag">AI recommends${recommendedBy === "" ? "" : ` · ${esc(recommendedBy)}`}</span>`;
  const badges = [pill, advice].filter(Boolean).join("");
  const diagram = architecture === undefined ? "" : `    <div class="diagram-wrap diagram-scroll">\n${await component(architecture)}\n    </div>`;
  let views = diagram;

  if (security !== undefined) {
    views = `    <div class="view-panel" data-view-panel="architecture">\n${diagram}\n    </div>\n    <div class="view-panel" data-view-panel="security">\n${await component(security)}\n    </div>`;
  }

  const cites = asList(field(fields, "Evidence")).flatMap((value) => String(value).split(/,\s*(?=[EQDR]\d+\b)/)).map(cite).filter((item) => item !== null);
  const citeItems = cites.map((item) => `${ref(item.id)}${inline(item.text)}`);
  const good = list("Works well", "good", asList(field(fields, "Works well")), inline);
  const risk = list("Costs and risks", "risk", asList(field(fields, "Costs and risks")), inline);
  const evidence = row ? "" : list("Evidence", "cites", citeItems, (html) => html);
  const assess = [good, risk, evidence].filter(Boolean).join("\n      ");
  const classes = ["option", optionColour(option), optionClass(option)].filter(Boolean).join(" ");

  return [
    `  <article class="${classes}">`,
    '    <div class="option-head">',
    `      ${letter(option)}`,
    `      <div class="text"><h3>${esc(option.title)}</h3>${summary === undefined ? "" : `<p>${inline(summary)}</p>`}${whyNot}</div>${toggle}${badges === "" ? "" : `\n      <div class="option-badges">${badges}</div>`}`,
    "    </div>",
    views,
    `    <div class="assess${row ? " stacked" : ""}">\n      ${assess}\n    </div>`,
    "  </article>",
  ]
    .filter(Boolean)
    .join("\n");
}

function setAside(option, { esc, inline, field, letter }) {
  const date = option.statusText.replace(/^set aside\s*/i, "");
  const chip = letter(option, "sm").replace('class="letter sm"', 'class="letter sm plain"');

  return [
    '  <div class="set-aside">',
    `    ${chip}`,
    "    <div>",
    `      <h4>Set aside: ${esc(lowerFirst(option.title))} <span class="mono">${esc(date)}</span></h4>`,
    `      <p>${inline(field({ fields: option.fields }, "Why not") ?? "")}</p>`,
    "    </div>",
    "  </div>",
  ].join("\n");
}

export default async function options(context) {
  const { props, model, error } = context;
  const id = props.args.find((arg) => /^D\d+$/.test(arg));
  const decision = model.records[id];

  if (decision?.kind !== "decision") {
    error(`options: '${id ?? ""}' isn't a decision in design.md; write ::: options D1`);

    return "";
  }

  for (const key of Object.keys(props)) {
    const letter = key.replace(/-security$/, "");

    if (key !== "args" && key !== "layout" && !props.args.includes(key) && !decision.options.some((option) => option.id === letter)) {
      error(`options ${id}: ${id} has no option ${letter}`);
    }
  }

  const row = props.layout === "row";
  const shown = decision.options.filter((option) => option.status !== "set aside");
  const cards = [];

  for (const option of shown) {
    cards.push(await card(option, props, row, option.id === decision.recommended ? (decision.recommendedBy ?? "") : null, context));
  }

  const asides = decision.options.filter((option) => option.status === "set aside").map((option) => setAside(option, context));
  const body = row ? `<div class="option-row">\n${cards.join("\n")}\n</div>` : cards.join("\n\n");

  return [body, ...asides].join("\n\n");
}
