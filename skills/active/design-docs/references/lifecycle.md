# Where docs live, updating them, and publishing

A doc has two sides. The working side stays with the user's material: the page files, a private links file, and the evidence and transcripts behind them. The published side is one self-contained HTML file that can go anywhere: GitHub Pages, an email, a shared drive, or a file opened from disk.

## The working folder

- Get a folder through `effort-context`'s Locate storage operation: Cairn's `catalog_location` with a topic like `design-log-ingestion`, plus `effort` when the doc belongs to an effort. When Cairn isn't available, ask the user where docs should live. One effort usually has one doc; add pages to it rather than starting another.
- Start by copying `assets/template/` into it. Inside, keep:
  - `doc.html`, the shell, which links `doc.css` and `doc.js` and includes the pages
  - `pages/<id>.html`, one file per page
  - `<slug>.links.json`, the private links file
  - `published/<slug>.html`, the build output, named from `<html data-doc="<slug>">` in `doc.html`
- The styles and script come from the skill at build time, so docs pick up kit improvements when rebuilt. The source files don't render on their own; preview the built file.
- To pin a doc's look, copy `doc.css` and `doc.js` into its folder; the build prefers local copies.
- When Cairn is available, describe `doc.html` as the effort's `deliverable`.

## The private links file

The doc describes its sources portably ("AWS account · prod-network"). The links file maps the same identifiers to things only the user can open, so the doc can be traced back to its evidence later. The doc never reads it, and it is never published.

```json
{
  "doc": "log-ingestion",
  "evidence": {
    "E1": [
      { "path": "/home/…/network/vpn-route-tables.md", "note": "route table export, Sep 24" },
      { "url": "https://github.com/org/infra-network/tree/main/modules/vpn" }
    ]
  },
  "questions": {
    "Q4": [{ "url": "https://support.example.com/tickets/88213" }]
  },
  "meetings": {
    "2026-09-22": [{ "path": "/home/…/transcripts/2026-09-22-network.md" }]
  }
}
```

- Keys match the doc's IDs and meeting ids.
- Entries are loose: `path`, `url`, `session` (a Cairn session ID), and `note` are all fine. For facts from the conversation itself ("Stated in the request"), record the session with a note of what was said.
- Add an entry whenever evidence comes from something local or private.
- Public documentation can be linked in the doc itself; record it here too when you want the exact version you read.

## Updating after a meeting

The user supplies a transcript, recording notes, or their own summary. Then:

1. **Summarise the meeting** on the Meetings page: what was learned, what was agreed, and what was left open. Mark it Summarised. If the transcript names attendees, list them by team or role.
2. **Apply what changed** to every page it affects:
   - decision statuses in the decisions table (only to Decided if the meeting actually decided), and the rail items that show them
   - diagrams: a decided part stops being dashed, or is redrawn to match the choice
   - new or answered questions, with answers turned into evidence ("Confirmed in the Oct 2 platform sync")
   - new evidence
   - a brief's options set aside, with the reason, and its leanings
   - a new brief or area page when the meeting opened one up
   - the "Updated" date on each page that changed
3. **List the changes.** Add each as a chip under "Changed in this doc" for that meeting, e.g. "D1 decided: B", "Q1 answered", "Added E8", "Brief: set aside C", "Added page: S3 archive".
4. **Add the next meeting** if one is planned, with its agenda.
5. **Record the transcript's location** in the links file under the meeting's date.

Keep IDs stable. An answered question stays in the table with its status changed, or moves to evidence with a note; it isn't renumbered.

## Checking and building

```bash
python3 <skill>/scripts/doc.py check <folder>/doc.html
python3 <skill>/scripts/doc.py build <folder>/doc.html          # writes <folder>/published/<slug>.html
python3 <skill>/scripts/doc.py build <folder>/doc.html --pages workers -o <folder>/published/workers-brief.html
```

- **`check` errors:**
  - references to missing IDs, on any page
  - references to things that aren't definitions
  - wrong kinds for an ID prefix
  - questions with no one to answer them
  - duplicate IDs across the whole doc
  - pages missing an id, title or valid group, or using an icon that isn't defined
  - included files that don't exist
  - local paths or `file://` URLs that would be published
- **`check` warnings:**
  - uncited evidence and unreferenced questions
  - evidence or questions defined outside the shared pages
  - pages with no rail content
  - marker classes that don't match the ID
  - missing statuses
  - external resources other than Google Fonts
- **`build`** runs the check, refuses to write if there are errors, puts the pages together, writes the page list into the rail, and inlines the stylesheet and script into one file. Errors name the page file and line.
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
node <skill>/scripts/shot.mjs <built>.html diagram.png --page overview --selector "#overview-solution .diagram"   # one element at 100%
node <skill>/scripts/shot.mjs <built>.html card.png --page workers --card D1  # D1's card open at its first marker
node <skill>/scripts/shot.mjs <built>.html security.png --page overview --view security --full
node <skill>/scripts/shot.mjs <built>.html dark.png --page s3-archive --dark --full
```

The built doc also accepts `?page=`, `?card=` and `?view=security` in its URL, which is what the helper uses.

## Publishing

- Publish only the built file. Never publish the source folder or the links file.
- The destination is the user's call: a GitHub Pages repository, a docs site, an attachment. Copy the built file there under a stable name, commit and push only when the user asks, and share the resulting URL.
- The doc needs no server or build step at the destination. It loads Inter and Geist Mono from Google Fonts and falls back to system fonts offline.
- Link straight to a page with `?page=<id>`, for example to send the security team `?page=overview&view=security`.
