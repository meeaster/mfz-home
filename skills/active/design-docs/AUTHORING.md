# design-docs

## Intent

Help a team reach and keep a concrete design for something that will be built or changed: take a large question (where to host new infrastructure, how to ship logs out of GovCloud), break it into decisions, questions, requirements, and evidence, carry it through meetings and emails, and publish a self-contained HTML design doc that a manager or a security reviewer can read on a shared screen. The records are the source of truth; the doc is built from them.

Not for: implementation plans or task lists, ADR-style records of decisions already made, general documentation, or publishing without a request.

Success: a new design looks and behaves like the bundled example without copying it; every diagram element cites evidence or an open question; meeting outcomes land exactly as agreed, with nothing stale left elsewhere in the doc; the build is one static file with no local paths.

## Scenarios

- **New design from a request and knowledge articles**: overview, areas where parts have their own records, briefs for decisions to weigh in a meeting.
- **After a meeting or an email thread**: proposes changes for the human to settle by number, applies what was accepted, then checks every page that mentions a changed ID or fact.
- **Hand the doc to a security team** (GovCloud, FIPS, CUI): each option has a security view with the compliance boundary, numbered flows, and where data rests.
- **Research open questions**: checks the knowledge base first, records evidence and answers directly, and considers what belongs in a knowledge article.
- **"What should we decide?"**: writes an AI recommendation labeled with the model that made it.
- **Fresh session picking up an existing design**: finds it through the effort's link, or the folder the user names, and reads what the task needs.
- **Folder in an older format**: `check` refuses it and `migrate` converts it.
- **"Write the implementation plan"** or "make a task list": not this skill.

## Decisions

- **Records hold the facts; the agent writes only what's particular** (human, 2026-09-28 and 2026-09-29). JSON-driven rendering of whole pages was rejected first as too restrictive, because briefs differ too much. Pages then moved to Markdown plus records rendered by shared templates, so old docs regenerate when templates change. Diagrams stay free-form with no layout DSL, and any part can be a custom component. Reusable components exist to be reused where they fit, not to force a shape; improve a shared one only when other designs benefit too.
- **Records in JSON** (human, 2026-10-04). The human didn't want the skill telling models how to grep Markdown; give them a format they can read and edit directly. In comparison runs JSON was about as accurate as Markdown and Sonnet edited one record at a time naturally; the gain is structure, not cost. Figures used more than once are defined once as facts, which removed every stale-number failure.
- **Meeting changes are proposals the human settles before anything is applied** (human, 2026-10-05). One proposal per outcome the meeting settled, with an "Also records" line instead of one card per record touched; follow-on consistency fixes are proposed as record keeping; "Worth a look" holds judgment calls and is capped at three. Reaching 6–9 readable cards per meeting took three rounds.
- **A stale-text check runs after applying** (2026-10-05). Once proposals were reviewed before applying, nothing reviewed the finished pages, and hand-written diagram labels and prose went stale. Adding the check took acceptance runs from 27/30 to 30/30, at about $2.10 of Claude plan plus $0.62 of Sol per meeting.
- **Accuracy first when reading** (human, 2026-10-03). Read everything for new designs, decisions, sign-off, and review; read less only for routine updates.
- **One skill with several page types** (human, 2026-09-28), renamed from `decision-brief`: overview, areas, briefs, and shared pages share components, cards, checker, and build, so separate skills would drift. Not every decision needs a brief.
- **A security view on every option** (human, 2026-09-28). The human hands these docs to a security team for GovCloud, FIPS, and CUI work.
- **Decisions carry Why, reasoning, Revisit if, and what else was considered** (human, 2026-09-29); decisions and questions carry an Explanation for readers who don't know why the item exists. Long detail opens in modals, not table rows.
- **Research needs no approval round** (human, 2026-10-06); it only gathers evidence. It starts by checking the knowledge base so research isn't repeated.
- **AI recommendations stand out and name the model** (human, 2026-10-06), shortly ("Opus", not a provider string), because recommendations differ by model.
- **The design owns the plan** (human, 2026-10-06). It isn't one-to-one with Jira; an effort only lists the Jira items related to it.
- **Which models do which step is orchestration, not skill content** (2026-10-05). At work, cost matters: Sonnet medium writing with Sol high reviewing matched Opus on accuracy in the comparison rounds. Put that split in agent definitions or session setup.
- **Static single-file output** for GitHub Pages or opening from disk; private links never reach the published file.
- **Scripts are Node only** (human, 2026-10-19). `doc.mjs`, `records.mjs` and the migrations were ported from Python and checked against it: every check, build, `--pages` build and migration produced the same output on the example, the template, two real designs, four older formats and six deliberately broken copies. The differences left are the parser's wording for invalid JSON and the embedded model's number format (`36` for `36.0`). The renderer is imported directly instead of run as a child process.
- **Works without Cairn, and cites the knowledge base only as provenance** (human, 2026-10-19). The skill moved out of Cairn's package so the team can use it alone. A design copies each claim it rests on, with when the article said it was observed, because articles keep changing and the published doc reaches readers without the knowledge base; the article's path is a `Knowledge base:` source that `check` resolves against a `knowledge/` folder beside the designs.

## Sources

| Source | Revision | Local use |
|---|---|---|
| shadcn neutral theme | unpinned | Basis of `assets/doc.css` (light and dark) |
| The Cairn Pencil mock, Design docs board | kept in step with the renderer | Every format change was mocked there first; the repository's `AGENTS.md` requires the mock, format, example, template, renderer, and Cairn UI to change together |
