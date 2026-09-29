// The design as drawn on an overview or area page: a title, the block's text as
// its summary, the diagram component, and the page's parts table.
//
//   ::: design-card title="Buckets, prefixes and keys" diagram=s3-buckets
//   Two buckets in the archive account, one prefix and key per customer.
//   :::
//
// security=<component> adds a security view with the Architecture / Security
// switch; the component holds its diagram, key and <!-- component flows S -->.
// parts=false leaves the parts table out (an overview whose design has areas).

export default async function designCard({ props, body, esc, inline, component }) {
  const summary = body === "" ? "" : `<p>${inline(body.split("\n").join(" "))}</p>`;
  const diagram = props.diagram === undefined ? "" : `    <div class="diagram-wrap diagram-scroll">\n${await component(props.diagram)}\n    </div>`;
  const parts = props.parts === "false" ? "" : '\n    <div class="parts">\n      <h4>The parts</h4>\n      <!-- records parts -->\n    </div>';
  let toggle = "";
  let views = diagram;

  if (props.security !== undefined) {
    toggle = '\n      <div class="view-toggle"><button type="button" data-view="architecture">Architecture</button><button type="button" data-view="security">Security</button></div>';
    views = `    <div class="view-panel" data-view-panel="architecture">\n${diagram}\n    </div>\n    <div class="view-panel" data-view-panel="security">\n${await component(props.security)}\n    </div>`;
  }

  return [
    '<article class="option design">',
    '    <div class="option-head">',
    `      <div class="text"><h3>${esc(props.title ?? "")}</h3>${summary}</div>${toggle}`,
    "    </div>",
    views,
    `${parts}`,
    "  </article>",
  ]
    .filter(Boolean)
    .join("\n");
}
