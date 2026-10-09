# External research

## The ask

"OpenCode apparently changed the explore subagent to allow bash. Is that change done, and is it in the version we're running?"

## What should happen

1. A researcher establishes the version in use (here, `opencode --version`) and finds the change in authoritative sources: the upstream repository, release tags, release notes. It can use the local reference clone or clone into `/tmp/opencode/research/`.
2. It returns the answer, the commit and the first release containing it, what the change does, and its uncertainty. Version-sensitive findings name the commit or tag inspected.
3. Where the answer touches local configuration, the orchestrator follows up: does anything in Mark's config override it?

## What must not happen

- The answer rests on a search snippet or model memory rather than the source.
- The researcher changes the reference clone or local configuration.

## Done looks like

A direct answer, tied to a commit and release, with what it means for Mark's setup.
