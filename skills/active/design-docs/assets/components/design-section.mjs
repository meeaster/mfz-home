// A prose section of design.md (problem, direction, goals, how-it-works), shown where a page asks for it, so the
// words an agent reads in design.md are the words people read in the doc. A fence in a language the doc colours is a
// snippet and shows; any other fence (bare, text, ascii) is a text diagram for agents, and the page draws its own.

import { SNIPPET_LANGUAGES } from "../../scripts/snippets.mjs";
//
//   ::: design-section section=how-it-works
//   :::

export default async function designSection({ props, model, markdown, error }) {
  const text = model.prose?.[props.section];

  if (text === undefined) {
    error(`design-section: design.md has no '${props.section}' section (problem, direction, goals or how-it-works)`);

    return "";
  }

  const lines = [];
  let fence = null;

  for (const line of text.split("\n")) {
    const opening = fence === null && line.trim().startsWith("```");

    if (opening) {
      fence = SNIPPET_LANGUAGES.includes(line.trim().slice(3).trim().toLowerCase()) ? "snippet" : "diagram";
    } else if (fence !== null && line.trim().startsWith("```")) {
      if (fence === "snippet") lines.push(line);

      fence = null;

      continue;
    }

    if (fence !== "diagram") lines.push(line);
  }

  const body = await markdown(lines.join("\n").trim());

  // The working direction is set apart: everything else on the page works within it.
  return props.section === "direction" ? `<div class="direction">\n${body}\n</div>` : `<div class="prose">\n${body}\n</div>`;
}
