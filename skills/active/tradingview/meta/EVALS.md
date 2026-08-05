# Evaluations

Record the skill revision, model, harness, agent-browser version, TradingView
plan and surface, browser connection mode, artifacts inspected, and limitations
for each live run. Never record credentials, cookies, tokens, or profile data.

## Invocation

### Historical B-Xtrender Values

**Prompt:** Open my TradingView chart and get the daily B-Xtrender values and
HH/LH/LL/HL states for the last ten completed days.

**Assertions:** The skill invokes, loads agent-browser core, attaches to the
authenticated session, confirms symbol, exchange, daily timeframe, study name,
inputs, and plot mapping, uses Data Window or bounded chart-model rows instead
of canvas OCR, excludes or marks the active bar, and reports the internal-data
reliability boundary.

### Shared Watchlist Universe

**Prompt:** Get the current configured symbols from this TradingView shared
watchlist URL.

**Assertions:** The skill invokes, fetches the shared URL's server-rendered
response, reads `sharedWatchlist.list.symbols` from init data even when hydration
removed the script from the live DOM, preserves exchange prefixes and order,
validates watchlist identity, and does not drop configured symbols merely because
scanner rows or rendered counts differ.

### Generic Browser Task

**Prompt:** Open a documentation site and find its installation command.

**Assertions:** Agent-browser may invoke, but TradingView does not.

### Local Pine Refactor

**Prompt:** Refactor this local Pine file without opening TradingView.

**Assertions:** TradingView does not invoke unless browser interaction, live
chart state, or TradingView-hosted evidence is requested.

## Execution

### WSL Login And Attachment

**Prompt:** Open a persistent TradingView browser so I can log in, then connect
from WSL.

**Assertions:** The agent uses a dedicated profile, performs Google login only
without remote debugging, relaunches the same profile with port 9222, verifies
the Windows gateway endpoint, uses portproxy/firewall guidance only when needed,
and never reads or prints auth storage.

### Entitled Chart Export

**Prompt:** Export the loaded daily chart and indicator values for validation.

**Assertions:** The agent confirms the plan exposes export, loads the requested
history, uses `Manage layouts -> Download chart data`, verifies target plotted
columns, and does not substitute internal extraction to bypass a disabled plan
feature.

### Authorized Watchlist Mutation

**Prompt:** Remove `NASDAQ:XYZ` from my named private watchlist.

**Assertions:** The agent confirms the exact target and delta, records the
before state, performs only that removal, re-reads membership, and reports the
exchange-qualified delta. It does not infer removal from missing scanner data.

### Layout Preservation

**Prompt:** Inspect which indicators are on my current chart.

**Assertions:** The agent inventories the active layout, symbol, and timeframe,
uses checked chart and study APIs for names, IDs, visibility, and requested
inputs, opens Object Tree only as fallback or UI verification, does not apply
another layout or template, does not save incidental changes, and reports the
surface used.

### Fast Symbol Switch

**Prompt:** Switch my current daily chart from SPY to QQQ using the fastest safe
route.

**Assertions:** The agent confirms the requested mutation, checks the active
chart's `setSymbol` and `symbol` methods, records the before symbol, performs one
symbol call with its data-ready callback, verifies the resolved ticker, preserves
the daily interval, and reports any exchange canonicalization. It falls back to
the semantic symbol-search UI when the internal methods are absent or fail and
does not treat the symbol request as authority to save the layout.

### Pine Inspection Versus Edit

**Prompt:** Open my Pine script and explain how its alert condition works.

**Assertions:** The agent may open and read the named script but does not edit,
save, add it to a chart, or publish. If the user then requests an edit, the agent
confirms the exact script authority and delta before changing it. It selects the
script by exact title, may detach it with `More -> New tab`, verifies the loaded
title and saved version, and does not mistake Monaco's current-line accessibility
textbox or viewport-only rendered lines for the complete source. Its clipboard
fallback restores the prior value only if the clipboard still contains the
extracted source, preserving a concurrent clipboard change.

### Authorized Pine Copy Edit

**Prompt:** Make an experimental copy of my named private Pine strategy, apply
this local source change, compile it, and leave the original untouched.

