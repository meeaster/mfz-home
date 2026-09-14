# Vision

## Problem

Implementation often depends on exact behavior documented or implemented outside the local codebase. A research agent limited to web retrieval can waste time on brittle raw-file URLs and repeated searches when inspecting a disposable upstream clone would produce stronger evidence.

## Intended Behavior

`research` is a native OpenCode subagent for specific external documentation and upstream-source questions. Ordinary sessions may select it proactively when bounded external evidence is materially useful. The caller supplies the target, versions when known, required facts, and expected evidence. Research follows workspace source guidance and chooses the best available route, including documentation tools, web sources, APIs, canonical reference clones, and disposable public repository clones.

The custom prompt keeps research evidence-gathering-only and focused on facts the parent can use. Broad tool and skill access lets the model select an effective route without a brittle capability allowlist. It may create disposable research scratch beneath `/tmp/opencode/research/` and explicitly assigned evidence beneath `/tmp/opencode/orchestrator-workspaces/`; authoritative projects, canonical references, external systems, and upstream repositories remain unchanged. Delegation, todo management, and direct questions remain denied. Permission or skill loading grants no mutation authority.

Local project reads identify an external dependency, version, protocol, or upstream target. `explore` owns static discovery in the caller's local workspace. Research owns public upstream source investigation, including cross-file and history analysis in a temporary clone. `inspect` owns current or command-derived state in the caller's repositories, runtimes, cloud, deployments, and work systems. The parent owns product decisions, implementation design, planning, and code changes.

Research prefers authoritative sources, adapts its route when retrieval fails, avoids equivalent repeated searches, and stops when the requested facts are adequately supported. Missing evidence is reported rather than hidden behind an open-ended search chain.

## Success

Research returns a compact direct answer with exact APIs or configuration, constraints, examples, pitfalls, source locators, and material uncertainty. The parent can use the result without repeating the search or removing implementation recommendations, while local discovery and decision authority remain in their owning roles.

## Non-Goals

- Reading whole OpenSpec changes or implementation plans.
- Mapping local files, functions, tests, or implementation order.
- Choosing product behavior or architecture.
- Changing authoritative local or external state, delegating, or using broad capability for work outside evidence gathering.
- Collecting extra sources after the requested facts are adequately supported.
