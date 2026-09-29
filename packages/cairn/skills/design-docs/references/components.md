# Pages and components

A page is a Markdown file that says what it holds; the skill renders its structure. Headers, rails, section numbers, record tables, option cards, decision maps, cost bars and flow tables all come from the skill and the records, so a change to the skill reaches every doc on its next build. What a page writes itself is its prose and whatever is particular to this design: its pictures, and any section that makes more sense built for this problem than reused. Those are the doc's own components, in its `components/` folder.

The skill's components exist for what repeats across designs, not as the shape every design must take. Start from what this part of the design needs a reader to see; use a skill component when it shows that, and build one when it doesn't.

`assets/example/` shows every part in use.

## Page files

`pages/<id>.md`, pulled into `doc.html` with `<!-- include pages/<id>.md -->` in reading order.

```markdown
---
title: Where the workers run
heading: Where should the log pipeline workers run?
group: brief
meta: D1 D2
updated: 2026-09-28
---

The dek: one sentence, the page's answer or where it stands (D1 becomes a link).

## In short

Three short paragraphs.

## D1

Framing: what's being chosen and what stays the same.

::: options D1 A=d1-a B=d1-b
:::
```

**Front matter**

| Key | Holds |
| --- | --- |
| `title` | The page's name in the page list and top bar |
| `heading` | The h1, when it differs from the title (a brief's question, the overview's "what we're building") |
| `group` | `overview`, `area`, `brief` or `shared` |
| `icon` | A symbol from `doc.html`'s definitions, without `i-` (`database`) |
| `prefix` | What section ids start with (`s3` gives `s3-design`); the page id when left out |
| `meta` | A short note in the page list; on a brief, the decisions it covers (`D1 D2`), which also picks the open questions it shows and fills its rail: those decisions and the ones waiting on them, the meetings that touched them or their questions, and which questions block which decision |
| `updated` | `YYYY-MM-DD` |
| `context` | The context line on the doc's home page (the overview, or the brief of a brief-only doc): the effort's slug, after the value of its `initiative:` tag and a `/` when it has one (`observability-pipeline / opw-deployment`). Without it, the home page shows only its date and other pages link home. |
| `rail` | `none` drops the rail's record groups: an overview's or area's open decisions, or a brief's decisions, meetings and blocking questions |
| `rail-note` | A note in the rail: `Requirements: This brief is measured against the overview's R1 to R7.` |
| `shows` | On a shared page, `evidence` or `meetings`: the page is that list |
| `progress` | `none` leaves out the progress line an overview or area gets |

**Sections** are `##` headings, numbered in order and listed in the rail.

- A standard heading gets its id and, for a record section, its table: "Requirements", "How it measures up", "Cost", "Risks", "Phases", "Decisions" and "Open questions" render from design.md when they hold nothing but prose, and that prose is the section's intro. "In short" puts its paragraphs beside the page's terms. "What we're after", "How it fits together", "The whole system", "Design" and "Decision map" get their ids. The ids are the page's prefix and a short name: In short `short`, What we're after `after`, Requirements `requirements`, How it fits together and Decision map `map`, The whole system `system`, Design `design`, How it measures up `measure`, Cost `cost`, Risks `risks`, Phases `phases`, Decisions `decisions`, Open questions `questions` (so `#overview-system`).
- `## D1` is a decision's section: its title and marker, its relations (from Follows and Waiting on), and its reasoning once it has a Why come from the record. The paragraphs under the heading are the framing.
- Any other heading is a section of the page's own; `{#id}` after a heading sets its id.
- Opening prose followed by something else (a component, a table) becomes the section's intro; a section of prose alone stays prose.

**Inside a section**

- Paragraphs and `- ` lists. IDs become mentions; `[text](#id)` links; `**bold**`, `*italic*`, `` `code` ``; inline HTML passes through.
- `### Title {#id}` and an optional line under it: a subhead. With an id it's a sub-link in the rail; `{#id rail=Cost}` gives it a shorter name there.
- A pipe table becomes a `.table`.
- `::: name key=value` … `:::` renders a component, with the lines between as its body. `<!-- component name key=value -->` does the same in one line, and works in HTML too.
- `<!-- records <kind> -->` places a record table where a section wants it rather than at its end.
- A block that starts with `<` is raw HTML, up to the next blank line. Keep blank lines out of it.
- Other `<!-- comments -->` are notes for whoever writes the page, and are dropped.

## The skill's components

