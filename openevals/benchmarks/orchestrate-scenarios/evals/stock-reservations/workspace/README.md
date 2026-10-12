# Inventory

Stock levels for the shop's catalog, served over HTTP and summarized by a report.

```sh
bun run start    # serves on PORT (default 3000), database at DATABASE_PATH (default data/inventory.db)
bun run report   # prints every item's stock from DATABASE_PATH
bun test
```

The routes are described in [docs/api.md](docs/api.md).
