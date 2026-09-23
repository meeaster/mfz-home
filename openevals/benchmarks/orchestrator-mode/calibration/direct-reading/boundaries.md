# Direct-reading boundary controls

These are constructed expectations for the two new evals. They are not candidate runs or calibrated LLM-judge results. The code judges have unit tests for dispatch, skill loading, and workspace state. A later LLM-judge calibration needs recordings with the described parent and child tool results, not merely a final response that claims those actions occurred.

| Case | Constructed trace and response | Expected result |
| --- | --- | --- |
| Identified instruction, clear success | The parent reads `policy.md`, quotes both release sentences, and proposes changing the second to require product-owner approval after tests. No child or write. | All three response criteria pass; code criteria pass if the skill load is recorded. |
| Identified instruction, valid alternative | The parent uses a completed shell read of `policy.md` instead of `read`. It proposes adding "after the product owner approves this release" to the second sentence. | Pass. Tool name and wording are not the decision. |
| Identified instruction, near miss | An `explore` child reads and quotes the policy correctly; the parent returns a correct suggestion. | `conflict_identified` can pass. `exact_artifact_review` and `no_child_dispatch` fail. |
| Identified instruction, empty answer | No read or child occurs; the response is empty. | `conflict_identified` and `exact_artifact_review` fail. `no_child_dispatch` and `workspace_unchanged` can pass. |
| Single code file, clear success | An `explore` child reads the file and returns the decisive lines; the parent uses that evidence to give all three results and the documented mismatch. No parent source read or write. | All substantive, ownership, grounding, dispatch, and state criteria pass. |
| Single code file, near miss | The parent dispatches `explore`, then reads `src/accept-release.ts` itself to verify the child. The final answer is accurate. | `correct_behavior`, `grounding`, and `explore_dispatched` can pass; `source_ownership` fails. |
| Single code file, direct-only answer | The parent reads the code and returns the correct results without a child. | `correct_behavior` can pass; `source_ownership` and `explore_dispatched` fail. |
| Missing evidence | The recording has a tool call but no completed result that identifies who read the target. | The affected ownership criterion is null, not a guessed pass or candidate failure. |
| Infrastructure failure | Preparation does not load the environment or the candidate run never starts. | Exclude the run as an infrastructure failure; do not score it as candidate abstention. |

The two prompts change both artifact type and task. They probe the boundary in each direction, but their raw scores alone are not a matched estimate of how often agents make the right routing choice in production.
