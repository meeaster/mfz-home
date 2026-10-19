# Knowledge base authoring record

## Intent

Define a knowledge base that any agent can read and keep from plain files, with no database or service, so the user can share it and the skill with their team. The skill holds the format and the steps every knowledge base shares; each knowledge base's own `AGENTS.md` says what it covers and adds its own rules. Lookups need only that `AGENTS.md`; the skill is for changing the knowledge base.

Not for designs (the `design-docs` skill copies claims from articles and links back as provenance), effort tracking, or deciding anything: articles record what exists.

Success: an agent with only this skill starts a knowledge base, saves a source, records evidence and writes an article that passes `check`; a cheap lookup subagent given only `AGENTS.md` finds the right article from descriptions.

## Scenarios

- A lookup subagent is asked what the knowledge base knows about a subject. It lists descriptions with one search, reads the matching articles and stops, without opening sources or evidence or loading the skill.
- An agent writes up a session's findings. It copies the cited session files in as evidence first, extends an existing article on the subject rather than starting a near-duplicate, and records references with observed dates. Wrong: citing the session folder's path, or naming the article for the investigation.
- A meeting summary and later email replies are saved as sources. Wrong: rewriting an earlier message, or treating a colleague's suggestion as a fact about a system.
- A re-check finds a docs page changed. The agent saves the new look as new evidence and updates the article and its references. Wrong: editing the old evidence file.
- A knowledge base written for a newer format is opened by an older skill: the agent stops and says so rather than writing the old format into it.
- A teammate clones the knowledge base without the skill: `AGENTS.md` still tells them how to find things and the rules that always hold.

## Decisions

- **Files are the only authority** (user, Oct 19). An earlier Cairn design kept descriptions, origins and references in a catalog database; a second copy could disagree with the files and wouldn't travel with them.
- **Core rules in this skill, local rules in each knowledge base's `AGENTS.md`** (user, Oct 19). Putting everything in `AGENTS.md` copies the core into every knowledge base, where it drifts; vendoring the skill into a work knowledge base would also put personal tooling in a company-owned repository.
- **Sources and evidence are separate kinds in separate folders** (user, Oct 19). A source records what happened and never goes stale; evidence observes something that can change. Folder rules are easier for agents to follow than a per-file field.
- **Evidence is never edited; freshness lives on article references.** What a page said on a given day stays true; the article's claim is what goes stale. This keeps re-check working on articles, as it did in Cairn.
- **Lookups list `description:` front matter with `grep` instead of reading a generated index** (leaning, Oct 19). One search can't fall out of date and costs one call however large the base grows. Revisit past a few hundred articles: group articles into topic folders.
- **Links live in the files; there is no relationship map.** A map is a second copy every write must remember to update.
- **Lookup steps in `AGENTS.md` are numbered and end at the article, and lookups need a pointer that says to read `AGENTS.md` first** (live runs, 2026-10-19). With the steps written as reference, Haiku opened every source and evidence file to answer a question one article answered. Without a pointer, it read `AGENTS.md` in the same batch as everything else, too late to steer it. Given the numbered steps and a brief naming `AGENTS.md`, it read `AGENTS.md`, listed descriptions, read one article and stopped, in 2 of 2 runs. Cairn's session note and lookup briefs supply that pointer.
- **One `- Access:` line per access method in `origins.md`,** shown with an example, after a Sonnet run wrote an `Access:` heading followed by a list; readers accept both.
- **The format version lives in `AGENTS.md` front matter,** so the skill can refuse a format it doesn't write once others use it.
- **Folder names under `sources/` (`meetings/`, `email/`, `tickets/`) match what Cairn already wrote,** so existing knowledge bases move without renaming.
- **`check` enforces where each kind of source lives and a thread's message headings** (live runs, 2026-10-19). Haiku twice saved an email as `sources/emails/<date>/message.md`, copying the meeting folder's shape, despite the sources reference; once `check` failed on it, two more runs wrote `sources/email/<subject>.md` with dated message headings.
- **`check` uses git, when present, to enforce that sources only grow at their end and evidence never changes,** since the rule otherwise relies on agents remembering it.
- **Scripts are Node with only its built-in modules** (user, 2026-10-19), so they run wherever the skill is installed with nothing to add. The first version was Python; the Node port gives the same output on the same fixtures.

## Sources

Moved from Cairn's `effort-context` skill (knowledge and storage references) and the `portable-records` design in the user's Cairn designs folder.
