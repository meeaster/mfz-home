# Log

## 2026-08-15 - Global Read-only Launcher

- Replaced the upstream repository-mutating installation workflow with a global launcher.
- Pinned Oxlint and `@oxlint/plugins` to `1.78.0`.
- Vendored upstream rules from commit `446268e5d15baa968eaec669ff65358d36ae6259` with MIT attribution.
- Isolated Oxlint configuration in a temporary directory so target configuration is not merged.
