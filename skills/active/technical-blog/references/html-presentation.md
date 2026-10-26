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
