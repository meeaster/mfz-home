# Log

## 2026-08-13 - Initial Design

- Made the skill model-invoked because V2 plugin work benefits from automatic
  discovery during implementation and diagnosis.
- Kept the official V2 plugin page external and normative to avoid turning the
  skill into a stale API copy.
- Recorded only loader facts absent from that page: host-provided TUI modules,
  local dependency resolution, global CLI configuration ownership, and release
  matching.
- Required fresh runtime verification because compilation does not prove plugin
  discovery, module resolution, or setup success.

## 2026-08-13 - Native TUI Evidence Revision

- Scoped the public V2 plugin page to the server surface it currently documents
  and required matching release evidence for native TUI behavior.
- Replaced the package-local-only dependency rule with the actual entrypoint
  boundary: dependencies may resolve package-locally or through a deliberate
  rendered ancestor.
- Recorded that local directory loading requires physical `tui/index.tsx`;
  package `exports["./tui"]` does not substitute for that path.
- Reversed the claim that a `Cell` or `ArrayBufferView` error proves duplicate
  UI runtimes. Isolated Drive controls exercised components, themes, Solid
  reactivity, slot input, session data, events, async updates, SDK imports,
  directory paths, explicit files, and symlinked packages without that crash on
  `0.0.0-next-17428`.
- Made an executed visible-slot assertion the native TUI completion gate after
  discovering that an unconsumed test config produced silent built-ins-only
  false negatives.

## 2026-08-13 - Lifecycle And Structural TUI Clarification

- Distinguished the optional server Effect entrypoint from the native TUI
  contract, which exposes only `setup` in `0.0.0-next-17428`.
- Kept Promise `setup` as the simple server default and reserved Effect for
  scoped fibers, finalizers, typed failures, or an existing Effect architecture.
- Recorded the deployment-safe structural TUI form: type-only SDK imports may
  keep the matching SDK in `devDependencies` when rendered runtime code has no
  SDK import.

## 2026-08-21 - Registry Schema Failure

- Recorded that optional plugin contribution fields must be omitted when absent because a present `undefined` value can fail the host Effect schema.
- Made the construction rule explicit: start with required fields, conditionally add defined optionals, and verify omitted fields with `Object.hasOwn` before registration.
- Required validation before registry insertion and fresh runtime checks beyond plugin status.
- Added model listing as a cross-service probe after a plugin reload. This catches reload failures that leave model-catalog initialization unavailable.

## 2026-08-26 - Event Feedback And Reload Cleanup

- Recorded a live failure in which an advisor plugin reviewed its own top-level advisor session and started recursive model generations.
- Required event-driven plugins to identify and exclude plugin-owned output before starting more work. A `parentID` check is insufficient for an owned top-level session.
- Required cleanup to close the exact async iterator and await the consumer task. This follows the working V2 subscription pattern and prevents hot reload from retaining duplicate consumers.
- Extended runtime verification beyond active plugin status. One trigger must cause one action after reload, plugin-owned completion must cause none, and `/api/model` must remain available after the action.
