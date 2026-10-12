import { createApp } from "./app";
import { systemClock } from "./clock";
import { openDatabase } from "./db";

const db = openDatabase(process.env.DATABASE_PATH ?? "data/inventory.db");

const app = createApp({ db, clock: systemClock });

const server = Bun.serve({ port: Number(process.env.PORT ?? 3000), fetch: app });

console.log(`Inventory listening on ${server.url}`);
