# Knowledge articles

Evidence is organized by the question each assignment answered, so understanding of one subject ends up spread across many files. A knowledge article gathers it by subject: what is known about one existing thing, such as an AWS environment, a vendor product, a codebase, or another team's service, written for a reader who never saw the evidence and kept current.

A subject earns an article when a later session would otherwise have to reread the evidence, or redo the research, to understand it. A single fact that one decision needs belongs where the decision is recorded, citing its evidence.

| Material | Holds |
| --- | --- |
| Evidence | One assignment's findings, as they stood when it was written |
| Knowledge article | What exists and how it works, organized by the subject and kept current |
| Design (`design-docs`) | What is being built or changed, and why. Its evidence items copy the claims they rest on and cite the article |
| `effort.md` | Where the work stands: the human's decisions and views, open questions |
| Origin and reference (catalog) | The systems the article rests on, and what it looked at in each and when, so it can be checked again |

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
6. **Record its references.** For each place the evidence looked at to establish what a section says, register its [origin](#origins) and record a [reference](#references) naming the section. Evidence says which investigation found something; references say which systems the claims rest on, so the article can be checked again without the evidence.
7. **Report** the article's path, what changed, any disagreement left standing, the references recorded, and each evidence file in scope you left out, with the reason.

A large write-up can be dispatched: the brief assigns the article as the file to write and names the evidence in scope.

## Origins

An origin is a system knowledge comes from, described once in the catalog with how to reach it: an AWS account, a Datadog org, a repository, a Confluence space, a documentation site. Its key is `<kind>:<identifier>`, such as `aws:4471-0938-2215` or `docs:docs.datadoghq.com`.

- **Reuse before registering.** `catalog_origin` `kinds` says which kinds exist and what their identifiers are; `find` searches origins. `register` returns the existing origin when its key is taken, so registering is also how to add the access method you used.
- **An origin is the place you reach as one system,** with its own way in. What you look at inside it (a page, a ticket, a resource in a region, a path in a repository) is a reference's locator, not another origin. A Confluence space is the origin; the page is the locator.
- **Kinds grow as needed.** For a system no kind covers, register with `new_kind`: a lowercase name for the system (`sentry`) and what its identifiers are (`Sentry org slug`), so the next agent registers the same system the same way.
- **Access methods say how to reach it from here:** the tool and what it needs (`AWS CLI` with `--profile prod-network-ro`, `Datadog MCP`, `Web fetch`). Never a credential.
- **Origins carry no dates or status.** Freshness belongs to references, because a reference is where a claim depends on an origin.

## References

A reference records what an article looked at inside an origin. Record one with `catalog_reference` `record`:

- `locator`: where, precisely enough to look again, in the origin's own terms (`us-east-1 site-to-site VPN connections`, `terraform/network/**`, a page's URL, `OPW-212`). Describe resources rather than commands; whoever looks again turns the locator and the origin's access method into the command.
- `title`: what was looked at, in a few words.
- `sections`: the article's headings it supports, exactly as written. Leave it empty when it supports the whole article.
- `observed_at`: when it was looked at, which for a write-up is when the evidence observed it, not when you wrote the article.
- `version`: what the origin says it was at, when it has one: a commit, a page version, an API version. Leave it out otherwise.

The article, origin, and locator identify a reference. Recording it again is a new look: it replaces `observed_at` and `version`, and keeps the title and sections unless you give new ones. Rename a section's references when you rename its heading; `cairn check` reports sections their article no longer has.

What people stated reaches an article through intake and is cited as a source, not recorded as a reference.

## Re-check

Re-check an article when the human asks. It confirms or corrects the article against its origins.

1. **List its references** with `catalog_reference` `list` and the article: oldest observed first, with each origin's access methods. Re-check all of them unless the human named some.
2. **Look again** at each reference's locator through its origin's access methods, and compare what you find with the sections it supports.
3. **Correct the article** where the origin changed, following "Keep it current" above. When a look finds a change worth keeping, save what it found as evidence that informs the article: the evidence keeps the history the article replaces.
4. **Record the new look** for every reference you reached: `record` it again with the new `observed_at` and `version`. Leave a reference you couldn't reach as it was. If you reached an origin a way it doesn't list, add that access method.
5. **Report** each reference as unchanged or changed (with what changed in the article), each one you couldn't reach and why, and anything new that is still unknown.

## Boundaries

- An article records what exists and decides nothing. Choices about the work go to `effort.md`, and choices about a designed system go to its design.
- What other people state in meetings, emails, or tickets reaches an article only through intake, once the human accepts it, citing the source.
- Articles are working material in the Cairn catalog. Promoting one into a personal knowledge base is a separate step that needs its own request.
