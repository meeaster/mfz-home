# HTML presentation

Use this guidance for HTML articles and interactive artifacts. Pair the prose with visuals: a diagram, visualization, code view, or demo wherever an idea has a shape, and short paragraphs and lists between them, so the page reads as a series of small steps.

## Static delivery

- Produce static HTML suitable for packaging in GitHub Actions and serving from a static host such as GitHub Pages. The delivered artifact must not require server-side rendering, a running application server, or authenticated runtime API calls.
- Prefer a self-contained HTML file for standalone artifacts, with styles, interaction scripts, and essential assets embedded. When separate assets are appropriate, package them alongside the HTML and use relative URLs that work under a repository subpath. Avoid required CDN downloads at viewing time.
- Generate diagrams, highlighted code, diffs, and source metadata in a build script, then embed the results. Client-side JavaScript may animate or operate controls using data already in the artifact.
- Keep article text, PR metadata, code, and diagrams readable without JavaScript. Ship a meaningful static state for each interactive figure, and keep script-only controls `hidden` until the script reveals them. Author `display` rules override the `hidden` attribute, so include `[hidden] { display: none !important; }`.

## Page layout

- Open with a background section when the subject sits inside a larger system: an architecture diagram of the parts the explanation touches, brief definitions of unfamiliar terms, and a view of the data or state the change acts on. Then introduce the problem.
- Use the subject's own code to produce example data at build time, such as encoding a real input or rendering a real row, rather than drawing invented values. When one example appears in several forms, link them with shared colors or markers, and add hover and focus tracing when it helps.
- Present measurements as charts or proportion bars with their units and conditions in the caption. Show the headline measurement as one chart in the story, and put supporting tables in a disclosure beneath it.
- A small live demo may run the actual function under discussion in the browser when it is self-contained. Say in the caption that it runs the real code, and identify any stubbed input.
- Give stat tiles, captions, and labels the specific numbers; let the surrounding prose say why they matter.

## Desktop layout

On a phone, everything is one column. On desktop (from about 1100px), the page is one wide content column that the text fills and the components are set into.

### Principles

1. **Text fills the column.** Paragraphs, headings and lists use the full content width. A narrow text column beside wide components looks pinched.
2. **Components are set in and sized to their content.** Code, tables and callouts sit a tab in from the text; a component that doesn't use the width (a repo card, a diagram) doesn't get stretched, because the extra width is just empty space inside its frame.
3. **Components and diagrams are centred.**
4. **Use the width for content, not margins.** When a diagram is narrow and tall, its text goes beside it.

### Rules

- The content column is `min(1040px, 100vw − 352px)` from 1100px: it leaves room for the contents list in the left margin, and changes smoothly so nothing moves when the list appears at 1200px. Prose, headings and lists take its full width.
- Code excerpts and diffs, tables, callouts and disclosures are inset one tab (48px) from the text on each side. A figure whose text below needs the room (the diagram with terms) is inset-wide too, with its diagram centred on the paper.
- A diagram-only figure is as wide as its diagram (never upscaled, never below 1.0 scale on desktop), centred; its caption takes the figure's width rather than setting it.
- A diagram narrower than about half the column puts the text that explains it beside it: the figure at its natural width, the text in the rest, vertically centred (`.beside`: `grid-template-columns: auto minmax(0, 1fr)`). Use it when the text maps onto the diagram, such as numbered steps beside a flow. It stacks below 1100px.
- Repo cards keep a fixed width (about 760px) and are centred. Two or three introduced together sit side by side as vertical cards (see [implementation walkthroughs](implementation-walkthrough.md)).
- From 1200px, a sticky contents list sits in the left margin: the article's sections (and subsections where the article is organised by them), with short labels. It's plain anchor links, so it works without JavaScript; with JavaScript, an IntersectionObserver marks the section in view. Hidden below 1200px.
- Wide and narrow variants of a diagram (one per breakpoint) are separate `.fig` elements; call `window.pen.redraw()` when the media query changes, because the pen skips a hidden figure.
- Check at 1280, 1440 and 1920: every diagram at 1.0 scale, nothing overlapping the contents list, and no horizontal scroll with every disclosure open.

