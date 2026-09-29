# Where designs live, working on them, and publishing

A design is a stable folder that outlives the work on it. Efforts come and go: one designs it, another builds part of it, a third adds an area. Each links to the design instead of owning it. The published doc is one self-contained HTML file built from the folder, which can go anywhere: GitHub Pages, an email, a shared drive, a file opened from disk.

## The folder

```
designs/<slug>/
  design.md                 the records (see records.md)
  changes.md                accepted changes, with where each came from
  doc.html                  the doc's shell: page order, rail, icons
  pages/<id>.md             each page: its prose and what it shows
  components/               the doc's own pictures and parts
  published/<slug>.html     the built doc
```

- Name the design for its subject ("log-ingestion"), not for the work ("opw-deployment"). Put the slug in `<html data-doc="<slug>">`.
- With Cairn, designs live beside efforts and sessions at the Cairn root: `<root>/designs/<slug>/` (the root is `CAIRN_ROOT`, by default `~/workspace/artifacts/cairn/`). Files written there are captured and credited to your session. Describe `design.md` with `catalog_describe` (category `record`, title "<Name> design") and the published doc as a `deliverable`. Without Cairn, ask the user where designs live.
- Start a new design by copying `assets/template/`. A design can be `design.md` and `changes.md` alone until someone needs to see it; add `doc.html` and pages then.
- The page structure, components, styles and script come from the skill at build time, so docs pick up the skill's improvements when rebuilt. To pin a doc's look, copy `doc.css` and `doc.js` into its folder; the build prefers local copies, and a component in `components/` replaces the skill's of the same name.
- When `check` says a folder is written in an older format, run `doc.py migrate <folder>` and review what it changed (see [pages](pages.md#format-and-migrations)).
- Source files don't render on their own; preview the built file.

## Designs and efforts

- **Link an effort to each design it changes** by making `design.md` a member of it: `catalog_describe` with the path and `efforts: {include: [<effort slug>]}`. The session that creates a design links it to its own effort automatically. A session that only reads a design for background doesn't link it.
- **Split the knowledge by what it describes.** What is being built and why (the problem, goals, how it works, requirements, phases, decisions, parts, evidence, questions) goes in the design. What already exists around it, such as the AWS environment it runs in or a vendor's product, goes in a knowledge article under `<root>/knowledge/`, kept by the effort-context skill; the design's evidence cites it. Where the work stands (its phase, decisions about the work itself, the user's views, its own open questions, tickets and PRs) goes in the effort's `effort.md`. Neither holds next steps, to-dos, or agendas; an agent proposes those from the records when asked.
- **Record it where it lands, refer to it everywhere else.** A settled question or decision about the design goes in design.md with a changes.md entry citing the session or meeting; the effort cites it by ID and changes only when where the work stands changed. A phase's status lives only in the design. A question put to someone keeps who was asked, when, and through what in its `Asked` field. When an effort picks the design up, the changes.md entries since its last session show what changed, and anything in the effort citing a changed ID gets checked.
- **Small work keeps its design in the effort.** A feature built in a session or two, or the detail below a stable design (a module's layout under "OPW runs on EC2"), goes in a local `design.md` in the effort's folder: one connected document for agents and the user, described in the effort-context skill's storage reference, not this format.
- **Promote a local design by writing it up** when others need to see it, another effort needs it, or it outlives the effort: start a design here from it, turning its prose into the problem, goals and how it works and its decisions into records with their evidence, and link the local file to the new design with `supersedes`. The readers change from agents and the user to reviewers and approvers, so this is a write-up, not a move.

## Picking a design up

When a session starts work on a design, or on an effort linked to one:

1. Find it: the effort view (`catalog_effort show`) lists linked designs among its files; otherwise the user names it.
2. Read `design.md` in full, and `changes.md` since the effort's last session. When an entry changes a decision or question the effort cites by ID, check what in the effort rests on it.
3. Run `check` on the folder. Besides problems, it says when the published doc is behind `changes.md`.
4. Read a transcript, session, or other source only when a record's reasoning needs checking; its `Recorded from` says where to look.

## Working on it

- **Findings go in as you establish them:** evidence, open questions, and options found in research, each with `Recorded from`.
- **Evidence from a knowledge article:** copy the claim the design rests on into an evidence item, since design.md must stand alone, and cite the article's section in `Recorded from` (`knowledge aws-environment · Transit gateways`) rather than the evidence files it was written from.
- **Decisions and requirements change when the user says so.** Change a decision's status, add or drop a requirement, or set an option aside only on the user's word or a meeting's accepted outcome. The page can still say what the evidence favours.
- **Log every accepted change** in `changes.md` under today's date and its source (`session <your catalog id>`, `request`, `meeting <date>`, `email <date> · <sender>`). One entry per source per sitting is enough; [records](records.md#changesmd) says which source a change belongs to.
- **Bring the pages along** when records change: tables, option cards, decision maps, costs, flows and bound diagram parts follow on their own; prose, and any part of a picture that isn't bound, don't. Redraw a picture when what was chosen differs from what it shows; update "In short", the dek, and the "Updated" date on each page that changed.

## After a meeting

The transcript and the full meeting summary are sources. With Cairn they live together in the meeting's folder, `<root>/sources/meetings/<date>-<subject>/`, as the effort-context skill describes. The summary separates what was decided, suggested, left open, and assigned, and lists candidates for each design and effort the meeting touched.

1. **Go through the candidates with the user.** Each is accepted, deferred, or rejected. A colleague's "sounds good" is not a decision until the user says it is. When a rejected idea is already in the design (an option, a risk's response, a note), take it out if the user's words cover it ("I don't want X in the design") and ask if they don't; log the removal under `request`.
2. **Apply what was accepted,** bringing along the parts of the doc it touches (a migrated page's hand-drawn diagram that shows a decision becomes a bound component; other hand-drawn tables can wait) and clearing every `check` warning, wherever it is (a hand-drawn `pending` class is one attribute to bind): decision statuses (Decided only when the meeting actually decided, with `Decided in` naming the meeting when the decision was worked out in a brief) with the Why the meeting gave and any reasoning or alternatives it discussed, the winning option Chosen and the others Not chosen with why, answered questions (the answer becomes evidence; the question gets Answer and Answered by, and comes off the Waiting on of what it blocked), new evidence and questions, options set aside with the date and reason, new pages the meeting opened up. Action items stay in the meeting's summary with their owners, as said.
3. **Record the meeting** in design.md's Meetings section: status Summarised, who attended by team or role, and a summary list. Only meetings that happened are recorded; an agenda for the next one is drafted when someone asks for it.
4. **Log the changes** in `changes.md` under `meeting <date>`. They appear as the meeting's "Changed in this doc" chips. Record each candidate's outcome in the summary's Intake section too, so it isn't gone through twice. Without a summary file (a transcript alone, no Cairn), list the outcomes in your reply and in the effort's `effort.md` when there is one.
5. **Rebuild.**

Mark a meeting Awaiting review when its summary is in but the candidates haven't been gone through.

## After an email

An email thread that answers a question, settles a decision, or brings a finding is a source like a transcript. With Cairn it's kept at `<root>/sources/email/<thread>.md` as the effort-context skill describes: one file per thread, messages oldest first, later replies added at the end, and `Reviewed through` naming the last message already taken through intake.

1. **Go through what the new messages offer** (those after `Reviewed through`) with the user, as candidates: accepted, deferred, or rejected. An email agreeing to something is not a decision until the user says it is.
2. **Apply what was accepted** as after a meeting, citing the message in `Recorded from` and, for evidence, `Gathered from: Email: <team or role>, <date>`. The evidence an answer becomes says who answered and when.
3. **Log the changes** in `changes.md` under `email <date> · <sender>`. An email gets no entry on the Meetings page; what it settled shows in the records and the change log.
4. **Move `Reviewed through`** in the thread's header to the last message gone through.
5. **Rebuild.**

## Checking and building

```bash
python3 <skill>/scripts/doc.py check <folder>
python3 <skill>/scripts/doc.py build <folder>          # writes <folder>/published/<slug>.html
python3 <skill>/scripts/doc.py build <folder> --pages workers -o <folder>/published/workers-brief.html
python3 <skill>/scripts/doc.py migrate <folder>        # a folder written for an older version of the skill
```

Pages and components render with Node (`scripts/render.mjs`, no packages to install).

- **`check` errors:**
  - references to missing IDs, in design.md or on any page
  - records missing required fields or using an unknown status, including a Leaning or Decided decision with no Why and a Given one with no Source
  - questions with no one to answer them
  - duplicate IDs across the whole doc
  - an R, D, Q or E defined on a page instead of in design.md
  - pages or sections named in records that don't exist
  - pages missing an id, title or valid group, or using an icon that isn't defined
  - included files or components that don't exist, and component blocks that name a decision, option or flow that doesn't
  - bindings that name a record, option, state or field that doesn't exist
  - a folder written in an older format
  - local paths or `file://` URLs that would be published
- **`check` warnings:**
  - hand-drawn option cards (letter, title, status class), set-aside notes or decision-map statuses that disagree with design.md
  - a Decided decision whose options aren't all Chosen, Not chosen or Set aside, a leaning that names an unmarked option, a Why longer than a sentence or two
  - the published doc behind changes.md
  - uncited evidence and unreferenced questions
  - pages with no rail content
  - marker classes that don't match the ID
  - external resources other than Google Fonts
- **`build`** runs the check, refuses to write if there are errors, renders the pages, components and record tables, applies the bindings, puts the pages together, writes the page list into the rail, and inlines the stylesheet and script into one file. Errors name the file and line.
- **`--pages`** builds a copy with only the listed pages. The shared pages come along, trimmed to the items those pages cite, and references to anything left out become plain text (the build lists them). Use it to hand one brief or area to a team that shouldn't get the whole doc. Include `overview` too when decision statuses matter to them.

Fix every error and read every warning before building.

Preview by opening the built file in a browser. When a browser tool is available:

- visit each page you changed at desktop width
- click a few markers to see their cards, including ones defined on another page, and follow a card's link
- switch to the security view
- toggle dark mode

Without a browser tool, `scripts/shot.mjs` captures the built doc in headless Chrome (set `CHROME` if the binary isn't `google-chrome`):

```bash
node <skill>/scripts/shot.mjs <built>.html page.png --page overview --full   # whole page
node <skill>/scripts/shot.mjs <built>.html diagram.png --page overview --selector "#overview-system .diagram"   # one element at 100%
node <skill>/scripts/shot.mjs <built>.html card.png --page workers --card D1  # D1's card open at its first marker
node <skill>/scripts/shot.mjs <built>.html security.png --page overview --view security --full
node <skill>/scripts/shot.mjs <built>.html dark.png --page s3-archive --dark --full
```

The built doc also accepts `?page=`, `?card=` and `?view=security` in its URL, which is what the helper uses.

## Publishing

- Publish only the built file. The folder, design.md and changes.md stay private.
- The destination is the user's call: a GitHub Pages repository, a docs site, an attachment. Copy the built file there under a stable name, commit and push only when the user asks, and share the resulting URL.
- The doc needs no server or build step at the destination. It loads Inter and Geist Mono from Google Fonts and falls back to system fonts offline.
- Link straight to a page with `?page=<id>`, for example to send the security team `?page=overview&view=security`.