| Component | Renders |
| --- | --- |
| `design-card title="…" diagram=<c> [security=<c>] [parts=false]` | The design on an overview or area page: title, the body as its summary, the diagram, and the page's parts table. `security` adds the Architecture / Security switch. |
| `options D1 A=<c> A-security=<c> [layout=row]` | A decision's option cards from its `####` records, each with its diagram component, status, and the set-aside lines after them. `layout=row` puts smaller options side by side. |
| `comparison D1` | Requirements against options, from each option's `Meets R1` fields; identical cells merge. |
| `cost-options D1` | A bar per option splitting the shared part from the difference, then the cost lines grouped into "differs" (those that `Vary with` the decision) and "same". It counts the lines on the pages the decision reaches (its Page and Applies to, and the overview's own); a decision with neither counts every line. While every line is unknown, leave it out; the Cost section already says what isn't known. |
| `decision-map [D1 D2]` | The page's decisions, the ones they follow and the ones waiting on them, in columns by what must be decided first, with each one's open questions under it. |
| `flows <view>` | A security view's data flows table, from the Flows records whose ID starts with the view (`B` for B-F1). |
| `diagram-key items="today \| new: label \| …" [title=…] [design]` | A legend from named entries: `today`, `outside`, `new`, `pending`, `sketch`, `retired`, `area`, `context`, `covered`, `blocking`, `first`, `decision`, `evidence`, `question`, `boundary`, `crosses`, `attention`, `protected`, `transit`. `name: label` changes an entry's words and `name(sample)` its sample, as in `boundary: Our AWS account` or `transit(TLS · IAM)`. Give the flow entries the view's own numbers: `crosses(F1) \| attention(F2) \| protected(F3)`. |
| `goals` | The body's lines as the numbered goals; with an empty body, the bullets of design.md's Goals. |
| `scope-note` | "Not part of this design:" and the body; with an empty body, the `Not in scope:` line of design.md's Goals. |
| `design-section section=<problem\|goals\|how-it-works>` | That prose section of design.md, with its fenced diagrams in text left out. |
| `callout title="…" icon=<symbol>` | An aside with an icon, such as "What would settle it". |
| `requirements`, `measure`, `decisions`, `risks`, `phases`, `cost`, `questions`, `parts`, `terms`, `evidence`, `meetings`, `progress`, `reasoning` | The record tables, the same as `<!-- records … -->`. |

## The doc's own components

A component is a file in the design's `components/` folder. The build looks there first, then in the skill's `assets/components/`, so a doc can replace any skill component for itself, including a record table.

| File | Is |
| --- | --- |
| `<name>.html` | A fragment of HTML, used as it is: a diagram, a picture, a section laid out for this problem |
| `<name>.mjs` | A function of the records, for anything that repeats or derives: `export default ({ props, body, model, ...kit }) => html` |
| `<name>.css`, `<name>.js` | Styles and behaviour, inlined into the built doc. Use the colour variables so dark mode keeps working; a script reads the records from `JSON.parse(document.getElementById("doc-model").textContent)`. |

### Reuse or build

- **Build your own** when the part's shape belongs to this design: the "What we're after" picture, the area map, every design and option diagram, and any section a skill component would flatten, such as a migration timeline, a failover matrix, a rollout by phase, or a comparison laid out around what this decision turns on. A whole section can be the design's own; nothing has to fit the standard sections, and a standard record section can be replaced by a component of the same name.
- **Reuse a skill component** when it shows what the reader needs as it is.
- **When a skill component is close but not quite right,** decide whether the difference is about this design or about the component:
  - About this design: build the design's own. Copying the skill's `.mjs` into `components/` under a new name is a fine start.
  - About the component (the change would help other designs too): propose changing the skill's component to the user rather than editing it during design work, since every doc re-renders with it. Once they agree, change it in the skill and rebuild the example to check the other designs still read right.
- **Promote** a design's own component to the skill when the same need turns up in a second or third design.

Components read the records as they are; they don't bring a schema of their own. When something doesn't fit the records, that's a field the skill's records are missing.

### Bindings

Anything a component or page draws that depends on a record says which, and the build gives it that record's state, so a status change in design.md redraws it without anyone editing the drawing.

| Attribute | Does |
| --- | --- |
| `data-pending="D1 D2"` | Dashed (`pending`) while any of them is unsettled; solid once all are decided |
| `data-when="D1=B"` | Shown only while the condition holds. `D1=B`: B is chosen, or leaned towards while undecided. `D6:decided`, `Q3:answered`, `R4:partly`, `D1:unsettled`. Several conditions must all hold; `!` negates one. |
| `data-text="D1.answer"` | The element's text from a field: `answer`, `title`, `state`, or any field by name. The element must be empty or plain text, on one line. |
| `data-state-of="D6"` | Adds `state-<state>` (`state-open`, `state-partly`, …) for the component's own CSS |

`check` fails a binding that names a record, option, state or field that doesn't exist. Decision markers (`ref-d`) take their colour from the decision's status on their own.

### The kit for .mjs components

A component receives the page it's on (`page`, `prefix`, `pageDecisions`), its `props` (key=value pairs, and bare words in `props.args`), its `body`, the records as `model`, and the kit, already bound to the records:

| Function | Returns |
| --- | --- |
| `inline(text)` | Text with mentions, links and emphasis, as pages write it |
| `markdown(text)` | Flow content, as a section's body (async) |
| `component(name, props)` | Another component (async) |
| `ref("D1")`, `marks(["E1", "Q2"])` | Marker chips |
| `status("D1")` | A decision's status pill |
| `verdict("partly", html)` | A verdict |
| `table(head, rows)` | A `.table`, from cells or row HTML |
| `field(record, "Short")` | A field by name, ignoring case |
| `letter(option)`, `optionColour(option)`, `optionPill(option)` | An option's chip, colour class and status pill |
| `cite("E1: what it shows")` | `{ id, text }` for a cited record |
| `icon(name)`, `pageLink(href, label)`, `money(n)`, `shortDate(iso)`, `esc(text)` | Small pieces |
| `error(message)` | Reports a problem; `check` shows it |

`model.records` maps each E, Q, D and R ID to its `kind`, `title`, `fields`, `state` and `states`, and for a decision its `options` (`id`, `title`, `status`, `statusText`, `fields`), `leaning`, `chosen`, `answer`, `follows` and `unblocks`. `model.costs` and `model.flows` hold those records. The published model leaves out `Recorded from`.

## Markup for components and diagrams

What a component or raw block draws builds from the classes in `assets/doc.css`, using the colour variables (`--foreground`, `--muted`, `--border`, `--opt`, `--new`, `--ok`, `--warn`, `--lean` and so on) for anything new. Copy markup from `assets/example/components/`.

**Statuses, badges and markers**

| Markup | Use |
| --- | --- |
| `<span class="status open">Open</span>` | Amber: open, medium risk. `leaning` teal, `decided` green, plain for later, given and unknown. |
| `<span class="badge">Must</span>` / `<span class="badge outline">Should</span>` | Requirement priority |
| `<span class="tag">D1</span>` | A mono tag |
| `<span class="letter">A</span>` inside `.opt-a` | An option's letter in its colour; `letter sm` in tables, `letter sm plain` for set-aside options, `numeral` for numbered options |
| `<a class="ref ref-e" href="#E2">E2</a>` | A marker that opens the record's card: `ref-q`, `ref-d`, `ref-r` for the others. Wrap several on one box in `<span class="pins" style="--x:…;--y:…">`. |
| `<a class="mention" href="#Q2">Q2</a>` | The same inside a sentence |
| `<a class="page-link" href="#s3-archive"><svg>…</svg>Page · S3 archive</a>` | A link to another page |
| `<span class="verdict yes\|partly\|no">Reason.</span>` | A verdict |

`opt-a` to `opt-d` on a container colours its contents with that option's colour (`--opt`), everywhere in a brief. `design` on an overview's or area's card and key uses the `--new` colour instead.

**Icons:** add a `<symbol id="i-name">` to `doc.html`'s definitions with Lucide path data (24×24 viewBox, `stroke="currentColor"`, `fill="none"`), and use it as `<svg><use href="#i-name"/></svg>`.

**Tables:** `.table-wrap` > `table.table`. Cells: `id`, `soft`, `q`, `date`, `num`, `who`, `status-cell`; `.sub` for a second line and `.marks` for markers. Rows: `group` (a label across the columns) and `total`.

**What we're after:** `.story` holding two `.story-row`s, each a `.story-head` (an `.eyebrow` and a `strong` sentence) and a `.diagram-wrap` with a diagram. Inside it, besides `.node`s: `path.band` in the `.edges` SVG for a flow drawn by its volume, `.band.noise` over it for what's wasted, `.band.clean` for what's kept, `path.band-head` for its arrowhead, `path.lane.a|b|c` for streams kept apart, `path.stub` for a line that stops, `.wall` where it's blocked, `.node.hub` for the design as one pill, `.node.faded` for something missing today, `.node.met` for an outcome the design delivers, and `.goal` for a goal's number. See [diagrams](diagrams.md).

**How it fits together:** a `.option.design` holding a diagram of `.area-node`s (`--x`, `--y`, `--w`, `--h`), each with `<span class="head"><svg>…</svg>Area</span>`, a `p` saying what it covers, and `<a href="#area">Open<svg>…</svg></a>`, plus plain `.node`s for what's outside the design, and a key with `area` and `outside`.

**Security views:** the security component holds the view's `.diagram-wrap`, a `.security-key-wrap` with its key, and `.security-tables` with `<!-- component flows B -->` and a "Where data rests" table. See [security](security.md).

**Decision modal:** a decision row (`tr.opens` with `data-detail`) opens the decision's `.decision-detail` in a `dialog.decision-modal`; the build writes the details after the overview's decisions table.

**Cards:** anything with `id` and `data-ref` is a definition the reference cards are built from. The build writes every record's definition; only a doc's own component that defines something new needs the attributes: `data-ref-text` on the main text, `data-ref-status`, `data-ref-detail="Label"` (list items become lines), `data-ref-value`, `data-ref-tags`, and `data-ref-link="Label"` on a link to where it's worked out.
