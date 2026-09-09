# Vision

## Problem

The upstream anti-slop skill installs files and dependencies into whichever repository is current, which prevents portable, safe diagnostics.

## Intended Behavior

Agents get concise preflight guidance before JavaScript or TypeScript edits and a read-only diagnostic checkpoint afterward or on explicit request. The pinned upstream rules and required native companion rules run against the narrowest relevant path without inheriting target configuration. Effect-specific policy remains opt-in so other codebases do not inherit it.

## Success

An agent uses the launcher as a final verification checkpoint, receives all pinned upstream and companion rules at error severity, addresses in-scope diagnostics under the original implementation authority, rejects source directives that suppress those rules in changed code, and leaves all launcher target writes at zero.

## Non-Goals

- Having the launcher modify target source, dependencies, package manifests, or configuration.
- Weakening or changing upstream rules.
