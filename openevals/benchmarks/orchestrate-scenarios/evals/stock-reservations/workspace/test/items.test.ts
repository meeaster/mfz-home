import { describe, expect, test } from "bun:test";
import { testApp } from "./helpers";

const widget = { sku: "W-1", name: "Widget", onHand: 5 };

describe("items", () => {
  test("creates an item and reads it back", async () => {
    const { send } = testApp();
    const created = await send("POST", "/items", widget);

    expect(created.status).toBe(201);

    const item = await created.json();

    expect(item).toMatchObject({ ...widget, createdAt: "2026-01-05T09:00:00.000Z" });
    expect(await (await send("GET", `/items/${item.id}`)).json()).toEqual(item);
    expect(await (await send("GET", "/items")).json()).toEqual([item]);
  });

  test("rejects a duplicate SKU", async () => {
    const { send } = testApp();

    await send("POST", "/items", widget);

    const duplicate = await send("POST", "/items", widget);

    expect(duplicate.status).toBe(409);
    expect(duplicate.headers.get("content-type")).toBe("application/problem+json");
  });

  test("rejects invalid input with a problem", async () => {
    const { send } = testApp();

    for (const body of [{ ...widget, onHand: -1 }, { ...widget, onHand: 1.5 }, { ...widget, sku: "" }, { name: "No SKU", onHand: 1 }]) {
      const response = await send("POST", "/items", body);

      expect(response.status).toBe(400);
      expect((await response.json()).title).toBe("Invalid request");
    }

    expect((await send("GET", "/items/abc")).status).toBe(400);
  });

  test("sets stock after a stock take", async () => {
    const { send } = testApp();
    const item = await (await send("POST", "/items", widget)).json();
    const updated = await send("PUT", `/items/${item.id}/stock`, { onHand: 12 });

    expect((await updated.json()).onHand).toBe(12);
    expect((await send("PUT", "/items/999/stock", { onHand: 1 })).status).toBe(404);
  });
});
