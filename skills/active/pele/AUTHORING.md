# pele

## Intent

Give agents a dependable way to turn Mermaid text into SVG with Pele, the dependency-free renderer from Obsidian, and the syntax facts they need for diagram types too new to know well.

Not for: diagram design, layout or styling advice, or themes. The skill states facts about Pele and its output and leaves choices to the agent and user.

Success: an agent asked to render Mermaid, including a newer beta type, produces a valid SVG on the first or second try, from any working directory, on any machine with Node 20 or later.

## Scenarios

- **Render a classic diagram** (flowchart, sequence) to an SVG file from source the agent writes or is given.
- **Write and render a newer type** (use case, Wardley, Venn, Ishikawa) that the model's training covers thinly or not at all.
- **Source fails to parse**: the agent reads Pele's line and column error and fixes the source instead of switching tools.
- **The user wants a PNG**, or images of the diagrams in a Markdown file, such as for a document or an issue: one command with an `.png` output, no hand-written conversion.
- **A recolored diagram, or a converter the script doesn't run**: the agent knows the colors are CSS variables and uses `--flat` or sets them.
- **Adjacent prompt** that shouldn't trigger: editing Mermaid in a Markdown file with no rendering involved, or designing a branded diagram from scratch.

## Decisions

- **Self-contained and portable, with no layout guidance** (human, 2026-10-22). The skill should work anywhere without installs, so there's no layout advice.
- **Every diagram is Dracula** (human, 2026-11-05; replaces "no bundled theme" from 2026-10-22). The human wants one look for every diagram, in documents, issues and pull requests alike, with no switch. The values follow the technical blog's mapping of its Dracula tokens onto Pele's variables (muted `#a3a8c3` rather than Dracula's `#6272a4`, which is about 3:1 on the background; borders mix it 60% over the background), and are set as the variables' fallbacks, so a page can still restyle an SVG. The theme lives in this skill, not in `technical-blog` or global instructions: it applies wherever Pele renders and costs no context elsewhere.
- **PNG through an installed converter, not a browser** (human, 2026-11-05; revises the 2026-10-22 "no PNG path"). The human wanted images from Markdown made easy. That earlier decision ruled out PNG because a browser dependency breaks self-containment; this path needs none. Rendering stays self-contained, and only PNG needs `rsvg-convert` or ImageMagick, found on PATH and named in the error when missing. Converting by hand failed first: ImageMagick drew every shape black because Pele colors through two layers of CSS custom properties (public ones with fallbacks, internal ones defined from them), so the script resolves both before converting, and `--flat` exposes that for other converters. Output facts that decide whether a result is correct (CSS variable colors, Arial-based measurement) stay because an agent can't recover them from the SVG alone.
- **PNG and `--flat` draw in an Arial-metric font when one is installed** (human, 2026-11-05). Pele's docs say it needs the drawing font to measure labels; outside a browser it measures from an Arial width table, and librsvg's default sans-serif (DejaVu Sans) is wider, so a sequence diagram's note spilled out of its box. Liberation Sans fixed it. A font stack keeps the skill dependency-free; a custom `measurer` for real widths would need a font library.
- **Vendor `dist/pele.js` instead of depending on an install** (human, 2026-10-22). Pele ships no command, and resolving a global install is machine-specific. Its single ES module build has no dependencies.
- **References for every type, not only the newer ones** (2026-10-22). Which types a model knows well varies by model and can't be judged reliably in advance. Disclosed references cost nothing until read. Each file holds Mermaid's own documentation examples, filtered to those that render with the vendored build, so they are upstream facts and never show syntax that fails. Tested on Sonnet (2026-10-23, one run each): with references, a use case diagram was correct on the first try; without them, Sonnet spent 14 turns grepping the minified build and wrote a labelled association instead of an include. Wardley maps came out the same either way, since Sonnet already knows that syntax.
- **The script mirrors Pele's own options** (maxWidth, fontFamily, fontSize, padding) and adds nothing Pele lacks, keeping it a thin front end rather than a renderer with its own policy.

## Sources

| Source | Revision | Local use |
|---|---|---|
| npm `pele` | 1.7.0, `sha512-nkYb5VnxsTgwD4NThF6j4pJEC4AhGLJ9ptiL4q/vIzGr9q6ZtoRE3hFr94LgHpZ/xy56d1pw42UAQGaZkjM5XA==` | `dist/pele.js` and `LICENSE` copied unchanged to `vendor/pele/` |
| github.com/obsidianmd/pele | tag `1.7.0`, `8603bf3313add9143cd417015d4a6bd6c522dada` | `tests/corpus/<type>-docs.json` rendered with the vendored build; passing examples written to `references/<type>.md` |

1.7.0 was the newest 1.x past the repository's three-day minimum release age when vendored. To refresh, pick the newest 1.x that meets that age, replace both vendored files from its npm tarball, regenerate the references from the matching tag's corpus the same way, and update the type table in `SKILL.md` if types were added or renamed.
