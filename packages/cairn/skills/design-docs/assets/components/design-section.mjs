// A prose section of design.md (problem, goals, how-it-works), shown where a page asks for it, so the
// words an agent reads in design.md are the words people read in the doc. Diagrams in text are for
// agents; the page draws its own picture, so fenced blocks are left out.
//
//   ::: design-section section=how-it-works
//   :::

export default async function designSection({ props, model, markdown, error }) {
  const text = model.prose?.[props.section];

  if (text === undefined) {
    error(`design-section: design.md has no '${props.section}' section (problem, goals or how-it-works)`);

    return "";
  }

  const lines = [];
  let fenced = false;

  for (const line of text.split("\n")) {
    if (line.trim().startsWith("```")) {
      fenced = !fenced;
    } else if (!fenced) {
      lines.push(line);
    }
  }

  return `<div class="prose">\n${await markdown(lines.join("\n").trim())}\n</div>`;
}
