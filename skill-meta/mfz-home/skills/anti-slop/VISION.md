# Vision

## Problem

The upstream anti-slop skill installs files and dependencies into whichever repository is current, which prevents portable, safe diagnostics.

## Intended Behavior

Agents get concise preflight guidance before JavaScript or TypeScript edits and a read-only diagnostic checkpoint afterward or on explicit request. The pinned upstream rules and required native companion rules run against the narrowest relevant set of files or directories without inheriting target configuration. Effect-specific policy remains opt-in so other codebases do not inherit it.

Models should use deterministic tooling rather than manually reproduce readable-spacing edits. After initial read-only diagnostics, an agent with existing source-editing authority uses explicit spacing-only fixing, followed by the complete read-only checkpoint. Default and assessment-only diagnostics remain nonmutating; the formatter grants no additional scope or access.

## Success

An agent uses the launcher as a final verification checkpoint, receives all pinned upstream and companion rules at error severity, addresses in-scope diagnostics under the original implementation authority, and rejects source directives that suppress those rules in changed code. Launcher target writes remain zero except for explicit, authorized readable-spacing fixes. Those fixes do not replace diff inspection or permit remaining semantic diagnostics to pass.

## Non-Goals

- Having the launcher make automatic semantic fixes, mutate targets during default or assessment diagnostics, or modify dependencies, package manifests, or configuration.
- Weakening or changing upstream rules.
