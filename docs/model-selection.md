# GPT-5.6 Model Selection

Field guidance for choosing GPT-5.6 models and reasoning efforts in this
Mindframe-Z home.

**Status:** research snapshot as of 2026-07-11

This family is new. Treat the recommendations below as a starting policy, not
as permanent capability claims. Update the observations log as we collect
representative local traces.

## Scope

This guide covers the OpenCode `delegate_general` workflow and the configured
OpenCode `advisor` tool. It separates four kinds of evidence:

- **Official guidance:** OpenAI model and reasoning documentation.
- **Independent evaluation:** benchmark and cost-performance analysis from
  third parties.
- **Community reports:** posts, anecdotes, and early usage impressions.
- **Local policy:** the routing rules we choose for this home.

Do not turn a community claim into local policy without testing the task shape
that matters to us.

## Executive Policy

1. Choose the smallest model that is capable of completing the task correctly.
2. Choose the reasoning effort separately from the model tier.
3. Use Luna for bounded, high-volume, or cost-sensitive work; Terra for normal
   interactive work; and Sol for ambiguous or high-stakes work.
4. Use the advisor as a review and escalation mechanism, not as proof that a
   lower-tier executor is equivalent to a higher-tier model.
5. Measure total cost and success rate, including advisor calls, rather than
   comparing executor token prices alone.

## Model Tiers

OpenAI describes the tiers as durable capability roles within the GPT-5.6
family. The model tier and reasoning effort are separate choices.

| Model | Official role | Good starting uses | Local routing posture |
| --- | --- | --- | --- |
| `openai/gpt-5.6-sol` | Frontier model for complex professional work | Ambiguous synthesis, architecture, difficult debugging, long-horizon agents, high-stakes review, deep research | Escalation and quality-first executor |
| `openai/gpt-5.6-terra` | Balanced model for intelligence and cost; roughly the mini-like tier | Everyday interactive coding, routine agentic work, analysis, writing, and multi-step tasks | Normal daily default when Luna is too risky or too limited |
| `openai/gpt-5.6-luna` | Fast, cost-efficient model for cost-sensitive and high-volume work; roughly the nano-like tier | Extraction, classification, retrieval, summaries, mechanical checks, bounded coding, and lightweight agents | Add as the low-cost executor and first-pass worker |

The local `delegate_general` catalog now contains Luna, Terra, and Sol in
smallest-to-largest order. Luna is the low-cost executor, Terra is the balanced
default, and Sol is the frontier escalation. Keep the runtime descriptions
aligned with this guide when the policy changes.

### Current list prices

These are the OpenAI list prices recorded in the source pages at the time of
this snapshot. They are not the cost of a successful task, because reasoning,
prompt caching, tool calls, retries, and advisor calls can change the total.

| Model | Input per 1M tokens | Output per 1M tokens |
| --- | ---: | ---: |
| Sol | $5.00 | $30.00 |
| Terra | $2.50 | $15.00 |
| Luna | $1.00 | $6.00 |

### Luna plus advisor

Luna can be a powerful executor when a stronger reviewer is available, but the
reviewer is a separate model call:

- The executor performs the bounded work with Luna.
- The executor may call `advisor()` when it needs a stronger review.
- The configured advisor is `openai/gpt-5.6-sol@high`.
- The advisor sees the parent transcript and returns guidance. Its review
  session disables mutation, shell, task, recursive-advisor, and delegation
  tools.
- Total cost and latency include both calls.

The advisor is not called automatically by `delegate_general`. The general
agent decides when to call it. The advisor plugin allows a Luna executor to
consult the stronger Sol target, while an executor already at the Sol tier is
not sent to an equal-or-weaker Sol advisor.

A local availability probe on 2026-07-11 confirmed that a top-level
`gpt-5.6-luna@xhigh` session could call `advisor()` and receive a review from
`gpt-5.6-sol@high`. This confirms availability, not task-quality equivalence.
A subsequent exported child session confirmed the delegated path: a
`delegate_general` child running `gpt-5.6-luna@xhigh` completed an `advisor()`
call to `gpt-5.6-sol@high` in session
`ses_0ac27a2f6ffemiy0O6BfmhzT9F`. This confirms tool availability and routing,
not task-quality equivalence.

## Reasoning Efforts

OpenAI documents these GPT-5.6 efforts: `none`, `low`, `medium`, `high`,
`xhigh`, and `max`. Effort changes how much reasoning the selected model is
asked to apply; it does not turn Luna into Terra or Sol.

