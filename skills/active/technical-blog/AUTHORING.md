# technical-blog

## Intent

Write conversational, source-grounded technical posts from a PR, an implementation, or an idea, with the explanatory flow the human liked in "OpenCode Reloaded": concrete motivation, examples that expose constraints, abstractions named only after they're motivated, varied rhythm, occasional humor. Also used for blog-style PR explanations, and optionally as a richer static HTML article with diagrams and animation.

Not for: imitating the source's verbal habits literally, inventing a development history, or publishing without authority.

Success: accurate claims the sources support, a small running example that explains the mechanism, and a feel the human judges right; packaging alone doesn't establish that.

## Scenarios

- **Generic PR summary** without naming the skill: not selected. Explicit request: loads.
- **Small PR whose summary overstates a guarantee**: inspects beyond the diff, gives a bounded example, narrows the claim, and doesn't claim tests ran from reading test code.
- **Architectural explanation**: a running example motivates the mechanism before naming it and revisits the failure; still accurate with the jokes removed.
- **Small implementation with no history of earlier attempts**: explains directly or uses a clearly hypothetical counterexample; no invented first-person story.
- **HTML post with TypeScript, YAML, and terminal output**: library highlighting with explicit languages, escaped text, contained overflow; a Markdown request gets fenced code only.
- **Post built around one GitHub PR**: one GitHub-style card with verified metadata, then ordinary links; a visibly incomplete card when metadata is unavailable.
- **Animated explanation of an overwrite bug**: a stable example with inspectable states; reduced motion and keyboard checked separately.
- **Built in GitHub Actions and served from a subpath**: fully static output that stays readable without JavaScript.
- **Walkthrough of draft changes across three repos from an implementation handoff**: organized by what the system needs, with a consistent per-repo color, a seams table, first-run guidance, the blocking risk ahead of the code, and handoff claims checked against the repos.
- **Architecture and sequence diagrams for an AWS and Datadog change**: neutral boxes with inverted brand icons, group loops in cyan then purple, one pink focal element, handwritten lowercase outside labels on dot paper, and a clean overlap check; not tinted boxes, coloured icons, or a focal colour reused for a group.
- **PR that changes one function deep in a pipeline**: opens with an architecture diagram and the data the function handles before the problem; diagrams appear where an idea has a shape, and the prose stays in short paragraphs broken up by lists and visuals.

## Decisions

