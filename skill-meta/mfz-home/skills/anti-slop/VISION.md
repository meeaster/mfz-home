# Vision

## Problem

The upstream anti-slop skill installs files and dependencies into whichever repository is current, which prevents portable, safe diagnostics.

## Intended Behavior

When explicitly invoked or clearly requested by a code-quality task, run the pinned upstream anti-slop rules globally against a supplied TypeScript or JavaScript path without changing that path or loading its Oxlint configuration.

## Success

An agent can run the launcher, receive all upstream rules at error severity, and report findings while the target remains byte-for-byte unchanged.

## Non-Goals

- Modifying target source, dependencies, package manifests, or configuration.
- Automatically invoking on ordinary coding tasks.
- Weakening or changing upstream rules.
