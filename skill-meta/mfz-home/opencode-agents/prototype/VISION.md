# Vision

## Problem

Design questions are often easier to judge through a runnable artifact than through prose. The prototype agent needs enough judgment to expose useful alternatives without turning throwaway work into production code.

## Intended behavior

`prototype` loads the existing `prototype` skill and follows its logic or UI branch. The caller supplies the design question, repository context, constraints, and stopping condition. The agent may plan, edit, and validate within that boundary, but it cannot recursively delegate.

Model choice is profile policy. The base profile uses Terra `max` for cost-conscious work. The Personal profile overrides it with Sol `medium` for stronger decision evidence.

## Success

The agent produces a runnable artifact that makes the design question easier to decide, exposes assumptions and uncertainty, and stops before production implementation.

## Non-goals

- Accepting the prototype's conclusion for the user.
- Converting the artifact into production code.
- Replacing the `prototype` skill's logic and UI procedures.
