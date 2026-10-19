# Sources

A source is a record of something that happened: what people said in a meeting, an email or chat thread, a ticket's comments, a page someone wrote, read at a version. It keeps their words so a later reader can check what was said without asking. Sources are never edited; a thread grows by adding later messages at its end, and a meeting summary may gain an Intake section at its end recording what was taken from it.

What a source says is what people stated, not a fact about a system. It reaches an article as a cited source, after the user accepts what it settles.

## Front matter

Every source file starts with:

```markdown
---
kind: email
occurred: 2026-10-03
description: Security GRC on whether customer traffic may terminate in Shared Tooling.
---
```

`kind` is `meeting`, `email`, `chat`, `ticket`, `page` or a new kind named for what it is. `occurred` is when it happened, or when the thread started. `description` says what it's about in one line.

## Message threads

An email, chat or ticket thread is one file in `sources/email/`, `sources/chat/` or `sources/tickets/`, named for its subject (`sources/email/sec-12-customer-ingress.md`).

- Messages oldest first, each under `## <date> [time] · <sender> (<team or role>)`, in the sender's words. Trim quoted earlier messages and signatures, keeping what the sender added. Name attachments and excerpt the parts that matter.
- Later replies go at the end of the same file. A side thread or a new subject starts its own file that names the one it came from.
- A page or ticket whose words settle something is saved the same way at `sources/pages/<page>.md` or `sources/tickets/<key>.md`, naming the version or comment it was read through.

```markdown
---
kind: email
occurred: 2026-10-03
description: Security GRC on whether customer traffic may terminate in Shared Tooling.
---

# Email · SEC-12 and customer ingress

People: Alex (Security GRC), Priya (platform lead), the user

## 2026-10-03 09:14 · Alex (Security GRC)

Customer traffic can't terminate inside Shared Tooling. Section 4.2 of SEC-12 is below.

> Customer-originated traffic shall not terminate in an internal-tools enclave.
```

## Meetings

A meeting gets a folder, `sources/meetings/<yyyy-mm-dd>-<subject>/`, so its summary stays beside what it summarizes. Each file in it has the source front matter.

| File | Holds |
| --- | --- |
| `transcript-raw.md` | The raw transcript or notes, unchanged |
| `transcript.md` | Cleaned: speakers labelled by role, filler removed, nothing added |
| `summary.md` | What was discussed, what was decided in the meeting (with who decided, as stated), what was suggested and by whom, what was left open, and the action items with their owners and dates, as said |

A recording is linked from the summary by its URL or path, never copied. Everything decided or suggested in a meeting is a candidate until the user accepts it: a colleague's agreement is not the user's decision.
