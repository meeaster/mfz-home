// One line for what the design deliberately leaves out, when a reader might assume it's included.
//
//   ::: scope-note
//   What the firewalls log, and the dashboards and alerts built on the logs.
//   :::

export default function scopeNote({ body, inline }) {
  return `<p class="scope-note"><b>Not part of this design:</b> ${inline(body.split("\n").join(" "))}</p>`;
}