| Effort | Official framing | Local starting use |
| --- | --- | --- |
| `none` | Latency-critical work that does not benefit from reasoning or chained tools | Not locally exposed |
| `low` | Efficient reasoning with modest latency increase; tool use, planning, search, drafting, and execution-oriented coding | Scouts, extraction, routine tool use, and bounded first passes |
| `medium` | Balanced quality and reliability for planning, judgment, agentic coding, research, and delegation | Default for normal multi-step work |
| `high` | Hard reasoning, complex debugging, deep planning, and high-value work | Difficult bounded coding, serious analysis, and review |
| `xhigh` | Deep research and long-running agentic work where extra latency and cost are justified | Challenging Luna or Sol work after a lower-effort baseline is insufficient |
| `max` | Quality-first work requiring more exploration and verification than `xhigh` | Locally exposed for Luna only; use when the measured quality gain justifies the cost |

`none` remains an officially documented effort but is not locally exposed for any
model in this home. `max` is locally exposed only for Luna; Terra and Sol remain
limited to `low` through `xhigh`.

OpenAI recommends establishing a baseline, then comparing the same effort and
one lower effort on representative tasks. Before increasing effort, check for
missing success criteria, tool-routing rules, dependencies, or validation
loops. More reasoning is not a substitute for a clearer task contract.

### Important distinction: `xhigh` versus `max`

Some early community posts discuss Luna `max` while others discuss Luna
`xhigh`. These are not interchangeable claims. OpenAI's current guidance puts
`max` above `xhigh`; benchmark results must be read with the exact model and
effort setting attached.

## Recommended Routing

| Task shape | First choice | Escalate when |
| --- | --- | --- |
| Extraction, classification, retrieval, summaries, or mechanical checks | Luna `low` or `medium` | Results are ambiguous, incomplete, or need stronger judgment |
| Bounded background work and lightweight agents | Luna `medium` | The task stops converging or has meaningful consequences |
| Routine interactive coding and repository work | Terra `medium` | The task becomes architectural, ambiguous, or difficult to verify |
| Cost-sensitive bounded coding or analysis | Luna `high` or `xhigh` | Use Luna `max` only for quality-first Luna runs when its measured gain justifies the cost; compare Terra or Sol rather than always increasing Luna |
| Difficult but bounded debugging | Terra `high` or Sol `medium` | The failure requires broad exploration or carries high risk |
| Architecture, ambiguous synthesis, long-horizon implementation, or deep research | Sol `medium`, `high`, or `xhigh` | Use higher effort only when the task or evaluation justifies it |
| Security, high-stakes review, or work where a missed issue is expensive | Sol `high` or `xhigh` | Increase effort only when the task or evaluation justifies it |

### Escalation pattern

For a bounded task, a useful pattern is:

1. Start with Luna at `low` or `medium`.
2. For harder bounded coding, compare Luna `high`/`xhigh`, Terra `high`, and Sol
   `medium` as cross-tier tradeoffs; do not always increase Luna first.
3. Let the executor use the advisor when it encounters uncertainty, a major
   decision, or a completion check that benefits from review.
4. Escalate the executor to Terra or Sol when the work itself needs more
   capability, not merely more reassurance.
5. Record whether the advisor prevented a failure or only added cost.

Do not route every task through the advisor. A Sol review can erase the cost
advantage of Luna, especially when Luna would have completed the task without
help.

## Evidence Reviewed

### Official OpenAI sources

