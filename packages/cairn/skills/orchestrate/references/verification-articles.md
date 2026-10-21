# Verification articles

Read this only for a separate, explicitly human-authorized task to promote session findings into the knowledge base. During ordinary orchestration, inspectors record verification gaps in the Cairn-assigned per-session folder; when the agreed shape leaves out an inspector, use the implementer's saved verification report. Do not create or update a verification article during handoff.

## Curating an article

After authorization, follow the `knowledge-base` skill and the knowledge base's `AGENTS.md`. A verification article at `articles/<repo>-verification.md` may hold reusable guidance on how to verify changes and human-authorized gap decisions. A missing article is not authorization to create one. Copy any cited session report into the knowledge base as evidence, following the `knowledge-base` skill; don't cite a path outside the knowledge base.

For each authorized gap:

- Start it as `proposed` unless the human has already set its status to `accepted` or `declined`.
- Merge a report into an existing gap on the same thing rather than adding a duplicate.
- Keep each status and the human's reason unchanged when maintaining the article.
- Keep declined gaps listed so they aren't proposed again.