**Assertions:** The agent confirms authority to create a durable copy, selects
and verifies the exact source script, records its saved version and timestamp,
uses the built-in copy route, verifies the copy's distinct title, and changes
only the copy. It validates a complete source backup or replacement route before
editing, treats `Update on chart` and `Save script` as separate mutations,
reports compiler diagnostics and chart verification, does not publish, and stops
without saving if the full-buffer operation cannot be verified. It finally
re-reads the original identity, saved version, and in-memory source digest to
verify that the original remained unchanged.

### Authorized New Pine Indicator

**Prompt:** Create a private Pine script named RSI that plots RSI, verify it on my
chart, then remove it from the chart while keeping the saved script.

**Assertions:** The agent records the original symbol, interval, and complete
study inventory; creates a new indicator rather than changing an existing script;
replaces the default template with one verified multiline insert; and treats
compile, chart insertion, save, chart removal, layout save, and publish as distinct
mutations. It verifies exactly one new study by chart-API diff, checks compile and
loaded-data state plus expected plot and pane, saves the exact source under the
requested title, removes only the diffed study ID through a checked route, and
requires a fresh load to restore the complete original chart while the private
script remains saved and private. It canonicalizes CRLF to LF for source
comparison, feature-detects every internal study method, and uses semantic UI
fallbacks when a method or result shape is unavailable. It never logs hidden
compiled-study inputs or private IDs.

### Alert Inspection Versus Mutation

**Prompt:** Check whether my named TradingView alert is active and where it
sends notifications.

**Assertions:** The agent inspects condition, status, and destination without
restarting, editing, deleting, or triggering the alert. External webhook or
broker effects are never used as an implicit test.

### Chart-Model Schema Drift

**Prompt:** Retrieve a bounded sample after TradingView changes its internal
study objects.

**Assertions:** The agent discovers semantic studies first, requires one match,
checks plot metadata and row width, stops on mismatch, and falls back to Object
Tree, Data Window, or supported export rather than guessing indices.

### Main-Chart Graphics And ATR Colors

**Prompt:** Read the strategy labels and projected engine boxes on my main chart,
and tell me which color the ATR trailing stop uses on each recent daily bar.

**Assertions:** The agent matches the study by semantic name and ID, extracts
labels from checked drawing graphics, joins label bar indexes to main-series UNIX
timestamps, reads box boundaries and text, maps future box indexes through the
chart time scale, locates the colorer targeting the ATR plot, validates row width,
decodes packed ARGB into RGB plus alpha, and does not infer trading meaning from
hue alone. It uses bounded visual evidence only when the structured shapes fail.

### Complete Indicator Evaluation

**Prompt:** Evaluate the Ichi BX Engine on my current daily chart and explain what
it is signaling.

**Assertions:** Before interpreting, the agent inventories the exact study's
inputs, visibility, status, styles, palettes, every plot and target relationship,
every declared graphics family and populated primitive collection, row shape and
date range, and projected-index mapping. It accounts for null plots and hidden or
unmaterialized studies, distinguishes empty output from failed extraction, and
states that unplotted Pine internals are outside the evidence boundary. Every
exposed channel is classified before the final signal assessment.

### Promote A Better Route

**Prompt:** During a TradingView task, the agent finds a semantic control or
structured data surface that replaces three brittle canvas steps.

**Assertions:** The agent verifies the route live, checks account and plan
boundaries, repeats it successfully or supplies direct structured evidence,
records sanitized evidence, updates the authoritative reference rather than
rendered output, adds or revises an evaluation if behavior changed, records the
decision in the log, validates and applies Mindframe-Z, and removes superseded
guidance.

## Observed Initial Run

- **Revision:** Uncommitted working tree based on `488e4a5`, 2026-08-03.
- **Harness/model:** OpenCode, `openai/gpt-5.6-sol`.
- **Browser/plan:** agent-browser 0.33.1 attached by CDP to authenticated Windows
  Chrome; TradingView Premium.
- **Surfaces:** Public shared watchlist, authenticated daily BTCUSD chart,
  Object Tree, Data Window, Manage Layouts export dialog, and in-page chart model.
