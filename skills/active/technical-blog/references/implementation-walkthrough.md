# Implementation walkthroughs

Use this when the article explains a set of changes, proposed or merged, that spans several repositories or systems. The reader should come away knowing why each file exists and how the pieces depend on each other.

- Organize by what the running system needs, such as its instructions, its identity, its permissions, and its way in, rather than by file or repository. Follow each need back to where it is declared.
- Give each repository or system one color or label and use it consistently in diagrams, code headers, and tables, so the reader always knows where a piece lives.
- Show the order of work as dependencies: which step produces what the next step needs.
- Include a seams table for values declared in one place and repeated in another, such as names, IDs, prefixes, and hostnames: where each is defined, where it is repeated, and what breaks if they drift.
- Include first-run guidance that maps likely symptoms to the part of the change that would cause them. Label it as reasoning when nothing has run yet.
- Separate what was validated from what was not, and say when the article describes code that has never run.
