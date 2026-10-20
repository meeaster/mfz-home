// A short aside with an icon and a heading, such as "What would settle it". The body is Markdown: a paragraph, or a
// lead-in and a bullet per case.
//
//   ::: callout title="What would settle it" icon=git-branch
//   [Security accepts legacy hosting](#Q41): …
//   :::

export default async function callout({ props, body, esc, icon, markdown }) {
  const mark = icon(props.icon ?? "git-branch", ' width="16" height="16" style="flex:none;margin-top:2px;color:var(--muted-foreground)"');

  return `<div class="callout">\n  ${mark}\n  <div><h4>${esc(props.title ?? "")}</h4>${await markdown(body)}</div>\n</div>`;
}
