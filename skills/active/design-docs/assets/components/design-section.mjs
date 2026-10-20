// A prose section of design.md (problem, goals, how-it-works), shown where a page asks for it, so the
// words an agent reads in design.md are the words people read in the doc. A fence that names its language
// is a snippet and shows; a bare fence is a text diagram for agents, and the page draws its own picture.
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
  let fence = null;

  for (const line of text.split("\n")) {
    const opening = fence === null && line.trim().startsWith("```");

    if (opening) {
      fence = line.trim().slice(3).trim() === "" ? "diagram" : "snippet";
    } else if (fence !== null && line.trim().startsWith("```")) {
      if (fence === "snippet") lines.push(line);

      fence = null;

      continue;
    }

    if (fence !== "diagram") lines.push(line);
  }

  return `<div class="prose">\n${await markdown(lines.join("\n").trim())}\n</div>`;
}
