# Vision

## Problem

Applying an OpenSpec change benefits from early local and external facts, but parallel assistants can accidentally decide implementation direction or duplicate one another. Sending the whole change to Research also encourages a documentation specialist to inspect local seams and produce implementation plans.

## Intended Behavior

`apply-spec` loads authoritative Apply context and pre-implementation quality guidance, then uses `explore` for current codebase evidence. It invokes `research` in parallel only when the coordinator extracts a concrete external documentation or upstream-source question from the change.

Explore reads the change and reports local architecture, patterns, seams, tests, and relevant files at a caller-selected thoroughness. Research receives only exact external questions, identifiers, versions, and expected evidence; it does not read the OpenSpec change or discover local implementation seams.

Both agents report evidence and uncertainty without choosing implementation direction. The coordinator integrates their facts, preserves OpenSpec authority, and owns design and implementation decisions.

## Success

The coordinator receives complementary local and external evidence early enough to implement the change, avoids unnecessary Research calls, and does not need to remove agent-authored implementation plans or reconcile competing recommendations.

## Non-Goals

- Producing a full implementation plan or delegating implementation.
- Running a code review before implementation.
- Invoking Research when the change contains no concrete external question.
- Asking Research to read or interpret the entire OpenSpec change.
