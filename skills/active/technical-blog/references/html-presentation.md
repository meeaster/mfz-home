# HTML presentation

Keep the article's reading flow central. Use the following guidance for HTML articles and interactive artifacts; these components are not a mandatory Markdown format.

## Static delivery

- Produce static HTML suitable for packaging in GitHub Actions and serving from a static host such as GitHub Pages. The delivered artifact must not require server-side rendering, a running application server, or authenticated runtime API calls.
- Prefer a self-contained HTML file for standalone artifacts, with styles, interaction scripts, and essential assets embedded. When separate assets are appropriate, package them alongside the HTML and use relative URLs that work under a repository subpath. Avoid required CDN downloads at viewing time.
- Fetch source metadata and generate highlighted code before delivery. Client-side JavaScript may animate diagrams or operate controls using data already included in the artifact. Static hosting does not require a motionless page.
- Keep article text, PR metadata, and code readable without JavaScript. Ship a meaningful static state for interactive diagrams.

## Diagrams and explanatory animation

- Choose a diagram for relationships and animation for changes whose order matters. Before implementing a scene, identify its explanatory question, initial state, triggering event, visible changes, and final consequence.
- Put the scene beside the paragraphs that motivate and interpret it. Reuse the same entities, labels, and layout across the failure and solution so readers can compare behavior without learning a new diagram.
- Make motion show causality: emphasize the active operation, carry its effect along a connector when useful, and update the receiving state. Keep the rest stable. Highlight an incorrect value or state where the explanation identifies the bug.
- Use shared numbered markers when prose, code, and diagram stages refer to the same operations. Show enough intermediate state to understand the result rather than animating directly between unexplained endpoints.
- Give timed demonstrations play, pause, and replay controls. Make important stages directly inspectable when readers need to compare them. Preserve a readable static or reduced-motion explanation and keyboard access to controls.
- Keep decorative effects optional and sparse. Match simulated behavior to the mechanism described, and identify illustrative values. Animation should not imply measured performance or real execution when it is a teaching model.

The inspiration is [OpenCode Reloaded](https://anoma.ly/notes/opencode-reloaded/): repeated plugin-and-catalog layouts, visible state changes, and local annotations tie the demonstrations to the argument. The site's exact palette, title effects, and implementation are not required.

## Language-aware code highlighting

- Render code with an established syntax-highlighting library. Reuse the project's highlighter when suitable; otherwise prefer [Shiki](https://shiki.style/guide/install) for generated static HTML. Do not hand-tokenize code with regular expressions or manually assign colors to token spans.
- Set the language explicitly from the source file, code fence, or snippet's actual syntax. Treat terminal output and unknown syntax as plain text instead of guessing a misleading language.
- Use Shiki during artifact generation to embed highlighted HTML, including token spans and their inline color styles, directly in the page. The delivered page needs no Shiki runtime. Include any supporting styles needed for themes and layout. Check current library documentation before implementation and follow the destination's dependency-version policy.
- Preserve the exact code text and escape it through the renderer. Use semantic `pre` and `code` elements, a theme legible against the article background, and horizontal scrolling for long lines. Where a page supports light and dark modes, verify the code in both.
- A compact language or filename label can orient readers. Add line emphasis or matching prose markers only when they help explain the snippet; syntax color alone does not identify the important operation.

## Inline GitHub PR card

For a PR-based HTML article, render the primary PR as a compact GitHub-style card once near its introduction. For several central PRs, give each one a card where introduced; incidental references and later mentions use ordinary links. A number alone is insufficient orientation for the primary source.

- Fetch the PR's actual metadata from GitHub through the available CLI or API. Include its title, owner/repository, PR number, author handle, state, changed-file count, and head and base branch names. Label branch direction explicitly, such as `feature-name → main` with head/base labels where needed. Add additions/deletions when useful and available.
- Make the title the primary link to the canonical PR URL. Use GitHub's recognizable visual language: a bordered rounded container, PR or merge icon, labeled status badge, muted repository and author details, monospaced branch chips, and a compact change summary. Use established icons or an icon library where available rather than approximating the GitHub logo.
- Keep it an inline source preview at article scale. Let long titles and branch names wrap; keep the metadata hierarchy clear on narrow screens. State must be conveyed in text as well as color.
- Render fetched metadata into the artifact rather than requiring the reader's browser to authenticate or call GitHub. If metadata cannot be retrieved, use verified supplied fields and indicate that the preview is incomplete, retaining the source link. Never invent an author, branch, status, or change count to complete the design.
- When the article explains a historical revision, distinguish that revision from a card's current PR metadata. The card or source note should make clear that the metadata is a snapshot, not a live status widget.

## Browser verification

Inspect the finished HTML in a browser at a reading-width desktop viewport and a narrow viewport. Check code highlighting against the declared languages and confirm that copying or reading the code preserves its text. Verify the PR card's metadata, canonical link, wrapping, and status label.

Serve the final output directory with a plain static server rather than relying only on a development server. Verify packaged assets and links under the intended base path, and confirm that rendering does not depend on external APIs or CDN requests. Check that the article, code, source card, and static diagram states remain readable with JavaScript disabled.

Play each explanatory scene through its meaningful transitions, inspect the final result, and test pause, replay, stage selection when present, keyboard controls, and reduced motion. Capture representative states to support the handoff. Static screenshots establish appearance; they do not establish that animation controls work.
