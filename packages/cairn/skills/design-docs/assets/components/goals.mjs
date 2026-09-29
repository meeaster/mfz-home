// The numbered goals under "What we're after", one outcome per line. With no lines of its own it shows
// the bullets of design.md's Goals section.
//
//   ::: goals
//   - Every firewall log searchable within a minute
//   - Pay only for logs we use
//   :::

const BULLET = /^(?:-|\d+\.)\s*/;

export default function goals({ body, model, inline }) {
  const own = body.trim() !== "";
  const lines = (own ? body : (model.prose?.goals ?? "")).split("\n").map((line) => line.trim());

  const items = lines
    .filter((line) => (own ? line !== "" : BULLET.test(line) && line !== "-"))
    .map((line, index) => `  <li><span class="n">${String(index + 1).padStart(2, "0")}</span>${inline(line.replace(BULLET, ""))}</li>`);

  return `<ol class="goals">\n${items.join("\n")}\n</ol>`;
}
