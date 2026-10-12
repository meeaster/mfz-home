import type { Database } from "bun:sqlite";
import type { Clock } from "./clock";
import { Router } from "./http/router";
import { itemRoutes } from "./items/routes";

export type AppOptions = { db: Database; clock: Clock };

/** The HTTP application: a fetch handler over the given database and clock. */
export function createApp({ db, clock }: AppOptions): (request: Request) => Promise<Response> {
  const router = new Router();

  itemRoutes(router, db, clock);

  return (request) => router.handle(request);
}
