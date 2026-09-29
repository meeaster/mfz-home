# Bring in existing material

Material from before an effort had records (earlier sessions' notes, evidence, meeting notes, exported email) is usually too large to read in one context. Bring it in through passes. Each pass reads only what the one before selected, ends with the human, and hands its accepted result to the next pass as the lens for judging relevance.

1. **Inventory.** Attach this session to the effort the human named. Copy the files into this session's folder at paths from `catalog_location`, leaving the originals where they are, so each is captured. Describe every file with `catalog_describe`: category (`evidence`, `synthesis`, `source`), a title, and one sentence naming its subject and date. Large sets go to producers in batches, each describing the files it read. Complete when every file is described; the effort view is then the map for every later pass.
2. **Framing.** From the synthesis and session notes, not the raw evidence, draft the problem, why it matters, goals, scope, constraints, and candidate requirements, each citing its files and attributed to whoever said it: the human, another person, or an earlier assistant's proposal. Go through the draft with the human. What they accept about the work goes to `effort.md`; what they accept about the system goes to its design, stable (`design-docs`) when others will review it, otherwise local. The draft stays as a synthesis, with what wasn't accepted marked as candidates.
3. **Sources and knowledge**, which can run in parallel, each brief carrying the accepted framing:
   - Save each meeting and thread in its shape under `sources/` ([storage](storage.md#sources)), with the meeting summaries' candidates grouped by the framing's problems, then take them through intake with the human.
   - Write up the evidence by subject ([knowledge](knowledge.md)), reporting files the framing makes irrelevant as left out.
4. **Design.** With the framing, articles, and accepted source items in hand, record the options, decisions, open questions, and phases in the design, citing the articles and sources (`design-docs`).

Complete when every file in scope informs a record, an article, or a source, or is reported as left out with the reason; accepted items sit in their records; and everything else remains a marked candidate in its draft or summary.