## File pills and the viewer

A file pill names a file in running text and links to it. With `scripts/file-viewer.js` inlined at the end of the page, clicking one opens the file in a dialog instead, with the lines the sentence is about highlighted and scrolled into view.

- Give a pill the lines it means when the sentence points at specific lines: `data-lines="27,29,33-34"`, shown in the pill as `L27, 29, 33–34` in pink. Leave lines off when the sentence is about the file as a whole.
- A pill's `href` is the file's row in the article's file index, so it works without JavaScript; `data-file` names that row. "Full file ↗" links on an excerpt's header do the same, with the excerpt's range as their lines, so the reader sees those lines in the whole file.
- The row carries `data-repo`, `data-path` and `--hue`, and holds the file's code: the whole file if it's new, the diff if it was modified, plus the whole patched file in a `<template class="whole">`. The viewer gives modified files Changes and Whole file tabs, and opens on Whole file when a highlighted line isn't in the diff. The script's header comment has the full markup contract.
- Highlighted lines are pink (they're what the sentence is about). Style the dialog with these rules:

  ```css
  .viewer { width: min(1100px, calc(100vw - 32px)); max-height: calc(100vh - 48px); padding: 0; border: 1px solid var(--border); border-radius: 12px; background: var(--bg); color: var(--fg); display: none; flex-direction: column; overflow: hidden; }
  .viewer[open] { display: flex; } .viewer::backdrop { background: rgb(15 16 22 / .7); } body:has(.viewer[open]) { overflow: hidden; }
  .vh { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; padding: 12px 14px 12px 16px; border-bottom: 1px solid var(--border); background: var(--surface); }
  .vdot { width: 9px; height: 9px; border-radius: 50%; background: var(--hue); } .vt { display: flex; flex-direction: column; flex: 1; min-width: 0; }
  .vrepo { color: var(--muted); font-size: 12px; } .vpath { font: 13px var(--mono); overflow-wrap: anywhere; } .vlines { color: var(--pink); font-weight: 600; }
  .vtabs { display: inline-flex; border: 1px solid var(--border); border-radius: 7px; overflow: hidden; } .vtabs[hidden] { display: none; }
  .vtabs button { color: var(--muted); background: none; border: 0; padding: 5px 11px; } .vtabs [aria-selected="true"] { background: color-mix(in srgb, var(--fg) 10%, transparent); color: var(--fg); }
  .vh form { margin: 0; } .vclose { width: 30px; height: 30px; border: 1px solid var(--border); border-radius: 7px; background: none; } .vclose svg { fill: var(--muted); }
  .vb { overflow: auto; flex: 1; min-height: 0; } .vb .code-head { display: none; } .vb .code-body { position: relative; }
  .vband { position: absolute; left: 0; right: 0; background: color-mix(in srgb, var(--pink) 16%, transparent); box-shadow: inset 3px 0 var(--pink); pointer-events: none; }
  @media (max-width: 640px) { .vh { display: grid; grid-template-columns: auto 1fr auto; } .vh form { grid-column: 3; grid-row: 1; } .vt { grid-column: 2; grid-row: 1; } .vlines, .vtabs { grid-column: 1 / -1; justify-self: start; } }
  ```

- Check every pill: the right file opens, exactly its lines are highlighted and the first is in view, and closing puts the code back in its row.

## Links to sources

Link the vendor or product page a claim rests on, at the claim, so a reader can check it: how a service behaves, a default, a permission, a setting's name. Use the source link component for these; ordinary links stay plain, and file pills stay pills.

- **Check before linking.** Open each page and confirm it says what the linked sentence claims, at the version the article describes; a chart or provider page links the release the change pins (a tag, not `main`). If the page doesn't support the claim, change or flag the claim instead of linking it.
- **Link the words the page supports**, at the first mention: "an API key that has Remote Configuration enabled", not "see the docs". About one link per claim the reader might doubt; a walkthrough needs a handful, not one per paragraph.
- **The component:** the source's mark (Simple Icons, uncoloured, muted), the words with a dotted underline, then ↗; a `title` gives the page's title and site. Without JavaScript it's just a link.

  ```html
  <a class="src" href="…" title="Install the Worker · docs.datadoghq.com"><svg class="mk" viewBox="0 0 24 24" aria-hidden="true">…</svg>API key that has Remote Configuration enabled<span class="ex" aria-hidden="true">↗</span></a>
  ```
  ```css
  a.src { color: var(--fg); text-decoration: underline dotted color-mix(in srgb, var(--cyan) 70%, transparent); text-underline-offset: 3px; text-decoration-thickness: 1.5px; }
  a.src:hover { color: var(--cyan); text-decoration-style: solid; }
  a.src .mk { width: .8em; height: .8em; fill: var(--muted); margin-right: .28em; vertical-align: -.02em; }
  a.src .ex { font-size: .78em; margin-left: 2px; color: var(--muted); }
  ```

## Diagrams

Render Mermaid to SVG at build time with Pele when the `pele` skill is available, and inline the SVG. Otherwise use another build-time renderer that produces static SVG. Read [Diagram system](diagram-system.md) before drawing: it sets the colour system, house style, icons, spacing rules, the post-render fixes, and the overlap check every diagram follows.

- Map Pele's `--pele-*` variables (`--pele-fg`, `--pele-bg`, `--pele-line`, `--pele-surface`, `--pele-accent`, `--pele-series-1` …) to the page's color tokens so diagrams follow light and dark modes.
- Pele measures labels with Arial widths. Set `--pele-font` to Arial or a metric-compatible font; a wider font overflows label boxes and lets edges run through labels.
- Check each SVG's natural width against its display width. Left-to-right flowcharts and side-by-side subgraphs often exceed an article column and shrink labels below legibility on phones. Render a top-to-bottom variant and switch with a media query, or shorten labels. Stack diagrams of different natural widths instead of placing them side by side at different scales.
- Pele nodes and edges carry `data-id` attributes and `pele-node`, `pele-edge`, and `pele-edge-label` classes. Show a before-and-after change by toggling the elements that differ on one diagram, so the layout stays fixed between states.
- Use state diagrams for lifecycle changes, sequence diagrams for message order, and `xychart` for measured comparisons.

## Explanatory animation

- Choose a diagram for relationships and animation for changes whose order matters. Before implementing a scene, identify its explanatory question, initial state, triggering event, visible changes, and final consequence.
- Reuse the same entities, labels, and layout across the failure and the solution. Make motion show causality: emphasize the active operation, carry its effect along a connector when useful, and update the receiving state.
- Give timed demonstrations play, pause, and replay controls, plus step controls when stages need comparison. Ship the final state as the static view, respect reduced motion, and keep controls keyboard-operable.
- Label illustrative models and values. Animation should not imply measured performance or real execution when it is a teaching model.

The inspiration is [OpenCode Reloaded](https://anoma.ly/notes/opencode-reloaded/): repeated plugin-and-catalog layouts, visible state changes, and local annotations tie the demonstrations to the argument. The site's exact palette, title effects, and implementation are not required.

## Code and diffs

Render code with an established library at build time; never hand-tokenize or hand-color code. Set the language explicitly from the source file or snippet, and treat terminal output and unknown syntax as plain text. When the `diffs` and `highlights` skills are available, read them for API detail.

| Content | Library | Embedding |
|---|---|---|
| A change: before-and-after code or a PR's patch | `@pierre/diffs/ssr`: `preloadPatchFile`, `preloadDiffHTML`, `preloadMultiFileDiff` | Wrap each result in `<diffs-container><template shadowrootmode="open">…</template></diffs-container>`. The output carries its own styles and needs no JavaScript. |
| A snippet: example code, a config file, an excerpt | `@pierre/highlights` `codeToHtml`, or the project's existing highlighter | Decode the returned bytes immediately. `themes: { light, dark }` with `defaultColor: 'light-dark()'` follows the page's `color-scheme` without a stylesheet. |

- On the Dracula page, render code with the kit's Dracula: Pierre's `dracula` with comments in the muted colour, italic. Dracula's comment colour `#6272a4` is about 3:1 on its own background, below the 4.5:1 text needs. One theme object serves both libraries:

  ```js
  import { registerCustomTheme } from '@pierre/diffs';
  import { themes } from '@pierre/highlights/themes/loader';

  const { default: dracula } = await themes['dracula']();
  export const draculaKit = { ...dracula, name: 'Dracula (blog kit)',
    style: { ...dracula.style, syntax: { ...dracula.style.syntax, comment: { color: '#a3a8c3', font_style: 'italic' } } } };
  registerCustomTheme('dracula-kit', () => draculaKit, 'zed');
  // Diffs: options: { theme: 'dracula-kit', preferredHighlighter: 'highlights' }. Highlights: codeToHtml(code, { lang, theme: draculaKit }).
  // Pass preferredHighlighter: 'highlights' on every Diffs render in the build: after one Shiki render, the shared
  // highlighter is Shiki and a Highlights-only theme fails to resolve (Diffs 1.6.1).
  ```

- Added lines take about a 10% green tint, so tokens stay readable on them; Diffs' default is 20%. Diffs mixes the override into the background at 20%, so the override is half green. Line numbers use `#8992b7` (4.6:1) in a snippet's gutter and in Diffs, so both read the same.

  ```css
  diffs-container { --diffs-fg-number-override: #8992b7;
    --diffs-bg-addition-override: color-mix(in lab, #50fa7b 50%, #282a36);          /* renders as #303c3d */
    --diffs-bg-addition-number-override: color-mix(in lab, #50fa7b 50%, #282a36); }  /* custom properties reach the shadow root */
  ```

- Each Diffs block embeds about 60 KB of CSS, because shadow roots cannot share styles without JavaScript. Use Diffs where the diff layout explains something and a snippet highlighter elsewhere.
- Hunk separators in Diffs' static output cannot expand. Choose context that shows the relevant lines.
- Different highlighters classify tokens differently. Keep one highlighter for any code that appears in several forms within one figure.
- Reset page-level inline `code` styles inside highlighted blocks, or the page's padding and background apply to every line.
- Preserve the exact code text, use semantic `pre` and `code` elements, and scroll long lines horizontally.

## Inline GitHub PR card

For a PR-based HTML article, render the primary PR as a compact GitHub-style card once near its introduction. For several central PRs, give each one a card where introduced; incidental references and later mentions use ordinary links.

- Fetch the PR's metadata from GitHub through the available CLI or API: title, owner/repository, number, author handle, state, changed-file count, and head and base branch names. Label branch direction explicitly, such as `feature-name → main`. Add additions and deletions when available.
- Make the title the primary link to the canonical PR URL. Use GitHub's recognizable visual language with established icons such as Primer Octicons: a bordered rounded container, PR or merge icon, labeled status badge, muted repository and author details, monospaced branch chips, and a compact change summary. Convey state in text as well as color, and let long titles and branch names wrap.
- Render fetched metadata into the artifact. If metadata cannot be retrieved, use verified supplied fields and show that the preview is incomplete. Never invent an author, branch, status, or change count.
- When the article explains a historical revision, distinguish that revision from the card's current metadata.

## Browser verification

- Serve the final output directory with a plain static server and confirm that nothing depends on external APIs or CDN requests.
- Inspect a reading-width desktop viewport and a phone-width viewport (about 390 px) in light and dark modes. At phone width, confirm diagram labels stay legible and the page has no horizontal scroll.
- Load the page with JavaScript disabled, for example with the Chromium flag `--blink-settings=scriptEnabled=false`. Confirm that the text, code, diffs, diagrams, and static figure states render and that script-only controls stay hidden.
- Operate every interactive figure through its rendered controls, including keyboard input, and check each meaningful state. Static screenshots establish appearance, not working controls.
- Check code highlighting against the declared languages and the PR card's metadata, link, wrapping, and status label.
