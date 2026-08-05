# TradingView Operations

Use these routes for TradingView branches that change durable chart or account
state. A request to inspect does not authorize a mutation.

## Layouts

Read the active layout name, symbol, timeframe, and save state before opening
`Manage layouts`. Opening or switching a layout can replace the entire chart
surface; saving, renaming, copying, sharing, or creating a layout is a mutation.
Use an authorized copy for experiments. After temporary symbol or timeframe
work, restore and verify the original state unless the user requested the new
state to persist.

## Symbols

For an authorized symbol change on the active chart, the fastest observed route
uses TradingView's in-page chart object. This is undocumented, so check the live
shape and retain the semantic UI fallback:

```bash
agent-browser --cdp "<cdp-url>" eval --stdin <<'JS'
```

```javascript
(async () => {
  const requested = "NASDAQ:QQQ";
  const ticker = requested.split(":").at(-1);
  const chart = window.TradingViewApi?.activeChart?.();
  if (typeof chart?.setSymbol !== "function" ||
      typeof chart?.symbol !== "function") {
    throw new Error("TradingView symbol methods are unavailable");
  }

  const before = chart.symbol();
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("TradingView symbol change timed out")),
      10_000,
    );
    chart.setSymbol(requested, () => {
      clearTimeout(timeout);
      resolve();
    });
  });

  const after = chart.symbol();
  if (after?.split(":").at(-1) !== ticker) {
    throw new Error(`TradingView did not switch to ${ticker}; current symbol is ${after}`);
  }
  return { requested, before, after, interval: chart.resolution?.() };
})()
```

```bash
JS
```

Report the resolved exchange because TradingView may canonicalize the requested
identifier to the account's active feed. When exact exchange selection matters,
or when the methods are absent or fail, click the current-symbol button, fill the
exchange-qualified symbol in `Symbol, ISIN, or CUSIP`, press Enter, and verify the
chart header or Data Window. Neither route authorizes saving the layout.

## Indicators And Settings

Use checked study inventory and input APIs to identify the exact study and
current values; use Object Tree to confirm UI-visible settings before changing
them. Changing inputs, style, visibility, order, pane, or scale can autosave.
Record the intended field-level delta, perform only that delta, and verify the
study API plus Object Tree or Data Window after the change.

## Pine Editor

Opening Pine for inspection is read-only. Editing, saving, adding to chart,
updating an existing script, publishing, or changing visibility requires
explicit authority. Before an edit, identify the exact script and whether it is
private, shared, or published. Preserve the prior source in its authoritative
repository or an authorized copy, compile the changed script, and verify the
intended plots or alerts without publishing unless requested.

For a named private script, open the Pine panel and use the script-title menu.
Recent scripts appear as checkable items; use `Open script...` when the target is
not listed. Verify the selected title before reading source. `More -> New tab`
detaches the selected script into a dedicated `/pine/?id=USER...` editor, which
is the least ambiguous surface for extended inspection. Do not record or share
the private script identifier from that URL.

The title menu exposes `Make a copy...`, `Rename...`, `Version history...`,
`Create new`, and `Open script...`. Opening the menu and enumerating saved
versions are inspection. Making a copy, renaming, creating, restoring, or saving
a script are mutations. Before an authorized edit, verify the title, the saved
version and timestamp shown in the status bar, and that `Update on chart` is
disabled for the clean buffer. Prefer editing an authorized copy when the Pine
source is not already preserved in an authoritative local repository. After
editing a copy, re-read the original's identity and saved version and compare its
source through an in-memory digest check to verify that it remained unchanged.

The Pine editor is Monaco and virtualizes source. Its accessibility textbox
contains only the current line, and rendered `.view-line` elements contain only
the visible viewport until the full buffer is selected. Do not treat `get value`,
an ordinary accessibility snapshot, or rendered editor text as a complete source
backup.