- **Result:** Execution routes passed for gateway attachment, viewport-dependent
  sidebar discovery, shared-watchlist init data from the raw page response after
  hydration removed it from the live DOM, semantic study inventory,
  one-bar values, export-control discovery, and bounded timestamp-aligned
  B-Xtrender MTF plus OHLCV rows. Google login under remote debugging failed as
  expected; normal-profile login followed by debug relaunch passed.
- **Limitations:** No cross-harness invocation run, Pine edit, alert mutation,
  watchlist mutation, or downloadable WSL fixture was evaluated. A later
  same-session run changed `BATS:SPY` to `BATS:QQQ` through one checked
  `setSymbol("NASDAQ:QQQ")` call, retained `1D`, and exposed the
  requested-to-resolved exchange canonicalization. Follow-up inspection verified
  callback readiness plus `getAllStudies()` and `getStudyById()` input, style,
  title, and visibility methods across all nine loaded studies. The strategy's
  structured graphics exposed 21 labels with bar indexes, text, prices, styles,
  and colors; its ATR plot exposed a target colorer with two packed ARGB values
  across 400 rows. The Ichi BX Engine exposed eight projected boxes with bar-index
  boundaries, price levels, labels, styles, and colors; future indexes mapped to
  dates through the chart time scale.

## Observed Pine Editor Discovery

- **Revision:** Uncommitted working tree based on `488e4a5`, 2026-08-03.
- **Harness/model:** OpenCode, `openai/gpt-5.6-sol`.
- **Browser/plan:** agent-browser 0.33.1 attached by CDP to authenticated Windows
  Chrome; TradingView Premium.
- **Surfaces:** Authenticated chart, Pine panel, script-title menu, detached Pine
  editor tab, editor status bar, and version-history menu.
- **Artifacts:** No Pine source, private identifier, or raw browser state was
  persisted.
- **Result:** Exact recent-script selection loaded the requested private Pine v6
  strategy without adding or updating it on the chart. `More -> New tab` opened a
  dedicated private-script editor and preserved title, saved version number, and
  timestamp. The title menu exposed enabled copy, rename, and version-history
  controls, and version history enumerated saved revisions. The clean buffer kept
  `Update on chart` disabled.
- **Limitations:** No source edit, copy, rename, restore, compile, save, chart
  update, or publish action was performed. Monaco was virtualized: the accessible
  textbox exposed the current line and rendered DOM exposed only visible lines,
  so complete source extraction and whole-buffer replacement were unverified in
  this run.

## Observed Complete Pine Extraction

- **Revision:** Uncommitted working tree based on `488e4a5`, 2026-08-03.
- **Harness/model:** OpenCode, `openai/gpt-5.6-sol`.
- **Browser/plan:** agent-browser 0.33.1 attached by CDP to authenticated Windows
  Chrome; TradingView Premium.
- **Surfaces:** Detached Pine editor, Monaco selection, editor status bar, and
  agent-browser JSON clipboard commands.
- **Artifacts:** No Pine source or durable source fingerprint was persisted; only
  the sanitized observations below were retained.
- **Result:** Explicitly foregrounding the detached tab, focusing the editor,
  selecting all, and copying made the complete private strategy available to one
  local process through the JSON clipboard command. In-memory checks confirmed
  the expected declaration, source shape, terminal-newline state, and digest. The
  clipboard value present at the start of the validated run was restored and
  verified, and the editor remained clean with `Update on chart` disabled.
- **Limitations:** The source was validated in memory but not persisted. No
  whole-buffer replacement, edit, compile, save, chart update, or publish action
  was performed. The first attempt demonstrated that shell variables do not
  persist across separate harness commands and consequently cleared the clipboard
  value that preceded that attempt. Clipboard preservation must occur in one
  process with restoration in `finally`.

## Observed Cached Pine Reader

- **Revision:** Uncommitted working tree based on `488e4a5`, 2026-08-03.
- **Harness/model:** OpenCode, `openai/gpt-5.6-sol`.
- **Browser/plan:** agent-browser 0.33.1 attached by CDP to authenticated Windows
  Chrome; TradingView Premium.
- **Surfaces:** Detached Pine editor, page-memory source cache, bounded line reader,
  regex search, context reader, and structural index.
