# Inventory API

All bodies are JSON. Errors are [problem details](https://www.rfc-editor.org/rfc/rfc9457) with content type `application/problem+json`; invalid input is a 400 titled "Invalid request".

An item is `{ id, sku, name, onHand, createdAt }`.

## GET /items

Every item, ordered by SKU.

## GET /items/:id

One item, or 404.

## POST /items

Creates an item from `{ sku, name, onHand }`. Returns 201 with the item, or 409 when the SKU exists.

## PUT /items/:id/stock

Sets `onHand` from `{ onHand }` after a stock take or delivery. Returns the item, or 404.
