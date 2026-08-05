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
- Promoted exact-title Pine script selection and `More -> New tab` as the
  least-ambiguous inspection route after a private strategy opened in a dedicated
  editor with matching title, saved version number, and timestamp.
- Recorded built-in Pine copy and version-history controls as the preferred safety
  boundary before an authorized edit, while keeping copy, rename, restore, save,
  chart update, and publish actions under explicit authority.
- Recorded that Monaco's accessibility textbox contains only the current line and
  rendered editor rows contain only the visible viewport; neither is a valid
  full-source backup or replacement route.
- Promoted full Pine source extraction through explicit tab foregrounding,
  Monaco `Control+a`, copy, and agent-browser's JSON clipboard read after the
  private strategy passed stable in-memory boundary and digest checks. Required
  fail-closed clipboard acquisition, one-process preservation, `finally`
  restoration, concurrent-change detection, and restoration verification without
  emitting private values.
- Corrected the editor status interpretation: the leading value beside the saved
  timestamp is the script version number, not a source line count. Whole-buffer
  replacement remains unverified and must be tested on a disposable copy.
- Promoted a tab-local cached reader for repeated Pine inspection after one exact
  capture supported bounded line ranges, limited regex matches, context windows,
  and a structural index without copying the full buffer again. Required digest
  verification, explicit cache deletion, and re-extraction after reload or script
  switch.

## 2026-08-04 - Pine Client Cache Extraction

- Replaced clipboard-first Pine extraction with the feature-detected
  `localStorage.last_edited_script` client record after its `scriptSource` matched
  the independent buffer in memory. Required in-page parsing, sanitized outputs,
  script ID, visible title, saved version, source-shape, and ephemeral digest
  checks, with the fail-closed clipboard route retained as fallback.
- Declined to persist a raw HAR or replay the observed private Pine endpoint.
  Resource metadata established that the saved version arrives as plain text, but
  the matching same-origin client cache removes any need to retain authenticated
  traffic or build a private backend client.
- Promoted the verified new-indicator lifecycle after one authorized RSI script
  used `Create new -> Indicator`, one whole-buffer Monaco insertion, chart-API
  compile verification, separate private save, targeted study removal, and a
  fresh-load restoration check.
- Recorded that unsaved keystrokes do not refresh `last_edited_script`, while save
  updates it with exact source, title, user identity, and version. Kept exact
  clipboard verification as the pre-save fallback and required canonical LF
  comparison for CRLF normalization.
- Promoted checked `getAllStudies()` diffing plus `getStudyById()` status, pane,
  plot, and data checks for compile validation, and checked
  `removeEntityWithUndo()` for removing only the newly introduced study without
  saving the layout. Required feature and shape checks plus semantic UI fallbacks
  for every undocumented study method.
- Prohibited logging raw hidden compiled-study inputs after live inspection showed
  encoded intermediate code and private Pine identity. The internal
  `pineSourceCodeModel` did not expose a direct editable-source getter.