- [GPT-5.6 model guide](https://developers.openai.com/api/docs/guides/latest-model)
  positions Sol as flagship, Terra as the balance of intelligence and cost,
  and Luna as the efficient high-volume tier. It documents the six efforts and
  recommends testing a baseline before changing effort.
- [Reasoning models guide](https://developers.openai.com/api/docs/guides/reasoning)
  describes lower effort as faster and cheaper, `medium` as the balanced
  default, `high` and `xhigh` for harder work, and `max` for the hardest
  quality-first workloads.
- [GPT-5.6 Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol),
  [GPT-5.6 Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra),
  and [GPT-5.6 Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna)
  provide current model-specific roles, capabilities, and supported efforts.
- [GPT-5.6 launch announcement](https://openai.com/index/gpt-5-6/)
  publishes OpenAI's own benchmark results and explains the three durable
  capability tiers. Treat its benchmark claims as vendor-reported evidence.

### Independent evaluation and community

- [Artificial Analysis: GPT-5.6 benchmarks](https://artificialanalysis.ai/articles/gpt-5-6-has-landed)
  reports Luna as an unusually strong cost-performance option, while Sol
  remains materially stronger on its composite intelligence index.
- [Artificial Analysis: Luna `xhigh` versus GPT-5.5 `high`](https://artificialanalysis.ai/models/comparisons/gpt-5-6-luna-xhigh-vs-gpt-5-5-high)
  reports Luna `xhigh` as substantially cheaper and faster, but lower on its
  intelligence score. This supports cost efficiency, not equivalence.
- [ARC Prize: Luna results](https://arcprize.org/results/openai-gpt-5-6-luna)
  reports that Luna `xhigh` was essentially flat with Luna `high` on
  ARC-AGI-3. Effort gains are workload-dependent.
- [Simon Willison: GPT-5.6 family](https://simonwillison.net/2026/Jul/9/gpt-5-6/)
  calls Sol highly competent but reports that it was not clearly better than
  his competing model for the complex coding tasks he tried. His pelican
  comparison is useful for seeing effort and cost differences, but is not a
  general capability benchmark.
- [OpenAI Developers on X](https://x.com/OpenAIDevs/status/2075286157186003348)
  summarizes the official routing posture: Sol for long-horizon agentic work,
  Terra for everyday work, and Luna for well-defined high-volume work.
- [Artificial Analysis on X](https://x.com/ArtificialAnlys/status/2075739292052463646)
  reports Luna and Sol on a stronger intelligence/cost frontier than Terra in
  its evaluation. Do not generalize that composite result to every task.
- [Community discussion on Luna agentic coding](https://x.com/Hesamation/status/2075602206997258353)
  reports strong Luna coding benchmark results and explicitly cautions that
  the claim is benchmark-based. Treat it as an anecdote, not a routing rule.

The community evidence is only days old. Much of it repeats launch benchmarks,
so sustained production traces are still more valuable than social consensus.

### DeepSWE v1.1 all-effort results

The [DeepSWE v1.1 benchmark](https://deepswe.datacurve.ai/blog/deepswe-v1-1)
contains 113 long-horizon software-engineering tasks with isolated committed
patch grading. The public `v1.1` trial artifact was filtered to
`source=deep-swe`, `eval_scope=full`, and `included_in_score=true`, then grouped
by model and effort. Each cell contains roughly 450 trials. Values below are
`pass@1 / average cost per task`; `none` was not tested by this benchmark.

| Model | `low` | `medium` | `high` | `xhigh` | `max` |
| --- | ---: | ---: | ---: | ---: | ---: |
| Luna | 1.5% / $0.07 | 11.3% / $0.22 | 44.2% / $0.78 | 56.9% / $1.54 | 67.2% / $3.03 |
| Terra | 24.1% / $0.43 | 35.1% / $0.58 | 53.8% / $1.13 | 60.2% / $2.13 | 69.6% / $4.95 |
| Sol | 45.4% / $1.07 | 61.1% / $1.86 | 69.4% / $3.47 | 70.7% / $4.70 | 72.7% / $8.39 |

This benchmark supports Luna `high`/`xhigh` as coding tradeoffs and Luna `max`
only for quality-first Luna runs when its measured gain justifies the cost.
Terra `high`/`xhigh` are strong sustained-implementation options, while Sol
`medium` or higher is appropriate for difficult work. It does not measure
retrieval, documentation search, summaries, or planning-only tasks, so do not
generalize the low Luna coding scores to those bounded workloads. The local
policy intentionally does not expose `max` for Terra or Sol.

## Local Observations

Use this table for evidence from real work. Keep executor and advisor results
separate so a successful task does not hide the cost of escalation.

| Date | Task shape | Executor | Effort | Advisor | Outcome | Latency/cost notes | Escalation needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-07-11 | Top-level advisor availability probe | Luna | `xhigh` | Sol `high`, called successfully | Availability confirmed; no quality conclusion | Advisor reported 21,508 tokens and `$0.000000`; treat the cost as a harness value, not billing data | N/A (probe) |
| 2026-07-11 | `delegate_general` child plus advisor | Luna | `xhigh` | Sol `high`, completed in child session `ses_0ac27a2f6ffemiy0O6BfmhzT9F` | Exported child transcript confirms an actual completed advisor call | Harness reported separate executor and advisor usage; reported costs were `$0.000000`, so treat them as harness values rather than additive billing data | No |
| 2026-07-10 | Brainstorm scout work | Sol | `low` | Not recorded as part of the scout result | Completed cache-miss profiling and grounding work | Record total executor and advisor usage on the next comparable run | Unknown |

For future entries, record the task contract, success criteria, model, effort,
whether advisor was called, whether its advice changed the outcome, total
tokens, latency, cost, and whether escalation was required.

## Maintenance Rules

- Recheck official model pages after model releases, API changes, or changes to
  the local OpenCode adapter.
- Keep official supported efforts separate from locally exposed efforts.
- Do not claim Luna `xhigh` is equivalent to Sol without a task-specific eval.
- Compare model and effort combinations on the same prompt and tool budget.
- Measure cost per successful task, not just cost per model call.
- Update runtime descriptions when the routing policy changes. Keep the Luna,
  Terra, and Sol descriptions in `profiles/personal/profile.yml` synchronized
  with this guide.
- Promote a community observation into default routing only after it survives
  representative local work.

## Local Runtime Notes

The current advisor target is configured as:

```text
opencode:openai/gpt-5.6-sol@high
```

The `delegate_general` catalog exposes Luna with `low`, `medium`, `high`,
`xhigh`, and `max`. Terra and Sol expose `low`, `medium`, `high`, and `xhigh`.
`none` is intentionally not exposed for any model.
