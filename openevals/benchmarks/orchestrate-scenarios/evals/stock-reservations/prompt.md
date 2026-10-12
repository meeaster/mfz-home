Load the orchestrate skill.

Checkout needs to hold stock while a customer pays, so I want reservations in the inventory service. A cart reserves some quantity of an item, and the hold lapses on its own after 15 minutes, or after `RESERVATION_TTL_SECONDS` when that's set. Nobody should be able to reserve more than is actually available, meaning on hand minus active holds, even when two requests race. A hold can be released, or confirmed once payment goes through, which takes the stock off on hand for good.

What I have in mind for the API:

- `POST /items/:id/reservations` with `{ cartId, quantity }` returns 201 with the reservation (`id`, `itemId`, `cartId`, `quantity`, `expiresAt`), or 409 when there isn't enough available
- `DELETE /reservations/:id` releases it
- `POST /reservations/:id/confirm` confirms it, or 409 when it already lapsed or was released

Items should show `available` next to `onHand`, in the API and in the stock report.

Stick to the repo's conventions. Get it reviewed once it's built, and fix whatever the review turns up.

Don't run anything in the background. Running things in parallel is fine, but wait for them to finish.
