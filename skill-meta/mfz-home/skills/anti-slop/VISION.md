# Vision

## Problem

The upstream anti-slop skill installs files and dependencies into whichever repository is current, which prevents portable, safe diagnostics.

## Intended Behavior

After every JavaScript or TypeScript edit batch, or when explicitly requested, run the pinned upstream anti-slop rules globally against the narrowest path containing the changes without allowing the launcher to change that path or load its Oxlint configuration.

## Success

An agent uses the launcher as a final verification checkpoint, receives all upstream rules at error severity, addresses in-scope diagnostics under the original implementation authority, rejects source directives that suppress those rules in changed code, and leaves all launcher target writes at zero.

## Non-Goals

- Having the launcher modify target source, dependencies, package manifests, or configuration.
- Weakening or changing upstream rules.
