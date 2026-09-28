# Maintaining scenarios

- Keep one real situation per descriptively named Markdown file. Update the index in `README.md` when adding or renaming a scenario.
- Read scenarios selectively when their situations bear on a design or evaluation. They guide workflow and storage design and need enough detail for an unfamiliar agent to understand the case. Use no fixed length target; remove repetition rather than meaningful detail.
- Make each scenario self-contained. Include the context needed to understand it without following links or consulting other files.
- Preserve the human's goals, perspective, corrections, and reasons. Distinguish their account and accepted decisions from assistant proposals and illustrative examples. Leave missing or undecided details explicit rather than inventing them.
- Describe how the situation unfolds and changes. At consequential points, explain who acts, what they need to know or retain, relevant relationships, and what successful continuation looks like. Include concrete examples and explain why inadequate approaches fall short when the account establishes that.
- State required behavior precisely while leaving implementation choices open. Keep current-system analysis, tool calls, file layouts, and proposed mechanisms in separate design or evaluation documents. Those documents can reference the scenario.
- Preserve the underlying need when implementation changes. Identify changes in the human's intent explicitly. When extracting or reorganizing material, preserve originals and check that consequential details, qualifications, and unresolved choices survive.
- Before finishing, check that the file alone explains what happened, what the human wants and why, what must survive, observable success, and what remains undecided. A scenario describes a need; it neither proves support nor authorizes implementation.
