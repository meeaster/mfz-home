// One line for what the design deliberately leaves out, when a reader might assume it's included. With
// no text of its own it shows the "Not in scope:" line of design.md's Goals section.
//
//   ::: scope-note
//   What the firewalls log, and the dashboards and alerts built on the logs.
//   :::

export default function scopeNote({ body, model, inline }) {
  const fromGoals = (model.prose?.goals ?? "")
    .split("\n")
    .find((line) => /^not in scope:/i.test(line.trim()));

  const text = body.trim() === "" ? (fromGoals ?? "").trim().replace(/^not in scope:\s*/i, "") : body.split("\n").join(" ");

  return `<p class="scope-note"><b>Not part of this design:</b> ${inline(text)}</p>`;
}
