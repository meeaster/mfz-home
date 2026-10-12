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

## Decisions

- **Explicit invocation only** (human, 2026-09-23); OpenCode doesn't advertise it, and the slash entry stays available.
- **No worked example bundled** (human, 2026-09-23). The human liked the PR experiment but excluded it; an annotated reference and the article URL are enough, and fetching the site isn't a routine step.
- **Transferable reasoning, not verbal tics.** Refreshes must not add obligatory profanity, ornate vocabulary, fixed headings, or a mandatory sequence of failed designs.
- **HTML presentation as an optional reference** (human, 2026-09-23), after the human saw the article's diagrams and animations; its accessibility and reduced-motion rules are local choices, not observations of the source.
- **Shiki for highlighting, rendered at build time** (human, 2026-09-23). The human wanted a maintained, widely used library rather than hand-coloring, briefly considered Prism, and settled on Shiki. Existing project highlighters remain fine.
- **A GitHub-style card for the central PR, once** (human, 2026-09-23). Easier to read than a bare number; accuracy matters more than a filled-in mockup.
- **Static output** (human, 2026-09-23). These artifacts are often hosted from GitHub Actions; browser-side animation is fine, a runtime service is not.

## Sources

| Source | Revision | Local use |
|---|---|---|
| [OpenCode Reloaded](https://anoma.ly/notes/opencode-reloaded) | read 2026-09-23, unpinned | `references/explanation-style.md` keeps short attributed excerpts and analysis, excluding the postscript and interactive UI text; `references/html-presentation.md` draws on the rendered page's layouts and animations |
| [Shiki](https://shiki.style/guide/install) | read 2026-09-23, no pinned version | Generation-time highlighting; verify the current API when implementing |
