# Specialist-To-Implementation Handoffs

When a specialist artifact contains actionable design, research, review, or planning decisions for an implementer, preserve the complete artifact as the decision authority. Do not replace it with a parent summary.

- Inline the complete artifact when it is short enough to remain usable in the implementation prompt. Otherwise, place an unchanged copy in a caller-selected file that the implementer can access.
- A parent may add a separate correction overlay for conflicts. Name each overridden decision, its authoritative source, and the required replacement; do not silently edit the specialist artifact.
- Keep the artifact in the owning workflow's chosen location. Context Transfer selects the transfer shape, not a repository path, persistence policy, or publication lifecycle.

During the cold-consumer test, compare the transferred artifact against the specialist artifact and correction overlay. Every actionable decision must be present unchanged or explicitly overridden.

Done when the implementer receives the full specialist artifact plus any explicit correction overlay, with no actionable decision lost to summarization.
