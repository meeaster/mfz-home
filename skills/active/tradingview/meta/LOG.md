# Log

## 2026-08-03 - Initial TradingView Field Guide

- Chose model invocation because agents should automatically load TradingView
  guidance whenever browser work targets charts, watchlists, studies, alerts,
  Pine, exports, or loaded indicator data.
- Layered the skill on agent-browser instead of copying generic browser commands;
  the TradingView package owns site routes and safety boundaries.
- Made inspection the default and kept layout, Pine, alert, watchlist, publish,
  broker, and trading mutations under explicit human authority.
- Recorded the WSL Windows-gateway CDP route after localhost auto-discovery failed
  despite a reachable Windows Chrome debugging endpoint.
- Recorded a normal-login then remote-debug relaunch because Google rejected
  identity-provider login while debugging was active.
- Promoted shared-watchlist init data after it returned the configured universe
  directly and avoided virtualized-row scraping plus scanner count discrepancies.
- Read shared-watchlist init data from a same-origin fetch of the server-rendered
  page after live validation showed hydration removes the script from the DOM.
- Promoted Object Tree for study inventory and Data Window for one-bar values.
- Promoted bounded chart-model discovery for validation after a live chart
  exposed 400 timestamped B-Xtrender MTF rows and aligned OHLCV, while retaining
  supported export and Data Window as verification surfaces.
- Required current-bar classification because the active daily B-Xtrender value
  changed during the same inspection session.
- Added an explicit promotion test so future learning replaces slower recipes
  only after live verification and does not accumulate as sediment.
- Recorded the user's standing authority to promote validated improvements, with
  a repeat-or-structured-evidence gate before changing the authoritative home.
- Narrowed chart-model extraction to bounded values already loaded and visible;
  it must stop rather than emulate export when the plan disables bulk export.
- Added explicit layout, indicator, Pine, and alert authority routes so every
  model-invoked branch has a runtime boundary and evaluation coverage.
- Promoted checked `activeChart().setSymbol(...)` as the fastest authorized
  symbol route after it changed `BATS:SPY` to `BATS:QQQ` in one call while
  preserving `1D`. Kept semantic symbol search as fallback and required reporting
  the resolved exchange because `NASDAQ:QQQ` canonicalized to the BATS feed.
- Adopted the user's API-first direction for browser automation: prefer checked
  `TradingViewApi` methods over UI sequences once live evidence, verification,
  authority, and fallback are present. Kept private backend protocols, session
  extraction, entitlement bypasses, and standalone market-data use out of scope.
- Replaced UI-first study inventory with checked `getAllStudies()` and
  `getStudyById()` methods after all nine loaded studies exposed matching input
  metadata and values plus title, visibility, and style APIs. Object Tree remains
  the fallback and UI-visible-settings verification surface.
- Replaced symbol polling with the live `setSymbol(symbol, callback)` readiness
  callback after its two-argument shape and callback completion were verified.
- Promoted structured label and dynamic-color extraction after the loaded strategy
  exposed 21 `dwglabels` and an ATR-targeting colorer across 400 rows. Label bar
  indexes were joined to main-series timestamps, and packed ARGB values were
  decoded without assigning unverified trading semantics to their hues.
- Extended structured graphics extraction to projected `dwgboxes` after the Ichi
  BX Engine exposed eight boxes with text, price boundaries, styles, and colors.
  Future bar indexes are mapped with `timeScale().indexToTimePoint()` rather than
  an assumed trading calendar.
- Made indicator evaluation exhaustive within the loaded chart surface after
  plot-only inspection missed meaningful engine boxes. Every exposed input, plot,
  colorer, style, palette, graphics family, primitive collection, visibility, and
  row-availability state must now be accounted for before interpretation.
