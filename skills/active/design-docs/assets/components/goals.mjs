// The numbered goals under "What we're after", one outcome per line.
//
//   ::: goals
//   - Every firewall log searchable within a minute
//   - Pay only for logs we use
//   :::

export default function goals({ body, inline }) {
  const items = body
    .split("\n")
    .map((line) => line.trim().replace(/^(?:-|\d+\.)\s*/, ""))
    .filter(Boolean)
    .map((goal, index) => `  <li><span class="n">${String(index + 1).padStart(2, "0")}</span>${inline(goal)}</li>`);

  return `<ol class="goals">\n${items.join("\n")}\n</ol>`;
}
