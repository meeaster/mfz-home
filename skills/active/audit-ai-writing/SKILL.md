---
name: audit-ai-writing
description: Audits prose for formulaic, AI-flavored writing — puffery, generic claims, weasel attributions, negative parallelisms, repeated triples, model-favored vocabulary, and formatting tics. Use when the user asks to review writing for AI signs, check whether text reads as AI-written or "slop", de-slop a draft, or strip ChatGPT-isms.
---

# Audit AI Writing

Hunt the text for **tells**: recurring patterns that make prose read as formulaic or AI-flavored. These patterns do not establish authorship; humans are poor at distinguishing human and model-generated text, and normal usage varies by genre. A single tell is usually coincidence, so assess clusters across the whole text rather than treating any item as proof.

**Source:** Wikipedia, [Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing), [revision of 25 July 2026 15:16 UTC](https://en.wikipedia.org/w/index.php?title=Wikipedia:Signs_of_AI_writing&oldid=1365981360).

## Process

1. **Establish context, then read the whole text.** Note the genre, house style, date, editing environment, and any known author baseline. A shift in tone or vocabulary is meaningful only relative to that context.
2. **Scan against every tell in the catalogue below**, one category at a time. For each hit: quote the passage verbatim, name the tell, explain why it is out of place, and propose a concrete rewrite.
3. **Check the substance.** Ask whether generic claims displaced specific facts, attributions support the claimed scope, and apparent analysis is grounded rather than speculative. Do not merely swap synonyms to hide surface tells.
4. **Weigh density and confidence.** Repeated, independent patterns matter more than isolated phrases. Never use an automated detector score as dispositive evidence.
5. **Report.** Group findings by severity (clusters first), then give a one-line style assessment: clean, scattered tells, or pervasively AI-flavored. State confidence when context is limited; do not claim to have proved who or what wrote the text.

## Tell catalogue

### Significance inflation (puffery)
Generic claims that the subject matters to some broader movement. Watch: *stands/serves as, is a testament to, plays a vital/significant/crucial/pivotal role, underscores the importance, reflects a broader, symbolizing, contributing to, setting the stage, key turning point, evolving landscape, focal point, indelible mark, deeply rooted.*

### Promotional / travel-brochure tone
Marketing warmth where neutral description belongs. A sudden genre mismatch is stronger evidence than promotional wording in advertising. Watch: *boasts, vibrant, rich (heritage/tapestry), profound, nestled, in the heart of, groundbreaking, renowned, showcasing, exemplifies, commitment to, natural beauty, diverse array.*

### Generic smoothing
Specific, unusual, or checkable facts are replaced by positive abstractions that could describe many subjects. Flag passages that become less informative while sounding more important; restore the concrete fact or cut the claim.

### Coverage as substance
Notability is asserted by listing *independent coverage, media outlets, trade publications,* being *profiled in*, or an *active social media presence* without saying what the evidence establishes. Also watch one or two sources inflated into a broad consensus.

### Vague attribution (weasel words)
Opinions hung on unnamed authorities. Watch: *industry reports, observers have cited, experts argue, some critics argue, several sources/publications,* and *such as* before a padded list. Verify that the attribution fits the genre and that available evidence supports the scope; otherwise narrow or cut the claim.

### Source-gap speculation
Missing evidence is acknowledged and then bridged with inference: *based on available information, details are limited, not widely documented, likely, may have.* Separate known facts from hypotheses and remove unsupported connective tissue.

### Superficial "-ing" analysis
Analysis faked by tacking a present-participle clause onto a fact: *...facilitating trade, contributing to development, highlighting the role, ensuring access, fostering growth.* The clause adds no checkable content.

### Formulaic conclusion
The "challenges / future" wrap-up: *"Despite its X, [subject] faces several challenges..."* followed by vague optimism or speculation about what lies ahead.

### AI vocabulary density
High concentration of model-favored words. Current markers include *additionally, intricate/intricacies, interplay, landscape, meticulous, pivotal, underscore, tapestry, testament, align/resonate with, enhance, foster, showcase,* and *robust.* Vocabulary changes by model and era: *delve* is now a weaker historical marker. Density is the signal, not any single word.

### Negative parallelism
Define-by-negation framings: *"not only X, but also Y" · "it's not X, it's Y" · "X rather than Y" · "no…, no…, just…"* Flag only when repeated or used to manufacture rhythm or false contrast.

### Rule of three
Reflexive three-part lists where two or four would read naturally — *adjective, adjective, adjective*; *phrase, phrase, and phrase*; or three parallel bolded headers in a row. Flag repeated patterns, not a single ordinary rhetorical triple.

### Elegant variation
Straining to never repeat a noun, so one concept wears many synonyms across a paragraph (an artifact of repetition penalties). Repeating the plain word is usually better.

### Copula avoidance
Dodging *is/are/has* for inflated verbs: *serves as, stands as, marks, represents, features, offers, boasts.* Restore the plain copula.

### Chatbot and template residue
Conversation or scaffolding leaked into the deliverable: *Certainly!, I hope this helps, Would you like..., let me know, here is a...*, or planning prose such as *In this section, we will discuss...* Also flag unfilled placeholders such as `[Your Name]`, `[Specific Topic]`, `INSERT_SOURCE_URL`, and `2025-XX-XX`.

### Formatting tics
Treat formatting as genre- and house-style-dependent. Look for clusters or unexplained deviations, especially:
- **Title Case In Headings** where sentence case is the house style.
- **Bold overuse** — mechanically bolding key terms throughout, sometimes broken across line breaks.
- **Em-dash overuse** for emphasis and asides; this is a weak, model-dependent signal.
- **Decorative emoji bullets** where the genre does not call for them; this is also a weak signal.
- **Inline-header lists**: `- **Bolded header:** description` repeated down a list.

## Not tells

Do not flag these by themselves:
- Length, or grammatical and spelling perfection.
- Any single isolated instance of an otherwise-flagged pattern.
- Curly quotation marks or apostrophes; software and publishing conventions commonly produce them.
- Pre-November 2022 provenance or an author's coherent explanation of their choices. Both reduce suspicion but do not prove that no language-generation system or AI assistance was involved.
