# Vision

## Problem

AI-consumed instructions are behavioral control artifacts. Small wording or packaging changes can alter invocation, authority, tool use, delegation, and completion behavior, while a general implementation worker may treat them as ordinary prose. The user wants Sol/medium judgment for this recurring class of mutation.

## Intended behavior

`agent-author` is a Sol/medium mutation-capable specialist for skills, agent and command definitions, AGENTS.md and CLAUDE.md guidance, system prompts, routing descriptions, maintained prompt packages, and their authoring records. It loads `writing-for-agents` for every task, adds `skill-authoring` when the artifact has an authoring lifecycle, and loads platform guidance for platform-specific assets.

The agent resolves intended behavior before finalizing prose, including invocation, authority, adjacent cases, failure conditions, and observable evaluations. It keeps runtime context focused, maintains the owning authoring record, follows destination instructions, and validates through the real render or execution path when available.

The role requires explicit mutation authority. Design discussion remains in the primary session or `architect`; ordinary application mechanics remain with `worker`; independent approval remains with `reviewer`. Mixed work is split when the AI-facing contract and application mechanics can be changed independently.

## Success

Parents route AI-facing behavioral artifacts to one model-specialized lane and receive coherent runtime instructions, maintenance records, and validation evidence without making the general worker or primary session carry specialized authoring doctrine.

## Non-goals

- General application implementation or product architecture.
- Ordinary user documentation merely because an agent may read it.
- OpenSpec product requirements owned by their OpenSpec workflow.
- External-system operations, publication, commits, or deployment without separate authority.
- Independent review or approval of its own output.
