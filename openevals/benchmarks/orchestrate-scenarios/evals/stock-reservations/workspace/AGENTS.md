# Inventory service

Bun and `bun:sqlite` only; add no dependencies.

## Conventions

- **Time comes from the injected `Clock`.** `createApp` receives it and passes it down. Code under `src/` never reads the system time directly (`Date.now()`, `new Date()` without arguments), except `systemClock` in `src/clock.ts`. Tests use a fixed clock they advance by hand.
- **Parse requests with `src/http/parse.ts`.** Handlers never call `request.json()` or convert path and body values themselves. Add a parser there when none fits.
- **Errors are problem details.** Every error response comes from `problem()` in `src/http/problem.ts`. A `ParseError` thrown while parsing becomes a 400 automatically.
- **Schema changes are new migrations.** Add the next numbered file in `migrations/`. Never edit a migration that already exists: deployed databases have applied it, and the runner refuses a changed one.
- **Keep data access in the feature's `store.ts`.** Route handlers call store functions and never run SQL.
- **Every route has tests** in `test/`, built on `createApp` with an in-memory database and a fixed clock.
- **Every route is documented** in `docs/api.md`.

Run `bun test` before handing work back.