For complete read-only extraction, first inspect the same-origin
`localStorage.last_edited_script` record after selecting the exact script. Parse
it inside the page and keep the raw record, source, title, and identifiers in page
memory; a storage command that prints raw values is not a safe route. Return only
sanitized match and shape checks. Do not hardcode its account-keyed shape. Select
the nested record whose `scriptIdPart` matches the detached editor URL and whose
title and saved version match the visible editor. Require a string
`scriptSource`, expected Pine version, and one unambiguous match. Validate source
shape, expected declaration, terminal-newline state, and an ephemeral digest
without returning their identifying values. This feature-detected client cache
returned the exact full buffer without selecting the editor, changing the
clipboard, or repeating a network request.

Treat the cache as undocumented and potentially stale. If it is absent, malformed,
ambiguous, or does not match the selected script identity and saved version, use
the clipboard fallback in one local process. Read and retain the prior clipboard
in memory first; abort before selecting source if that read fails. Foreground the
detached editor, focus its textbox, press `Control+a`, copy the selection, and
read it with agent-browser's JSON clipboard command without emitting subprocess
output. Take the exact string from `data.text`; plain-text CLI output can make a
terminal newline ambiguous. In `finally`, re-read the current clipboard and
restore the prior value only when it still equals the extracted Pine source. If
another application changed it, preserve that newer value and report that the
original could not be restored. After restoration, re-read and compare in memory.
If copy, extraction, restoration, or restoration verification fails, stop and
report the unresolved clipboard state. Never print the prior clipboard, private
Pine source, or a durable source fingerprint to the transcript or skill
artifacts. The status bar's leading number is the saved version, not the source
line count.

For repeated inspection in one tab, split the validated source into lines and add
small bounded helpers for `read(start, end)`, regex search with a result limit,
and context around each match. Build a structural index for functions, inputs,
order calls, alerts, `request.security` calls, and plots. Return only requested
line ranges, match metadata, or bounded context instead of sending the complete
source across the browser boundary again. If helper state is added to the page,
delete it before closing the tab and assume it is invalid after any reload or
script switch.

For an authorized new or disposable script, first record the chart symbol,
interval, and exact study inventory. Use `Create new` and choose the script type.
The default template immediately replaces `last_edited_script` with an unsaved
version `0.0` record, but later editor keystrokes do not update that cache until
save. To replace the template, focus Monaco, press `Control+a`, and use one
multiline `keyboard inserttext`. Verify the selected buffer before compiling;
Monaco may normalize inserted LF line endings to CRLF. Compare source after
canonicalizing CRLF to LF and reject every other difference.

Treat `Add to chart` or `Update on chart` and `Save script` as separate mutations.
After compile, feature-detect `activeChart().getAllStudies()` and validate its
result shape before diffing against the baseline and requiring exactly one
intended study. Feature-detect the checked study API before using it to confirm
title, visibility, no compile error or loading state, a populated data length,
expected pane, and plot metadata. Fall back to semantic Object Tree, pane, and
Data Window checks when those methods are absent or malformed. Do not log raw
hidden study inputs: they can contain encoded intermediate code and private Pine
identity. The internal `pineSourceCodeModel` exposes identity and editor-status
state but no direct editable-source getter.

After save, require the client cache to contain the canonically equal source,
requested title, new user-script identity, and a nonzero saved version, and verify
that the script remains private rather than published or shared. When temporary
chart verification should not persist, feature-detect
`activeChart().removeEntityWithUndo`, validate the method and target, and remove
only the newly diffed study ID. Fall back to exact semantic study controls when
the method is unavailable. Verify the complete original study inventory, symbol,
and interval. Do not save the layout. Never infer publishing authority from
permission to edit or save.

## Alerts

Use the Alerts sidebar to inspect names, symbols, conditions, status, expiration,
and notification destinations. Creating, editing, restarting, stopping, cloning,
or deleting an alert is a mutation. Preview the exact condition and destination
before confirmation. Do not trigger a webhook, broker route, email, or other
external effect as a test unless that effect is explicitly authorized.

## Unrecorded Operations

Start with a fresh interactive snapshot and semantic controls. Re-snapshot after
every dialog or page change. If a verified selector or structured state removes
material retries, follow the field-guide improvement step after the user operation
is complete; never experiment with skill maintenance while a live financial
mutation is pending.
