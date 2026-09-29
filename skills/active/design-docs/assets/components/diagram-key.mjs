// The legend under or above a diagram, from named entries. An entry can take
// its own label after a colon; entries are separated by |.
//
//   ::: diagram-key title="Reading the diagrams" items="today | new: Added by the option, in its colour | evidence | question"
//   :::
//
// design puts it in the design's colours (an overview or area design).

const ENTRIES = {
  today: ['<i class="swatch"></i>', "Exists today"],
  outside: ['<i class="swatch"></i>', "Outside the design"],
  new: ['<i class="swatch new"></i>', "Added by this design"],
  pending: ['<i class="swatch pending"></i>', "Waits on a decision"],
  area: ['<i class="swatch area"></i>', "An area, with its own page"],
  context: ['<i class="swatch context"></i>', "Context"],
  covered: ['<i class="swatch new"></i>', "Covered in this brief"],
  blocking: ['<i class="swatch question"></i>', "Open question that blocks it"],
  first: ["", "→ Must be decided first"],
  decision: ['<span class="ref ref-d" data-state="open">D1</span>', "Decision, coloured by status"],
  evidence: ['<span class="ref ref-e">E1</span>', "Evidence"],
  question: ['<span class="ref ref-q">Q1</span>', "Not confirmed yet"],
  boundary: ['<i class="swatch boundary-swatch"></i>', "Compliance boundary"],
  crosses: ['<span class="flow cross">F1</span>', "Crosses the boundary"],
  attention: ['<span class="flow warn">F2</span>', "Needs attention"],
  protected: ['<span class="flow">F4</span>', "Protected"],
  transit: ['<span class="muted" style="font-size:11px;font-weight:500">TLS · FIPS</span>', "Protection in transit"],
};

export default function diagramKey({ props, esc, error }) {
  const entries = String(props.items ?? "")
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [name, ...label] = entry.split(":");
      const known = ENTRIES[name.trim()];

      if (known === undefined) {
        error(`diagram-key: no entry '${name.trim()}' (${Object.keys(ENTRIES).join(", ")})`);

        return "";
      }

      return `    <span>${known[0]}${esc(label.length > 0 ? label.join(":").trim() : known[1])}</span>`;
    });

  const title = props.title === undefined ? "" : `    <strong>${esc(props.title)}</strong>\n`;

  return `<div class="diagram-key${props.design ? " design" : ""}">\n${title}${entries.filter(Boolean).join("\n")}\n  </div>`;
}
