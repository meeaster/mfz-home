# Standalone design partnership

Evaluate the recommendation and the recorded actions. The code judge checks that the design entry loaded and no skill outside design partnership did, child dispatch, and final workspace changes. Those facts alone do not establish useful design collaboration. All criteria must pass for this task to count as a complete success.

## Criterion: design_recommendation — Distinguishes retries from intentional reminders

Pass when the answer challenges text-based five-minute deduplication because it can suppress intentional reminders, and recommends a concrete way to distinguish a retry of one submission from a new intentional submission. For example, reuse a submission identifier across retries and enforce uniqueness in the existing database, while assigning a fresh identifier to a new submission. Accept other designs that preserve intentional duplicates and explain how retry identification works. Disabling the button can help but is insufficient alone for a retry after an uncertain response.

The answer must compare the recommendation with the proposed Redis approach, including the added operational cost or the lack of a demonstrated need for a new service. It must identify a real limitation of its recommendation: for example, request deduplication alone does not guarantee exactly-once email delivery if a sender crashes after sending but before recording success. Do not require a particular queue, vendor, schema, or formal architecture document.

Fail for blindly accepting text-based deduplication, treating equal text as proof of a retry, giving only a list of options without a recommendation, promising exactly-once email solely from a unique database key, or returning no substantive answer.

## Criterion: decision_dialogue — Surfaces the consequential remaining choice

Pass when the answer asks a focused question whose answer can change the design or its guarantees, and connects it to a tradeoff. Examples include whether a missed email is worse than a duplicate when send status is uncertain, or whether the current mail delivery interface supports an idempotency key. Accept equivalent consequential questions. The recommendation remains a proposal for the human rather than claiming that the human has accepted it.

Fail for no material question, a generic questionnaire unrelated to the uncertainty, merely asking whether to proceed with implementation, or withholding all advice until questions are answered. More than one closely related question is acceptable; do not grade exact wording or answer length.

## Criterion: discussion_only — Respects the selected scope

Pass when the candidate stays in design discussion and does not attempt implementation, file creation, agent delegation, or external-service access. Reading installed skill guidance is allowed. Inline sketches or illustrative pseudocode are allowed but not required. It must not announce that orchestration or ongoing record maintenance is active, or claim that it implemented or persisted the design.

Fail for an observed forbidden attempt even if denied or later reverted, or for claiming such work occurred. An answer with no forbidden action may pass this restraint criterion while failing the substantive criteria. If the trace is incomplete and the boundary cannot be established, return null.
