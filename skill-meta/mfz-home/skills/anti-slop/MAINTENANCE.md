# Maintenance

## Dependencies

The launcher uses the base Mise profile's `npm:oxlint` and `npm:@oxlint/plugins` major-1 packages. `npm:oxfmt` is managed in the same profile at major 0.

Upstream: https://github.com/dmmulroy/anti-slop

This skill was created from upstream commit `446268e5d15baa968eaec669ff65358d36ae6259`. Record the adopted commit here whenever the vendored rules are updated so future maintenance can compare upstream changes before aligning this skill.

## Change Procedure

1. Compare the current upstream repository with the commit recorded above and inspect its rule entrypoint and imports.
2. Replace the vendored source only with an intentional commit update; retain the upstream MIT license.
3. Keep the launcher isolated from target configuration and dependencies.
4. Update this record and `LOG.md` when behavior or provenance changes.

## Verification

Run `mfz apply --target mise`, install the configured major-version tools, verify `oxlint --version` and `mise which npm:@oxlint/plugins`, then exercise violating and clean disposable targets and confirm no target files changed.
