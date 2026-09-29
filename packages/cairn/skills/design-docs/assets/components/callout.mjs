// A short aside with an icon and a heading, such as "What would settle it".
//
//   ::: callout title="What would settle it" icon=git-branch
//   If Q1 and Q4 both come back yes, ...
//   :::

export default function callout({ props, body, esc, icon, inline }) {
  const mark = icon(props.icon ?? "git-branch", ' width="16" height="16" style="flex:none;margin-top:2px;color:var(--muted-foreground)"');

  return `<div class="callout">\n  ${mark}\n  <div><h4>${esc(props.title ?? "")}</h4><p>${inline(body.split("\n").join(" "))}</p></div>\n</div>`;
}
