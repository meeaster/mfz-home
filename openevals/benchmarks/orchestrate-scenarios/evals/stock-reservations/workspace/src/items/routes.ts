import type { Database } from "bun:sqlite";
import type { Clock } from "../clock";
import { parseId, readBody, requireInteger, requireString } from "../http/parse";
import { problem } from "../http/problem";
import type { Router } from "../http/router";
import { createItem, findItemBySku, getItem, listItems, setOnHand } from "./store";

export function itemRoutes(router: Router, db: Database, clock: Clock): void {
  router.on("GET", "/items", () => Response.json(listItems(db)));

  router.on("GET", "/items/:id", (_, params) => {
    const item = getItem(db, parseId(params.id));

    return item ? Response.json(item) : problem(404, "Item not found");
  });

  router.on("POST", "/items", async (request) => {
    const body = await readBody(request);
    const input = { sku: requireString(body, "sku"), name: requireString(body, "name"), onHand: requireInteger(body, "onHand", 0) };

    if (findItemBySku(db, input.sku)) return problem(409, "SKU already exists", input.sku);

    return Response.json(createItem(db, input, clock.now()), { status: 201 });
  });

  router.on("PUT", "/items/:id/stock", async (request, params) => {
    const id = parseId(params.id);
    const onHand = requireInteger(await readBody(request), "onHand", 0);
    const item = setOnHand(db, id, onHand);

    return item ? Response.json(item) : problem(404, "Item not found");
  });
}
