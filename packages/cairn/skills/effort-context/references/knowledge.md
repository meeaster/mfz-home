# Knowledge articles

Evidence is organized by the question each assignment answered, so understanding of one subject ends up spread across many files. A knowledge article gathers it by subject: what is known about one existing thing, such as an AWS environment, a vendor product, a codebase, or another team's service, written for a reader who never saw the evidence and kept current.

A subject earns an article when a later session would otherwise have to reread the evidence, or redo the research, to understand it. A single fact that one decision needs belongs where the decision is recorded, citing its evidence.

| Material | Holds |
| --- | --- |
| Evidence | One assignment's findings, as they stood when it was written |
| Knowledge article | What exists and how it works, organized by the subject and kept current |
| Design (`design-docs`) | What is being built or changed, and why. Its evidence items copy the claims they rest on and cite the article |
| `effort.md` | Where the work stands: the human's decisions and views, open questions |

## Write up

Write up evidence when the human asks, or when a brief assigns the article. A capture or handoff can recommend a write-up when evidence on one subject has piled up.

1. **Find the article.** Search `catalog_find` with category `knowledge` and text from the subject, or read `knowledge/index.md`. Extend an existing article on the subject; a narrower subject can be a section of a broader one. Otherwise start `knowledge/<subject>.md`, named for the subject (`aws-environment`), never for the work that produced it (`opw-research`).
2. **Gather the evidence in scope:** the files the human named, or the effort's or session's evidence that informs no article yet. In the effort view, a file already used says `written up in` with the article.
3. **Write for the subject.** Organize by how the subject is structured (accounts, then networks, then routing), not by which investigation found what. Go as deep as the subject needs: tables, diagrams, boundaries, and how the parts connect. For each section:
   - say when it was last known true and which evidence supports it, by title and path
   - keep observed facts apart from inference, and mark inference
   - where sources disagree, say what each one says; leave the disagreement standing rather than picking one
   - link raw detail, such as full route tables, rather than copying it
4. **Keep it current.** Replace what new evidence supersedes; the evidence keeps the history. List what is still unknown, with how it could be found out.
5. **Describe and link.**
   - Describe the article with `catalog_describe`: category `knowledge`, the subject as its title, and a one-sentence description of what it covers.
   - Link each evidence file you used with `catalog_link`: `<evidence> informs <article>`.
   - Include each effort whose work relies on the article or adds to it (`efforts.include`). The session that first wrote it links its own efforts automatically, and reading an article for background adds nothing.
6. **Report** the article's path, what changed, any disagreement left standing, and each evidence file in scope you left out, with the reason.

A large write-up can be dispatched: the brief assigns the article as the file to write and names the evidence in scope.

## Boundaries

- An article records what exists and decides nothing. Choices about the work go to `effort.md`, and choices about a designed system go to its design.
- What other people state in meetings, emails, or tickets reaches an article only through intake, once the human accepts it, citing the source.
- Articles are working material in the Cairn catalog. Promoting one into a personal knowledge base is a separate step that needs its own request.
