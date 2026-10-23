# pele

## Intent

Give agents a dependable way to turn Mermaid text into SVG with Pele, the dependency-free renderer from Obsidian, and the syntax facts they need for diagram types too new to know well.

Not for: diagram design, layout or styling advice, themes, or raster output. The skill states facts about Pele and its output and leaves choices to the agent and user.

Success: an agent asked to render Mermaid, including a newer beta type, produces a valid SVG on the first or second try, from any working directory, on any machine with Node 20 or later.

## Scenarios

- **Render a classic diagram** (flowchart, sequence) to an SVG file from source the agent writes or is given.
- **Write and render a newer type** (use case, Wardley, Venn, Ishikawa) that the model's training covers thinly or not at all.
- **Source fails to parse**: the agent reads Pele's line and column error and fixes the source instead of switching tools.
- **The user wants PNG or a recolored diagram**: the agent knows the colors are CSS variables before it picks a converter or edits colors.
- **Adjacent prompt** that shouldn't trigger: editing Mermaid in a Markdown file with no rendering involved, or designing a branded diagram from scratch.

## Decisions

- **Self-contained and portable, with no guidance on how to use the diagrams** (human, 2026-10-22). The skill should work anywhere without installs and should not impose taste. So there's no bundled theme, no layout advice, and no PNG path, since a browser dependency breaks self-containment. Output facts that decide whether a result is correct (CSS variable colors, Arial-based measurement) stay because an agent can't recover them from the SVG alone.
- **Vendor `dist/pele.js` instead of depending on an install** (human, 2026-10-22). Pele ships no command, and resolving a global install is machine-specific. Its single ES module build has no dependencies.
- **References for every type, not only the newer ones** (2026-10-22). Which types a model knows well varies by model and can't be judged reliably in advance. Disclosed references cost nothing until read. Each file holds Mermaid's own documentation examples, filtered to those that render with the vendored build, so they are upstream facts and never show syntax that fails. Tested on Sonnet (2026-10-23, one run each): with references, a use case diagram was correct on the first try; without them, Sonnet spent 14 turns grepping the minified build and wrote a labelled association instead of an include. Wardley maps came out the same either way, since Sonnet already knows that syntax.
- **The script mirrors Pele's own options** (maxWidth, fontFamily, fontSize, padding) and adds nothing Pele lacks, keeping it a thin front end rather than a renderer with its own policy.

## Sources

| Source | Revision | Local use |
|---|---|---|
| npm `pele` | 1.7.0, `sha512-nkYb5VnxsTgwD4NThF6j4pJEC4AhGLJ9ptiL4q/vIzGr9q6ZtoRE3hFr94LgHpZ/xy56d1pw42UAQGaZkjM5XA==` | `dist/pele.js` and `LICENSE` copied unchanged to `vendor/pele/` |
| github.com/obsidianmd/pele | tag `1.7.0`, `8603bf3313add9143cd417015d4a6bd6c522dada` | `tests/corpus/<type>-docs.json` rendered with the vendored build; passing examples written to `references/<type>.md` |

1.7.0 was the newest 1.x past the repository's three-day minimum release age when vendored. To refresh, pick the newest 1.x that meets that age, replace both vendored files from its npm tarball, regenerate the references from the matching tag's corpus the same way, and update the type table in `SKILL.md` if types were added or renamed.
