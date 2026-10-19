---
name: knowledge-base
description: Keep a knowledge base of plain-file articles, sources and evidence. Use when writing findings up into a knowledge article, saving a meeting, email thread or document as a source, recording evidence (including copying a session file a record cites), re-checking an article against its origins, or starting a knowledge base. Looking something up needs only the knowledge base's own AGENTS.md.
---

# Knowledge base

A knowledge base is a folder of Markdown files that holds what is known about existing things (an AWS environment, a vendor's product, a codebase, another team's service) and what that knowledge rests on. It works with no database or service: every fact about an article lives in the files, so the folder can be cloned, shared and kept by any agent.

| Kind | Where | What it holds | Changes |
| --- | --- | --- | --- |
| **Article** | `articles/<subject>.md` | Current understanding of one subject, for a reader who never saw what it was written from | Kept current |
| **Source** | `sources/…` | A record of something that happened: a meeting, an email or chat thread, a ticket or page read at a version | Never edited; a thread may grow at its end |
| **Evidence** | `evidence/<date>-<subject>.md` | What was observed in a system that can change (docs, code, an account) on a given date | Never edited; a later look adds new evidence |
| **Origin** | `origins.md` | A system knowledge comes from, with how to reach it | Add origins and access methods; never remove one that is cited |

Sources and evidence are what articles rest on, and they are kept as they were so a claim can always be checked against what was actually said or seen. What goes stale is an article's claim; an article's References list records which sources, evidence and origins each section rests on, and when each was observed, so the article can be checked again.

## Before working

1. **Find the knowledge base.** The user, the repository's guidance, or the session context names its folder. If none does and you are asked to start one, see the start task below; otherwise ask where it is.
2. **Read its `AGENTS.md`.** It says what this knowledge base covers and its own rules, which add to this skill. This skill writes format 1; if the `knowledge-base-format` in its front matter names another, stop and tell the user.

## Tasks

| Task | Read | Done when |
| --- | --- | --- |
| Start a knowledge base | Run `node scripts/kb.mjs init <folder>` from this skill's directory, then fill in `AGENTS.md`'s placeholders with the user | `check` passes and `AGENTS.md` says what the base covers |
| Save a source | [sources](references/sources.md) | The source is saved in its shape under `sources/` and `check` passes |
| Record evidence, or copy in a session file a record cites | [evidence](references/evidence.md) | The evidence names every origin it observed and `check` passes |
| Write up an article | [articles](references/articles.md) | The article covers what the material in scope establishes about its subject, every section's claims are backed by its References, each file in scope is cited or reported as left out with the reason, and `check` passes |
| Re-check an article | [articles](references/articles.md#re-check) | Every reference in scope looked at again: the article corrected where the origin changed, what changed saved as new evidence, observed dates updated, and each one that couldn't be reached reported |

## Rules

- **Cite only what travels with the knowledge base:** a file inside it, or an origin listed in `origins.md`. A path in a session folder, a temporary directory or someone's home directory is copied in as evidence first ([evidence](references/evidence.md#copy-in-a-session-file)). A session ID may be named as provenance; nothing depends on it resolving.
- **Name files for their subject** (`articles/aws-environment.md`), never for the work that produced them (`articles/opw-research.md`). Look for an existing file on the subject before starting one.
- **Keep observed facts apart from inference,** and mark inference. Where sources disagree, say what each says and leave the disagreement standing.
- **Link, don't copy.** Articles link to related articles in their text, and to raw detail (a full route table) rather than repeating it.
- **Run `check` after every change:** `node scripts/kb.mjs check <folder>` from this skill's directory. It fails on missing front matter, a reference to a file or origin that doesn't exist, a reference to a section the article doesn't have, a citation outside the knowledge base, and, in a git repository, an edit to existing sources or evidence. Fix every error.

## origins.md

One `##` section per origin, its heading the origin's key, `<kind>:<identifier>` in lowercase kind (`aws:4471-0938-2215`, `docs:docs.datadoghq.com`, `repo:github.com/acme/infra`, `confluence:acme/NET`, `jira:acme/OPW`). Under it, one line on what it is, then one `- Access:` line per way to reach it from here: the tool and what it needs, never a credential.

```markdown
## aws:4471-0938-2215

The prod network AWS account.
- Access: AWS CLI with --profile prod-network-ro
- Access: AWS console through SSO, role NetworkReadOnly
```

- **Reuse before adding.** An origin is a system you reach as one place, with its own way in. What you look at inside it (a page, a ticket, a resource, a path) is a locator on the reference, not another origin: the Confluence space is the origin, the page is the locator.
- **Use an existing kind when one fits;** for a new system, name the kind for the system (`sentry`) and keep using it.
- Origins carry no dates; freshness belongs to the references that cite them.

## Boundaries

- An article records what exists and decides nothing. A choice about work or about a designed system goes where that work or design is recorded, citing the article.
- What people stated reaches an article through a source, cited from the References list. A source's suggestions and decisions are not facts about a system until the user accepts them.
- Commit, push or publish the knowledge base only when the user asks.
