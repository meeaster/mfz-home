# Vision

## Problem

An accepted design in the current session can be ready for implementation without needing a durable OpenSpec change. Implementing it in the design conversation consumes coordinator context, while asking a worker to rediscover the design risks changing accepted behavior.

## Intended Behavior

`implement-design` converts the accepted current-session design into one self-contained execution brief and delegates exactly one fresh native `worker`. The coordinator preserves accepted decisions, resolves material rule interactions before delegation, and asks the user when those rules leave consequential behavior ambiguous.

The command creates no planning artifact and runs no OpenSpec workflow. The worker receives the problem, intended outcome, acceptance criteria, decisions, scope, non-goals, workspace, dirty baseline, implementation approach, validation, and blocker policy. It implements only that brief and returns changed files, validation outcomes, and unresolved issues.

The coordinator compares the result and current diff with the brief. Worker self-report is evidence rather than acceptance. The command does not commission remediation or independent review; the user can request either separately.

## Success

One explicit invocation preserves the accepted design across a fresh native worker boundary, produces a bounded implementation and focused validation, and returns a coordinator-checked outcome without creating durable planning material or a delegation loop.

## Non-Goals

- Discovering or redesigning behavior that the session has not settled.
- Creating or updating OpenSpec artifacts.
- Delegating more than one worker, retry, remediation, or review.
- Treating the worker handoff as proof of acceptance.
