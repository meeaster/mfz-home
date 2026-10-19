# Articles

An article gathers what is known about one subject, organized the way the subject is structured (accounts, then networks, then routing), not by which investigation found what. A subject earns an article when a later session would otherwise have to reread the material, or redo the research, to understand it. A single fact one decision needs belongs where the decision is recorded.

## Format

```markdown
---
description: One sentence saying what this article answers, in words someone searching would use.
updated: 2026-10-19
---

# AWS network

<Sections organized by the subject. Tables, diagrams and boundaries as the subject needs.>

## Unknown

- <What is still not known, and how it could be found out.>

## References

- `aws:4471-0938-2215` · us-east-1 site-to-site VPN connections · observed 2026-10-12 · supports: Routing; Tunnels · via [VPN audit](../evidence/2026-10-12-vpn-audit.md)
- [Network working session](../sources/meetings/2026-10-02-network-working-session/summary.md) · supports: Ownership
- [OpenCode agent loading](../evidence/2026-10-19-opencode-agent-loading.md)
```

- **`description`** is what a lookup reads to decide whether to open the article, so it names the subject and what the article answers. One line.
- **`updated`** is the date the article's content last changed.
- **References** is the last section. Each item is one line, its parts separated by ` · `:
  - **A file reference** starts with a Markdown link to a source or evidence file in the knowledge base.
  - **An origin reference** starts with an origin key from `origins.md` in backticks, then the locator: where inside it, precisely enough to look again, in the origin's own terms (a resource and region, `terraform/network/**`, a page's URL, `OPW-212`). Describe resources rather than commands. It needs `observed <date>`: when the claim was looked at, which for a write-up is when the evidence observed it, not when you wrote the article.
  - `version <value>`: what the origin said it was at, when it has one (a commit, a page version).
  - `supports: <heading>; <heading>`: the article's headings it backs, exactly as written. Leave it out when it backs the whole article.
  - `via <link>`: the evidence file that observed it, for an origin reference.
- Rename a heading and you rename it in every `supports:` that names it; `check` reports headings that no longer exist.

## Write up

Write up when the user asks, or when a brief assigns the article.

1. **Find the article.** List descriptions with `grep -r "^description:" articles/` from the knowledge base's folder and read the ones that might cover the subject. Extend an existing article on the subject; a narrower subject can be a section of a broader one. Otherwise start `articles/<subject>.md`.
2. **Gather the material in scope:** the files the user named, or the evidence and sources on the subject that no article cites yet. Material outside the knowledge base, such as a session's output, is recorded as evidence first ([evidence](evidence.md)).
3. **Write for the subject.** For each section, mark inference apart from what was observed, and leave disagreements between sources standing with what each says. List what is still unknown, with how it could be found out.
4. **Keep it current.** Replace what newer material supersedes; the sources and evidence keep the history.
5. **Record the references.** For each place a section's claims rest on, add or update its References line: an origin reference with `via` the evidence that observed it, or a file reference to a source. Add an origin to `origins.md` when the article needs one that isn't there. Set `updated`.
6. **Run `check`** and fix every error.
7. **Report** the article's path, what changed, any disagreement left standing, and each file in scope you left out, with the reason.

## Re-check

Re-check when the user asks. It confirms or corrects an article against the systems it rests on.

1. **List what to look at.** `node scripts/kb.mjs stale <folder> --article <path>` lists the article's origin references oldest first, with each origin's access methods. Re-check all of them unless the user named some.
2. **Look again** at each locator through its origin's access methods, and compare what you find with the sections it supports.
3. **Save what changed as new evidence** ([evidence](evidence.md)), dated today, and correct the article from it, following "Keep it current" above.
4. **Update the reference** for every one you reached: set `observed` to today, `version` when the origin has one, and `via` to the new evidence when there is one. Leave a reference you couldn't reach as it was. If you reached an origin a way it doesn't list, add that access method to `origins.md`.
5. **Run `check`,** then **report** each reference as unchanged or changed (with what changed in the article), each one you couldn't reach and why, and anything newly unknown.
