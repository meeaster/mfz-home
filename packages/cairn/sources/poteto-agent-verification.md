# poteto on agent-written code: verification and codebase-as-memory

Views from a series of posts by poteto ([x.com/poteto](https://x.com/poteto)), author of
[pstack](https://github.com/cursor/plugins/tree/main/pstack). She works at Cursor, is on the
React core team (React Compiler), and has worked at Meta and Netflix.

## "Good Code" is rare, and most software doesn't need it

- Good Code is **correct**, **bug-free**, and **fast and cheap to run**.
- Guaranteeing all three has always been expensive, because code couldn't cheaply be formally
  verified. That's why hard software (embedded, mission-critical) costs so much: you may get
  one chance to be right.
- Most software isn't Good Code and doesn't need to be. Teams accept some bugs in exchange for
  velocity and rely on tests and observability with an incremental approach. That's fine.
- Codebases have always contained slop, including human slop. "Slop" often just means "code I
  didn't write." Most engineers couldn't recognize or write Good Code.
- Agents won't produce Good Code either, but they can produce code that is better on average
  at scale.

## Clean code is a weaker priority than it used to be

- Readability and indirection cost performance. That was acceptable because of Moore's Law and
  because most code isn't on the hot path.
- Those principles optimized for humans maintaining code. With agents writing the code, that
  priority makes less sense.
- She expects new principles to emerge: **agent-friendly architecture**.

## Verification is the entry point to the agentic loop

- Give the agent a way to verify its own work, most commonly by **running and interacting with
  it like a real user**, whether the interface is a CLI, API, UI, or something else. Agents
  can also model the problem in TLA+ to look for state-machine bugs.
- The agent should produce an **artifact** showing that:
  1. the work is correct,
  2. it matches what you intended, and
  3. it's easier to review than the whole PR (for UI work, usually video or screenshots).
- Skill packs are optional extras. A way for agents to verify their own work is all you need to
  start using them more autonomously.
- Caveats: not every domain is easy to verify yet, and verification is an approximation that
  can be wrong. Trusting it is like trusting that a human actually ran the code they wrote.

## Verification skill plus feature map as team infrastructure

- [`/create-verification-skill`](https://github.com/cursor/plugins/blob/main/pstack/skills/create-verification-skill/SKILL.md)
  generates a project-local `verify-<app>` skill that teaches agents how to **run, control, and
  debug** the app. It investigates the repository and asks the user only what the code can't
  answer. It also proves the skill works once before handing it over.
- That skill includes a **feature map**: every feature in the app, how a user reaches it, and
  how to use it. Agents can then navigate the app like a real user, which greatly improves their
  ability to verify their own work.
- The feature map goes out of date quickly.
  [`/maintain-verification-skill`](https://github.com/cursor/plugins/blob/main/pstack/skills/maintain-verification-skill/SKILL.md)
  is the upkeep loop. She runs it as a **daily automation** (Cursor cloud agents) that checks
  the app for changes, covers every feature from source, and exercises every feature live.
- A strong verification skill becomes critical team infrastructure: the base for productivity
  and quality gains and for more interesting automations.

## Your codebase is memory

- Agents love extending what already exists, so the codebase acts as their memory.
- Every nit, annoyance, mistake, and bad pattern you see from agents should become a
  **constraint**. Otherwise agents keep repeating it and it spreads through the code like a
  virus.
- The constraints are the familiar ones: lint rules, compilers with good diagnostics, strong
  type systems, and LSPs. You just need more of them, and stronger ones.
- Constraints come first. Rules and skills can be added later.
- Keep observing and adding constraints until the codebase is locked down enough that an agent
  with little context can produce a high-quality PR on the first try.
- Better still, refactor or rewrite so that agent anti-patterns become **categorically
  impossible**: use the type system, choose libraries and frameworks that shrink the
  architectural search space, or build your own framework with high-quality primitives and
  well-designed APIs (as her team did for Grok bot).

## Agency

- Slop isn't something that happens to engineers. They have the tools to prevent it.
- If your productivity with and without agents isn't significantly different, you're doing
  something wrong. Getting good results from agents is the new craft of software engineering.

## Related pstack design (from its README)

- Multi-model by role: code delegates (features, refactors, bug fixes, perf) go to a cheaper
  fast model, while the hardest changes, prose, and judgment go to a stronger model. This is
  configurable in `/setup-pstack`.
- `/setup-pstack` checks whether a project has a `verify-*` skill or another harness for
  driving the app, and if not, offers to generate one.
- Stated goal: "fearless parallelism." If you trust one deeply verified agent, you can run many
  in parallel.
