import type { Database } from "bun:sqlite";

export type Item = { id: number; sku: string; name: string; onHand: number; createdAt: string };

type ItemRow = { id: number; sku: string; name: string; on_hand: number; created_at: number };

const toItem = (row: ItemRow): Item => ({
  id: row.id,
  sku: row.sku,
  name: row.name,
  onHand: row.on_hand,
  createdAt: new Date(row.created_at).toISOString(),
});

export function listItems(db: Database): Item[] {
  return db.query<ItemRow, []>("SELECT * FROM items ORDER BY sku").all().map(toItem);
}

export function getItem(db: Database, id: number): Item | undefined {
  const row = db.query<ItemRow, [number]>("SELECT * FROM items WHERE id = ?").get(id);

  return row ? toItem(row) : undefined;
}

export function findItemBySku(db: Database, sku: string): Item | undefined {
  const row = db.query<ItemRow, [string]>("SELECT * FROM items WHERE sku = ?").get(sku);

  return row ? toItem(row) : undefined;
}

export function createItem(db: Database, input: { sku: string; name: string; onHand: number }, now: number): Item {
  const row = db
    .query<ItemRow, [string, string, number, number]>("INSERT INTO items (sku, name, on_hand, created_at) VALUES (?, ?, ?, ?) RETURNING *")
    .get(input.sku, input.name, input.onHand, now);

  return toItem(row!);
}

/** Sets an item's on-hand count after a stock take or delivery. */
export function setOnHand(db: Database, id: number, onHand: number): Item | undefined {
  const row = db.query<ItemRow, [number, number]>("UPDATE items SET on_hand = ? WHERE id = ? RETURNING *").get(onHand, id);

  return row ? toItem(row) : undefined;
}