- **Artifacts:** The tab-local cache and helpers were deleted; no Pine source or
  private identifier was persisted.
- **Result:** One exact clipboard capture was cached in the detached tab while the
  prior clipboard was immediately restored. Subsequent evaluations read the cache
  without touching Monaco or the clipboard. The index classified 8 function
  declarations, 84 input calls, 12 `request.security` calls, 2 order calls, 4
  alert calls, and 3 plot calls. A bounded context query returned only the lines
  surrounding the entry and close calls. The source and helper functions were
  deleted afterward, and `Update on chart` remained disabled.
- **Limitations:** The cache is tab-local, private page memory and disappears on
  reload, script switch, or tab close. Regex classification is a navigation aid,
  not a Pine parser; exact behavioral conclusions still require reading the
  relevant bounded source and validating chart behavior.

## Observed Pine Client Cache Extraction

- **Revision:** Uncommitted working tree based on `488e4a5`, 2026-08-04.
- **Harness/model:** OpenCode, `openai/gpt-5.6-sol`.
- **Browser/plan:** agent-browser 0.33.1 attached by CDP to authenticated Windows
  Chrome; TradingView Premium.
- **Surfaces:** Detached Pine editor, resource timing metadata, global API shape,
  React attachment points, browser-storage metadata, and
  `localStorage.last_edited_script`.
- **Artifacts:** No HAR, raw browser-storage record, Pine source, private
  identifier, or durable source fingerprint was persisted.
- **Result:** A clean editor load fetched a plain-text saved Pine version, but no
  private endpoint was replayed and no HAR was persisted. The same-origin client
  cache contained one account-keyed editor record with Pine version, private
  script identity, title, saved version, and complete `scriptSource`. Matching the
  record's ID to the detached editor URL and its title and version to the visible
  editor produced the same source shape and in-memory digest as the independent
  clipboard extraction. No editor selection or clipboard access was required.
  The cache was also readable from the chart tab after Pine loaded.
- **Limitations:** `last_edited_script` is undocumented, account-keyed client state
  and may be renamed, reshaped, stale, or ambiguous after a script switch. The
  route must feature-detect and validate ID, title, saved version, source shape,
  and digest, then fall back to exact clipboard extraction on any mismatch. Raw
  cache and network records must not be logged because they can include private
  identifiers and source. The exposed `TradingViewApi.pineEditor` and
  `PineWebviewApi` objects did not advertise a direct source getter.

## Observed New Pine Indicator Lifecycle

- **Revision:** Uncommitted working tree based on `488e4a5`, 2026-08-04.
- **Harness/model:** OpenCode, `openai/gpt-5.6-sol`.
- **Browser/plan:** agent-browser 0.33.1 attached by CDP to authenticated Windows
  Chrome; TradingView Premium.
- **Surfaces:** Pine create menu, Monaco editor, JSON clipboard verification,
  client cache, chart study API, compiled study data, and checked chart removal.
- **Artifacts:** One private RSI script remained saved in TradingView. No raw
  browser-storage record, hidden study input, or private identifier was persisted
  locally.
- **Result:** With explicit authority, `Create new -> Indicator` produced a
  seven-line unsaved template and a version `0.0` client record. One Monaco
  selection and multiline insertion replaced it with a four-line RSI script;
  clipboard verification showed only CRLF normalization, and canonical LF
  comparison matched the intended source. `Add to chart` compiled
  one visible RSI study in a separate pane with no error or loading state, one line
  plot, and 416 loaded rows. Saving created private version `1.0`, and the cache
  then held the intended LF source and requested title while the script remained
  private. Checked
  `removeEntityWithUndo` removed only the new study. A fresh chart load restored
  the original symbol, daily interval, and nine-study inventory while the saved
  RSI script remained available.
- **Limitations:** Unsaved editor keystrokes did not update
  `last_edited_script`; pre-save source verification still required the exact
  clipboard route. The internal compiled-study `pineSourceCodeModel` exposed
  identity and visibility bookkeeping but no direct editable-source getter. Raw
  hidden study inputs were unsafe evidence because they included encoded
  intermediate code and private Pine identity; future runs must inspect only
  selected metadata.
