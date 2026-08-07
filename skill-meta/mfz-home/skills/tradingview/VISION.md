# Vision

## Problem

TradingView concentrates chart state, watchlists, Pine studies, alerts, and
loaded indicator data behind a dynamic canvas-heavy interface. General browser
agents repeatedly rediscover login, WSL attachment, hidden controls, virtualized
tables, and undocumented chart data, wasting time and risking accidental layout
or trading changes.

## Intended Behavior

The skill is a model-invoked TradingView field guide layered on agent-browser.
It routes agents to the narrowest reliable evidence surface, prefers checked
in-page APIs for validated automation, preserves user account and chart state,
distinguishes supported features from version-sensitive internals, and records
enough chart context to reproduce every result.

The guide evolves from live evidence under standing human authority to promote
validated TradingView automation improvements. A newly discovered route is
promoted only when it is repeatable, more efficient or reliable than current
guidance, safe across account and plan boundaries, and accompanied by sanitized
evidence, verification, and an evaluation update where behavior changed.
Superseded recipes are replaced so the skill becomes sharper rather than longer.

The human retains authority over authentication, persistent profiles, paid-plan
choices, layout and Pine changes, alerts, watchlist mutations, publishing, and
all broker or trading actions.

## Success

An agent can attach to the intended TradingView session, identify chart and
watchlist context, retrieve requested evidence or perform an authorized change
without exploratory thrashing, and leave a reproducible account of the surface
used and its reliability boundary. Indicator evaluations account for every
exposed output channel before interpreting the signal. Future runs benefit from
validated methods learned by earlier runs.

## Non-Goals

- Treat TradingView internals as a stable market-data API.
- Build a separate client around private TradingView backend protocols or session
  material.
- Bypass subscription or export restrictions.
- Automate identity-provider credentials or weaken browser security.
- Make live trading decisions or actions implicit in chart inspection.
- Preserve every workaround after a better route is verified.
