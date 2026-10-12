import { openDatabase } from "./db";
import { listItems } from "./items/store";

const items = listItems(openDatabase(process.env.DATABASE_PATH ?? "data/inventory.db"));

const rows = [["SKU", "NAME", "ON HAND"], ...items.map((item) => [item.sku, item.name, String(item.onHand)])];

const widths = rows[0].map((_, column) => Math.max(...rows.map((row) => row[column].length)));

for (const row of rows) console.log(row.map((cell, column) => cell.padEnd(widths[column])).join("  ").trimEnd());
