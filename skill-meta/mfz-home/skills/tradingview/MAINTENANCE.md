# Maintenance

## Dependencies

The runtime dependency is the model-invoked `agent-browser` skill and its
version-matched `agent-browser skills get core` guidance. TradingView UI labels,
plan features, server-rendered init data, and in-page chart internals are external
dependencies that may change independently.

The authoritative source is
`/home/mark/workspace/repos/mfz-home/skills/active/tradingview/`.
Rendered copies under `~/.mindframe-z/configs/` and harness skill directories are
outputs and must not be edited.

## Evidence Order

Prefer official TradingView documentation for plan and supported-feature claims.
Prefer live, feature-detected in-page APIs and server-rendered structured state
for current behavior, with semantic UI as the fallback and verification surface.
Treat chart-model properties, generated classes, data attributes, and row layouts
as observed implementation evidence, not contracts. Use session traces and
bounded output samples to substantiate efficiency claims.

## Promotion Test

A discovered method belongs in runtime guidance only when all are true:

- it succeeds twice against the intended live TradingView surface, or succeeds
  once with direct structured evidence that independently verifies the result;
- it removes meaningful retries, ambiguity, or accidental-state risk;
- its account, plan, symbol, timeframe, and mutation boundaries are known;
- it has a semantic selector, structured schema, or repeatable discovery step;
- it includes a verification signal and failure fallback;
- it does not expose secrets or bypass an entitlement.

One-off selectors, unexplained minified properties, and unsuccessful probes stay
out. When an internal property is promoted, pair it with live shape discovery
and a supported UI fallback.

Compare old and candidate routes against the same surface when practical. Keep sanitized run evidence, plan boundaries, and limitations with the affected [evaluations](EVALS.md); keep branch mechanics in the owning runtime reference. Follow destination guidance for activation rather than preserving an apply command here.

## Refresh Triggers

Revalidate the affected branch when agent-browser changes its CDP, profile,
download, snapshot, or eval behavior; when TradingView renames semantic controls;
when a plan changes feature availability; when watchlist init data disappears;
or when `activeChart` symbol, study inventory, study input, drawing-graphics,
colorer, declared-output inventory, or chart-model methods fail. Prune stale
routes during the same change.
