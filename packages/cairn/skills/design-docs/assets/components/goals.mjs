// The numbered goals under "What we're after", one outcome per line. With no lines of its own it shows
// the bullets of design.md's Goals section. With "served", each goal lists the plan's deliverables that serve it.
//
//   ::: goals
//   - Every firewall log searchable within a minute
//   - Pay only for logs we use
//   :::
//
//   ::: goals served
//   :::

const BULLET = /^(?:-|\d+\.)\s*/;

export default function goals({ props, body, model, inline, ref }) {
  const own = body.trim() !== "";
  const lines = (own ? body : (model.prose?.goals ?? "")).split("\n").map((line) => line.trim());
  const served = props.args.includes("served");
  const deliverables = Object.entries(model.records).filter(([, record]) => record.kind === "deliverable");

  const items = lines
    .filter((line) => (own ? line !== "" : BULLET.test(line) && line !== "-"))
    .map((line, index) => {
      const by = served ? deliverables.filter(([, record]) => (record.serves ?? []).includes(String(index + 1))).map(([id]) => ref(id)) : [];
      const chips = by.length > 0 ? `<span class="served-by">Served by ${by.join("")}</span>` : "";

      return `  <li><span class="n">${String(index + 1).padStart(2, "0")}</span><span class="goal-text">${inline(line.replace(BULLET, ""))}${chips}</span></li>`;
    });

  return `<ol class="goals${served ? " served" : ""}">\n${items.join("\n")}\n</ol>`;
}
