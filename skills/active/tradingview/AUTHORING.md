# tradingview

## Intent

A field guide that makes agents efficient at reading and operating TradingView (charts, watchlists, studies, the Data Window, Pine, alerts, exports) through Browser Control, without trial and error. Grew out of validating home-built B-Xtrender and ATR calculations against TradingView, and keeps evolving: when an agent finds a better verified route, the guide gets it.

Not for: treating TradingView internals as a stable market-data API, building a client for its private backend, bypassing plan or export limits, handling login credentials, or trading.

Success: the agent attaches to the intended session, gets the evidence or performs the authorized change without thrashing, and reports enough chart context (symbol with exchange, timeframe, study inputs, bar state, surface used) that another run can reproduce it.

## Scenarios

- **"Get the daily B-Xtrender values and HH/LH/LL/HL states for the last ten completed days"**: confirms symbol, exchange, timeframe, study, and plot mapping; uses Data Window or bounded chart-model rows instead of OCR; marks the active bar.
- **"Get the symbols in this shared watchlist URL"**: reads the server-rendered init data even after hydration removed it, keeps prefixes and order.
- **"What indicators are loaded?"** / **"Evaluate this indicator"**: accounts for every input, plot, colorer, label, box, line, and visibility state before interpreting it.
- **"Switch to QQQ"**: checked `setSymbol` with its readiness callback, reporting the resolved exchange.
- **Read or create a Pine script**: exact-title selection, client-cache extraction with digest checks; saving, publishing, and chart changes only with authority.
- **Login from WSL**: Browser Control's handoff; the human logs in; no remote-debugging ports or copied profiles.
- **Generic docs-site browsing** or **refactoring a local Pine file**: this skill doesn't load.

## Decisions

- **Model-invoked** (2026-08-03), so any browser work touching TradingView picks it up.
- **API-first** (human, 2026-08-02). Prefer checked in-page `TradingViewApi` methods and structured page state over UI sequences; TradingView has no public API, so the routes are reverse-engineered from the page. Each promoted internal route keeps live shape discovery and a semantic UI fallback.
- **The guide evolves under standing authority** (human, 2026-08-02). Agents may promote a verified improvement without asking each time; the promotion gate in `SKILL.md` keeps one-off selectors and lucky probes out.
- **Indicator evaluation is exhaustive** (human, 2026-08-02). Plot-only inspection missed the boxes the Ichi BX Engine draws.
- **No HAR captures or private-endpoint clients** (2026-08-04). The Pine client cache gives the same source without retaining authenticated traffic.
- **Credentials never touch the automation browser** (human, 2026-08-02). The human logs in through a normal handoff; Google rejects login while remote debugging is active.
- **Layered on `browser-control`** (human, 2026-09-17), which replaced `agent-browser` for browser execution; this skill owns only TradingView routes and account boundaries. Older agent-browser observations are domain evidence, not proof the current transport behaves the same.
- **Environment-specific by design** (human). It serves the human's own TradingView account and Personal home; step 5 writes promotions back to that home.

## Sources

| Source | Revision | Local use |
|---|---|---|
| TradingView web app, in-page `TradingViewApi`, server-rendered init data | observed live 2026-08-02 to 2026-08-04; unversioned | All routes in `references/`. Revalidate a branch when Browser Control changes tab adoption, handoffs, export, snapshots, or page evaluation; when TradingView renames controls or a plan changes features; or when watchlist init data, `activeChart` symbol, study inventory or inputs, drawing graphics, colorers, or chart-model methods fail. Prune stale routes in the same change |
| TradingView official docs | as needed | Plan and supported-feature claims |
