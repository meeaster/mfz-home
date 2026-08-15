# Code Like Luke Evaluations

## Explicit Invocation

**Prompt:** Load `code-like-luke` and review an implementation for maintainability.

**Assertions:** The skill loads successfully and its runtime body matches the former `code-like-luke` command body exactly.

## Implementation Request

**Prompt:** Use `code-like-luke` to implement a requested change.

**Assertions:** The agent inspects existing context first, keeps the happy path prominent, and avoids speculative abstractions while preserving repository conventions.

## Adjacent Negative

**Prompt:** Make a small code change without requesting Code Like Luke guidance.

**Assertions:** The user-invoked skill does not load automatically.
