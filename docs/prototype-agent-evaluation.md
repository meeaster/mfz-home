# Prototype agent evaluation

## Why we ran the experiment

We needed a model assignment for a general-purpose `prototype` subagent. The agent builds throwaway code that makes a design question tangible before production work starts. We wanted strong decision evidence without spending premium-model rates on every prototype.

The working budget was about `$20` per day for work agents. Personal work could use a more expensive model when the question justified it.

## What we compared

Five native OpenCode subagents used the same promptless runtime contract. Each candidate could plan, edit its assigned worktree, and validate its artifact. Each candidate was denied recursive delegation and was instructed to load the existing `prototype` skill.

| Candidate | Model assignment |
| --- | --- |
| Luna | `openai/gpt-5.6-luna@max` |
| Terra high | `openai/gpt-5.6-terra@high` |
| Terra xhigh | `openai/gpt-5.6-terra@xhigh` |
| Terra max | `openai/gpt-5.6-terra@max` |
| Sol | `openai/gpt-5.6-sol@medium` |

Each candidate ran in a separate Git worktree. Paired runs used identical fixture commits and `PROTOTYPE_QUESTION.md` files. The evaluation changed only the model assignment and reasoning effort.

## Scenarios

### Single-active-job logic

The first scenario asked whether a single-active-job state model remained understandable when urgent work could preempt ordinary work. The model also needed to handle failure, retry, pause, resume, cancellation, and illegal overlap.

Each candidate produced one self-contained HTML file with free-play controls and guided walkthroughs for ordinary completion, urgent preemption, cancellation during interruption, and failure followed by retry.

### Operations UI

The second scenario asked what a dense alert-triage page should look like. Each candidate modified the same existing `/operations` fixture and produced three structurally different variants. The fixture required URL-stable switching, keyboard navigation, representative alert data, and the existing product shell.

### Unsettled alert-grouping policy

The third scenario asked how operators should group alerts that might describe one incident. The brief deliberately left the state model unsettled. Candidates had to distinguish observed alert facts from operator judgment and make consequential policy choices exercisable.

This scenario tested whether additional model capability produced better decision evidence rather than more polish.

## How we evaluated the runs

We reviewed the artifacts rather than relying on each child's summary. The comparison covered:

- whether the artifact answered the design question;
- whether it exposed useful assumptions and unknowns;
- whether its state transitions were sound;
- whether it made autonomous progress without production work;
- whether a human could run and inspect it;
- how much correction it required;
- total turns, tokens, and estimated current-catalog cost.

Parent-side browser checks exercised consequential logic transitions and every UI variant. Session cost came from the body-free OpenCode V2 cost calculator against `/home/mark/.local/share/opencode/opencode.db`. The calculator used the models.dev catalog snapshot with SHA-256 `daf4cdb3135457cf739480d76033e674a4c47516e060d4581fe85f1d5afa85ef`.

OpenCode stored zero cost for these sessions. Every dollar amount below is a current-catalog estimate, not a provider invoice.

## Results by scenario

| Scenario | Luna max | Terra high | Terra xhigh | Terra max | Sol medium |
| --- | ---: | ---: | ---: | ---: | ---: |
| Logic | `$0.02026476` | `$0.4373736` | `$0.3173816` | `$0.1982804` | `$1.004529` |
| UI | `$0.0306748` | `$0.4122468` | `$0.3156504` | `$0.3313992` | `$2.179813` |
| Judgment | `$0.02156492` | `$0.2638016` | `$0.4082852` | `$0.398398` | `$0.597096` |

### Luna max

Luna produced the smallest useful artifacts and the best cost-to-learning ratio. Its logic and UI work answered the questions with little wasted motion. The unsettled-judgment artifact had correctness gaps, including a walkthrough that did not perform its stated regrouping and a split that violated its own minimum membership assumption.

Luna is a strong economy option for tightly bounded prototypes. It leaves more policy work to the human.

### Terra high

Terra high was consistently more nuanced than Luna, but long validation loops drove its cost up. Its judgment reducer required a selected case before a new alert could arrive and allowed assignment after resolution while rejecting acknowledgement.

Terra high did not establish a useful routing niche.

### Terra xhigh

Terra xhigh produced good logic and UI artifacts. Its judgment model represented overlapping operator hypotheses and separated alert acknowledgement from work acknowledgement. Parent validation still found assignment legal after resolution.

It cost more than Terra max across the three matched runs and did not produce stronger aggregate artifacts.

### Terra max

Terra max produced the strongest Terra evidence. Its logic artifact made automatic resumption an explicit policy. Its UI set included a triage workbench, a priority briefing, and a comparison ledger. Its judgment artifact made membership, acknowledgement scope, and late-arrival reopening directly switchable.

The judgment artifact still allowed assignment after resolution and lacked status checks for several other transitions. Terra max did not match Sol's complete audit and attribution model, but it found a useful middle position between Luna's economy and Sol's quality.

### Sol medium

Sol produced the strongest artifacts. Its UI variants were the most complete and distinct. Its unsettled-judgment prototype let the user compare competing policies while retaining accepted, pending, and retracted assertions with attribution and audit history.

That quality was expensive. The UI run used 52 turns and cost an estimated `$2.179813`. Validation-loop length contributed more to total cost than reasoning effort alone.

## Aggregate results

| Candidate | Turns | Input | Cached input | Output | Reasoning | Estimated cost | Relative to Luna |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Luna `max` | 40 | 129,642 | 897,024 | 21,464 | 2,399 | `$0.07250448` | `1.0x` |
| Terra `high` | 76 | 206,761 | 2,096,640 | 20,116 | 3,265 | `$1.113422` | `15.4x` |
| Terra `xhigh` | 69 | 155,531 | 2,052,096 | 22,560 | 4,093 | `$1.0413172` | `14.4x` |
| Terra `max` | 59 | 140,074 | 1,630,208 | 22,682 | 4,142 | `$0.9280776` | `12.8x` |
| Sol `medium` | 87 | 180,556 | 3,208,576 | 36,706 | 5,773 | `$3.781438` | `52.2x` |

Terra variants shared the same token rates. Reasoning effort did not predict total cost because turns and accumulated context dominated. Terra max happened to be both the strongest and the cheapest Terra candidate in this sample.

## Decision

The experiment supports profile-specific routing:

- The base profile uses Terra `max`. This is the work default and fits the daily budget while providing explicit alternatives and useful decision framing.
- The Personal profile uses Sol `medium`. Personal prototypes favor the strongest decision evidence when a missed policy issue matters more than cost.

Luna `max` remains an optional economy lane for high-volume, tightly bounded experiments. Terra `xhigh` and Terra `high` do not have a separate role based on this evidence.

## Limits

The sample contains three scenarios and one run per candidate per scenario. Tool-loop length varied, so the results measure complete agent behavior rather than isolated model reasoning. Current models.dev prices can change, and the estimates do not reproduce historical provider billing.

The experiment report preserves the model-specific evidence. The temporary candidate agents were removed after the decision. The permanent `prototype` agent keeps one behavioral contract and lets profile configuration select the model.
