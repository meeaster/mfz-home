// A security view's data flows, from the Flows records whose ID starts with the
// view's letter (B for B-F1, B-F2, ...). Each row defines the flow, so the
// diagram's F1, F2 chips open it.
//
//   <!-- component flows B -->

const VERDICT = /^(Yes|Partly|No)\s*·\s*(.*?)\s*(?:\[([^\]]*)\])?$/i;

export default function flows({ props, model, field, verdict, ref, inline, esc, ids, error }) {
  const view = props.args[0];
  const shown = (model.flows ?? []).filter((flow) => flow.id.startsWith(`${view}-F`));

  if (shown.length === 0) {
    error(`flows: no flow in design.md starts with '${view ?? ""}-F'`);

    return "";
  }

  const rows = shown.map((flow) => {
    const record = { fields: flow.fields };
    const crosses = VERDICT.exec(field(record, "Crosses") ?? "");
    const assessment = VERDICT.exec(field(record, "Assessment") ?? "");
    const rating = assessment?.[1].toLowerCase();
    const kind = rating === "no" ? " warn" : crosses?.[1].toLowerCase() === "yes" ? " cross" : rating === "partly" ? " warn" : "";
    const number = flow.id.replace(/^.*-/, "");
    const path = field(record, "Path");
    const cites = ids(assessment?.[3] ?? "").map(ref).join(" ");

    return [
      `<tr id="${esc(flow.id)}" data-ref="flow">`,
      `<td><span class="flow${kind}" data-ref-chip>${esc(number)}</span></td>`,
      `<td><span data-ref-text>${inline(flow.title)}</span>${path ? `<span class="sub" data-ref-detail="Path">${inline(path)}</span>` : ""}</td>`,
      `<td class="soft" data-ref-detail="Data">${inline(field(record, "Data") ?? "")}</td>`,
      `<td data-ref-detail="In transit">${inline(field(record, "In transit") ?? "")}</td>`,
      `<td class="soft" data-ref-detail="Auth">${inline(field(record, "Auth") ?? "")}</td>`,
      `<td class="${crosses?.[1].toLowerCase() === "yes" ? "crosses" : "soft"}" data-ref-status="Crosses:">${inline(crosses?.[2] ?? "")}</td>`,
      `<td data-ref-detail="Assessment">${assessment ? verdict(assessment[1], inline(assessment[2])) : ""}${cites ? ` ${cites}` : ""}</td>`,
      "</tr>",
    ].join("");
  });

  const head = ["Flow", "From → to", "Data", "In transit", "Auth", "Crosses", "Assessment"].map((cell) => `<th>${cell}</th>`).join("");

  return `<h4>Data flows</h4>\n<div class="table-wrap"><table class="table">\n<thead><tr>${head}</tr></thead>\n<tbody>\n${rows.join("\n")}\n</tbody>\n</table></div>`;
}
