# Vision

## Problem

Bounded implementation and investigation work benefits from a cost-effective execution lane, but dynamic model selection through `delegate_general` does not receive OpenCode's native task presentation. Encoding workflow-specific instructions in the agent would also make one worker responsible for unrelated process policy.

## Intended Behavior

`worker` is a native OpenCode subagent for bounded implementation, focused remediation, difficult investigation, and settled design or specification execution. The parent supplies a self-contained task prompt with the task's context, scope, constraints, acceptance criteria, and expected result.

The agent has no custom system prompt. It inherits OpenCode's provider prompt and the ordinary environment, repository instructions, skills, references, and MCP context. Its configured Luna/max model is the current cost-effective execution policy, while the role-based name and behavioral boundary remain stable if that policy changes.

The native `task` guidance owns whether delegation is warranted. The worker description distinguishes this agent from other eligible subagents; it does not replace the parent's responsibility to perform small work directly, select specialized exploration or research agents, or choose independent review when needed. The worker cannot recursively delegate.

Acceptance remains with the parent or the workflow that invoked the worker. A worker result is implementation and validation evidence, not proof that its own acceptance criteria passed.

## Success

Parents select `worker` for self-contained bounded execution, provide an adequate brief, observe native child-session progress, and receive an outcome that can be checked against explicit criteria. Small direct work, specialized discovery, and independent judgment continue through their existing routes.

## Non-Goals

- Replacing `explore`, `research`, or dynamically selected models.
- Deciding when every worker result requires independent review.
- Carrying OpenSpec, command, or other workflow-specific procedure in the agent.
- Delegating merely to reach Luna/max when the current primary session can complete the small change directly.
- Recursively delegating work.
