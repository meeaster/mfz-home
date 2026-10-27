# Implementation walkthroughs

Use this when the article explains a set of changes, proposed or merged, that spans several repositories or systems. The reader should come away knowing why each file exists and how the pieces depend on each other.

- Organize by what the running system needs, such as its instructions, its identity, its permissions, and its way in, rather than by file or repository. Follow each need back to where it is declared.
- Give each repository or system one color or label and use it consistently in diagrams, code headers, and tables, so the reader always knows where a piece lives. Carry the colour on the repository's name, a dot or a chip; not as a coloured strip down the side of a card or code header.
- Introduce the repositories near the top with repo cards that say what each one adds. On desktop, two or three cards sit side by side as vertical cards: owner and visibility on the first line, the name beneath, then the description and what it adds, with the branch and diff size aligned at the bottom of every card. Changes that were never pushed show `draft on main@<base>` with "not pushed" on its own line, and link the repository rather than a compare view.
- Show the order of work as dependencies: which step produces what the next step needs.
- Include a seams table for values declared in one place and repeated in another, such as names, IDs, prefixes, and hostnames: where each is defined, where it is repeated, and what breaks if they drift.
- Include first-run guidance that maps likely symptoms to the part of the change that would cause them. Label it as reasoning when nothing has run yet.
- Separate what was validated from what was not, and say when the article describes code that has never run.
- End with an index of every changed file, grouped the way the article is organised (by need), with a group for the file where everything plugs in and one for plumbing. Each row gives the file, its repository, one line on why it exists, the needs it serves and its size, and opens to its code: new files whole, modified files as their diff. Keep the reasons true to the diffs. File pills in the article link to these rows and open them in the viewer (see [HTML presentation](html-presentation.md)).
