# Log

## 2026-08-31 - Upstream v0.1.2

- Refreshed the generic and Effect plugin sources to upstream v0.1.2 commit `e8c4880471b23ab7f216fba7b27d173a6ef07d4c`.
- Adopted corrected lexical and generic alias resolution, local type-predicate call checks, and narrower handling of finite-key records, generic constraints, existence probes, and borrowed static member names.
- Kept the same 15 generic rules, opt-in Effect rule, isolated launcher configuration, and read-only target behavior.

## 2026-08-20 - Preflight Guidance

- Added one global trigger to load anti-slop before JavaScript and TypeScript edits.
- Added a compact design-oriented checklist to prevent common violations before the final diagnostic pass.
- Kept detailed diagnostics and remediation in the post-edit checkpoint.

## 2026-08-20 - Reject Source Suppressions

- Classified file-, region-, and line-level directives that suppress anti-slop rules in changed code as failed checkpoints.
- Required authorized implementations to remove in-scope suppressions and satisfy the underlying rules instead of accepting a documented bypass.
- Required blocked or assessment-only runs to report the suppression rather than claim a clean result.

## 2026-08-19 - Opt-in Effect Rules

- Added upstream's Effect service-constructor rule behind the explicit `--effect` launcher flag.
- Kept the default checkpoint generic-only so non-Effect codebases do not inherit Effect architecture policy.
- Updated the vendored provenance to upstream commit `6d538555cb151d4121ed51a27db81890eacf8ae9`.

## 2026-08-18 - Default JavaScript And TypeScript Checkpoint

- Made anti-slop the final verification checkpoint after every JavaScript or TypeScript edit batch.
- Kept the launcher read-only while allowing the surrounding authorized implementation workflow to address diagnostics.

## 2026-08-15 - Global Read-only Launcher

- Replaced the upstream repository-mutating installation workflow with a global launcher.
- Pinned Oxlint and `@oxlint/plugins` to `1.78.0`.
- Vendored upstream rules from commit `446268e5d15baa968eaec669ff65358d36ae6259` with MIT attribution.
- Isolated Oxlint configuration in a temporary directory so target configuration is not merged.