- **Explicit invocation only** (human, 2026-09-23); OpenCode doesn't advertise it, and the slash entry stays available.
- **No worked example bundled** (human, 2026-09-23). The human liked the PR experiment but excluded it; an annotated reference and the article URL are enough, and fetching the site isn't a routine step.
- **Transferable reasoning, not verbal tics.** Refreshes must not add obligatory profanity, ornate vocabulary, fixed headings, or a mandatory sequence of failed designs.
- **HTML presentation as an optional reference** (human, 2026-09-23), after the human saw the article's diagrams and animations; its accessibility and reduced-motion rules are local choices, not observations of the source.
- **Readable prose, visuals where they help, prerequisites up front** (human, 2026-10-23). After a worked example on a Pierre PR, the human asked for more explanation through diagrams and visualizations, and for prerequisite knowledge such as an architecture diagram before the story. They then clarified that prose is fine where an explanation needs it: the goal is short paragraphs broken up with new paragraphs, bullets, and diagrams, so long passages don't feel daunting. Word, sentence, and paragraph-length limits were declined because they could push models to drop information the reader needs.
- **Pierre Diffs for diffs, Highlights for snippets, Pele for diagrams** (human, 2026-10-23). Replaces the 2026-09-23 Shiki-only decision. The worked example confirmed Diffs' SSR output renders without JavaScript inside a declarative shadow root and that Highlights' `light-dark()` output needs no stylesheet. Shiki and existing project highlighters remain acceptable for snippets.
- **Main path as a story; side material aside** (human, 2026-10-23). In two comparison rounds the human preferred Sonnet's articles but they lost the thread with mid-story reproductions, runtime quirks, stacked benchmark tables, and full file listings. Those now go in asides or disclosures rather than being cut.
- **Risk first, an exit point, and multi-repo walkthroughs** (human, 2026-10-23). Sonnet 5.5 at high effort wrote an implementation walkthrough from an Opus handoff; the human approved adopting what worked. Its need-by-need structure, repository color-coding, seams table, and first-run table taught the changes well, and it caught an error by checking the handoff against the repos. It also ran long and placed a plan-breaking risk late. Those devices live in `references/implementation-walkthrough.md` because only multi-repo walkthroughs need them.
- **Layout pitfalls from the worked example.** Pele label overflow with non-Arial fonts, wide diagrams shrinking on phones, page `code` styles leaking into highlighted blocks, and `display` rules overriding `hidden` each produced a visible defect before the reference named it.
- **A diagram system, decided visually with the human** (human, 2026-10-23). Built in OpenPencil and live renders over many rounds; the full record of options and verdicts, the design file, the lab and the diagram SVGs are kept outside the skill in mfz-home `design/blog-kit/`, which is the source for `references/diagram-system.md` and `scripts/`. Choices whose reasons aren't visible in `references/diagram-system.md`:
  - Dracula theme, with the colour system as a separate primitive: the human wanted every colour to be intentional after item colour matching group colour felt strange.
  - Rejected styles: blueprint (no personality), borderless pastel boxes (muddy on dark), washi tape and zine (too quirky for work), shadows of any kind (disliked), a yellow highlighter focal (too quirky), dotted group outlines (lost against the grid), washes inside loose outlines.
  - Icons: coloured icons looked wrong; full-colour logos fought the colour system (GitHub's black vanished, Datadog's purple collided with the purple group); tiles without a box couldn't be highlighted, so the tile always sits in a box.
  - Spacing: the human asked that nothing overlap and that every visual fix be shown to them before and after; the design file documents the result, not the fixes. A fixed top-left group label made one diagram worse, which is why labels go in the widest line-free stretch.
  - Label crowding (2026-10-24): spacing config and direction couldn't move ER labels off the bend Pele puts them on, and couldn't lengthen the short straight middle of the S-curves it draws for two-way state transitions. That's why `labelsOffBends` exists and why the source patterns (vertical timelines and git graphs, two-way transitions in a left-to-right composite) are written down. The composite state's title rule was dropped so groups look the same in every diagram type.
  - Colour (2026-10-24): after a Sonnet run drawn from this guide alone, the human reframed colour as attention spent on what the diagram says, not a property of element types. The old rules ("groups get hues", "one focal element", "status only when literal") gave wrong answers for a meaningful loop, a set that is all the subject, and done tasks in a plan. The guide now gives principles plus explicit rules, because models follow principles loosely; add a rule where a model keeps drifting. The token block was added because the same run fell back on Dracula from memory.
  - Notes and layout (2026-10-24): with identical briefs, Sonnet and Opus both added a handwritten bracket stating a chart's takeaway, and the human wanted notes on every type, so `addNotes` exists (both models' hand-rolled notes hit the same bugs: inherited stroke, the wrong closing tag, clipping). Sonnet's stacked concurrent regions were better than Opus's side-by-side ones, but the human declined a layout rule: the guide covers style, meaning and spacing, and leaves arrangement to the writer.
  - Pen (2026-10-24): after [pele-art-diagrams](https://pele-art-diagrams.vercel.app/), which lets Pele lay out and a simulated pen draw, the human tested a pen on this system over three rounds. Kept: hand-drawn boxes, hatched fills under the text, Kalam for labels between boxes. Rejected: names in Kalam (too rough), labels between boxes in the sans, hatching that stops around the words. The human chose focus-only hatching, keeping every-box hatching as an option (`data-pen="all"`). It runs in the reader's browser because posts must read without JavaScript and follow the page's theme; baked colours would break theming. OpenPencil imported the pen's output as editable vectors.
  - Paper (2026-10-25): the human preferred dots to the 16px grid once the pen was in, and chose 24px after comparing spacings from 12 to 32px. Dots are the default; plain is allowed; the grid is no longer an option.
  - `scripts/` exists so writing models apply the fixes and run the check instead of re-deriving them each time.
- **A GitHub-style card for the central PR, once** (human, 2026-09-23). Easier to read than a bare number; accuracy matters more than a filled-in mockup.
- **Static output** (human, 2026-09-23). These artifacts are often hosted from GitHub Actions; browser-side animation is fine, a runtime service is not.

## Sources

| Source | Revision | Local use |
|---|---|---|
| [OpenCode Reloaded](https://anoma.ly/notes/opencode-reloaded) | read 2026-09-23, unpinned | `references/explanation-style.md` keeps short attributed excerpts and analysis, excluding the postscript and interactive UI text; `references/html-presentation.md` draws on the rendered page's layouts and animations |
| [Shiki](https://shiki.style/guide/install) | read 2026-09-23, no pinned version | Acceptable snippet highlighter; verify the current API when implementing |
| [Simple Icons](https://simpleicons.org) and [Lucide](https://lucide.dev) via Iconify JSON | `@iconify-json/simple-icons` 1.2.100 and `@iconify-json/lucide` 1.2.147, tested 2026-10-23 | Brand and generic diagram icons for `scripts/pele-post.mjs` |
| [pierrecomputer/pierre](https://github.com/pierrecomputer/pierre) | `@pierre/diffs` 1.6.1 and `@pierre/highlights` 0.2.0, tested 2026-10-23 | Diff and snippet rendering guidance; API detail stays in Pierre's `diffs` and `highlights` skills |
