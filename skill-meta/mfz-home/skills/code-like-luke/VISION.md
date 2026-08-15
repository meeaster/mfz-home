# Vision

## Problem

Long Code Like Luke prompts are easy to omit or partially load when supplied inline, especially during delegated reviews.

## Intended Behavior

When explicitly loaded, the skill provides the complete existing Code Like Luke guidance for implementation and code review without changing its content.

## Success

An agent can load `code-like-luke` by name and receive the same guidance previously supplied by the OpenCode command.

## Non-Goals

- Changing or shortening the existing guidance.
- Automatically applying the guidance to unrelated requests.
- Replacing repository-specific instructions.
