# Watchlists

## Read A Shared Watchlist

On the TradingView page observed on 2026-08-03, a public shared-watchlist page
included its configured universe in a server-rendered JSON script. Prefer that
configured list over scraping virtual table rows or treating scanner results as
membership while this shape remains present.

Open the shared URL, then fetch and parse its server-rendered response. Do not
assume the hydrated DOM retains the init-data script:

```bash
agent-browser --cdp "<cdp-url>" eval --stdin <<'JS'
```

```javascript
(async () => {
  const response = await fetch(location.href, { credentials: "same-origin" });
  if (!response.ok) {
    throw new Error(`Shared watchlist request failed: ${response.status}`);
  }
  const html = await response.text();
  const documentCopy = new DOMParser().parseFromString(html, "text/html");
  const payload = Array.from(
    documentCopy.querySelectorAll(
      'script[type="application/prs.init-data+json"]',
    ),
  )
    .map((node) => {
      try {
        return JSON.parse(node.textContent ?? "");
      } catch {
        return undefined;
      }
    })
    .find((value) => value?.sharedWatchlist?.list);

  if (!payload) throw new Error("Shared watchlist init data was not found");
  return payload.sharedWatchlist.list;
})()
```

```bash
JS
```

Validate the returned `id`, `name`, `active`, `shared`, and `symbols`. Preserve
exchange-qualified identifiers and source order. Report duplicates, malformed
symbols, or unexpected membership deltas instead of silently normalizing them.

TradingView may render a different symbol count or return fewer scanner rows
when a configured symbol has no scanner data. The configured
`sharedWatchlist.list.symbols` array remains the membership evidence unless the
user defines another rule.

If init data is absent or invalid, stop treating this recipe as complete.
Re-snapshot the semantic page, confirm the watchlist identity, and inspect the
page's current structured requests only as diagnostic evidence. Use an
authenticated watchlist surface when required. Report that full membership
could not be verified rather than assembling it from visible virtualized rows.

## Private Watchlists

Attach to the authenticated profile and open the Watchlist sidebar. Capture the
watchlist name and current symbol count before any mutation. Prefer a shared URL
when the same list is publicly shared; use UI extraction only when no structured
shared representation exists.

## Modify A Watchlist

Adding, removing, reordering, clearing, importing, renaming, or changing sharing
is a mutation. Require the target watchlist and exact intended delta. Re-read
the configured list after the change and report the exchange-qualified before
and after delta. Never treat a missing scanner result as authorization to remove
a symbol.
