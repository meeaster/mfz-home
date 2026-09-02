# Log

## 2026-09-01 - Initial design

- Added a Sol/medium architecture consultant to keep code-heavy design context outside the primary session while preserving user dialogue and final decisions there.
- Required credible alternatives, one recommendation tied to user priorities, and explicit reversal conditions.
- Allowed one-option results when evidence rules out apparent alternatives instead of forcing artificial choices.
- Required proposal-ready boundaries, verification surfaces, implementation units, evidence locators, and continuity metadata.
- Kept the agent read-only and separate from implementation, UI/UX design, prototyping, and independent review.

## 2026-09-01 - Initial live validation

- `mfz apply` rendered `architect`, and `opencode2 debug agents` resolved it to Sol/medium with final denies for patching, editing, todo ownership, and recursive delegation.
- Fresh child session `ses_f9fe40fa5ffer9u2NTqOmFxj50` evaluated a bounded architecture-placement question without writes.
- The result presented three credible options, recommended split ownership, explained tradeoffs and reversal conditions, identified one permission-enforcement gap, supplied evidence locators and implementation units, and ended with continuity metadata.
- The probe confirmed that detailed architecture synthesis belongs in the agent while phase guidance and authority remain in `/orchestrate`.

## 2026-09-01 - Root-owned architecture evidence

- Kept recursive architect delegation denied and made the primary `/orchestrate` session own architecture-specific `explore`, `research`, and `inspect` sessions.
- Chose compact packets and stable source and session locators over transcript replay, architect-side session retrieval, or a custom result transport.
- Added a bounded missing-evidence request so the primary can assess materiality, authority, and duplication, gather the smallest evidence unit, and resume the same architect with the material delta.
- Accepted the extra root mediation to keep evidence naturally shared and reusable; nested delegation may be reconsidered only if repeated live use shows material delay or primary-context bloat.

## 2026-09-01 - Batched architecture evidence requests

- Allowed the architect to return either one complete missing-evidence request or a dependency-marked batch without changing the fields required for each unit.
- Required explicit parallel-safety markings, genuine independence for concurrent groups, and no manufactured or duplicate investigation.
- Kept dispatch, dependency ordering, evidence retention, and architect resume control with the primary session.
