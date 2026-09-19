# Discord MCP

This package provides a loopback-only stateless MCP Streamable HTTP server with one job-agnostic tool, `discord_send_message`. It sends plain text only to named destinations configured by the service environment.

## HTTP service

The server listens on `http://127.0.0.1:29980/mcp`. It accepts the OpenCode query string, applies the official localhost Host and Origin guards, and uses a 64 KiB raw inbound request-body limit. The HTTP adapter only converts bounded Node requests to web `Request` objects and streams web `Response` objects; the official MCP SDK owns protocol parsing, validation, and dispatch.

The Personal deployment is managed by the user unit `discord-mcp.service`. The unit loads the bot token from the approved shell environment source, supplies the non-secret destination routing, and starts the built `dist/http-server.js` process with `Restart=on-failure`. The catalog contains only the remote HTTP URL; it does not pass Discord environment variables to OpenCode.

Loopback binding and Host/Origin checks are not process isolation. Any same-host process that can reach the Personal user service can call this endpoint. This deployment intentionally has no bearer token because the accepted security decision is loopback-only access without bearer authentication.

## Generic package configuration

For a standalone deployment, set these variables in the environment that launches the server:

```text
DISCORD_BOT_TOKEN=<bot token kept in a secret store>
DISCORD_DESTINATIONS_JSON={"notifications":"<channel snowflake>"}
DISCORD_DEFAULT_DESTINATION=notifications
```

`DISCORD_DESTINATIONS_JSON` must be a non-empty JSON object whose names match lowercase names such as `notifications` and whose values are Discord channel snowflakes. `DISCORD_DEFAULT_DESTINATION` is optional when every call supplies a named destination, but if set it must name an entry in the map.

Never put a bot token in this repository, an MCP argument, or a log. Destination names and channel IDs are routing configuration, not secrets.

The Personal systemd unit `discord-mcp.service` supplies the accepted `opencode` destination and default. Only `DISCORD_BOT_TOKEN` must be supplied through the service's approved secret runtime environment; do not duplicate the destination variables in the secret file.

## Discord restrictions

The server rejects arbitrary channel IDs, mentions, embeds, files, components, polls, stickers, replies, TTS, flags, commands, and Gateway connections. Every request sends `allowed_mentions: {"parse":[]}` and uses a bounded nonce-preserving retry policy.

Each call has a 10-second deadline, a 5-second per-attempt timeout, and at most three attempts. HTTP 400, 401, 403, and 404 responses are not retried. A 429 response is retried only after its `retry_after` delay still fits the deadline and attempt limit. Network failures and 5xx responses use bounded exponential backoff with jitter; the same nonce is reused on every retry. A final 5xx is reported as a temporary Discord failure, while a network or timeout result is reported as an unknown delivery outcome.

For a guild text channel, install the bot with the `bot` scope and only `VIEW_CHANNEL` plus `SEND_MESSAGES` (permission integer `3072`). The server uses REST API v10 and does not require Gateway intents.

## Check and build

From the repository root, install the workspace dependencies and run the package checks:

```sh
pnpm install
pnpm --filter @mfz/discord-mcp check
```

Build before starting or enabling the service:

```sh
pnpm --filter @mfz/discord-mcp build
```

The service starts the generated `mcp/discord/dist/http-server.js` directly. The obsolete child-process launcher is intentionally removed; there is one production transport.

## Activation and rollback

After the source changes are accepted and the bot token is available through the approved local secret mechanism, the later operator should run these steps in order:

1. Build the package with `pnpm --filter @mfz/discord-mcp build`.
2. Render/apply the Personal MFZ profile and verify the generated OpenCode entry is the remote URL with no command or Discord environment block.
3. Run `systemctl --user daemon-reload`.
4. Run `systemctl --user enable --now discord-mcp.service` and verify `systemctl --user status --no-pager discord-mcp.service`.
5. Verify that the listener is bound only to `127.0.0.1:29980`, query `/healthz`, and reconnect or reload OpenCode after the service is ready.
6. Perform any human-approved live Discord call separately; this package validation uses synthetic configuration and does not send a message.

Do not place secret values in commands, source control, catalog entries, MCP arguments, logs, or evidence. For rollback, first run `systemctl --user disable --now discord-mcp.service`, verify the listener is gone, then restore the prior accepted catalog and launcher through a reviewed MFZ change. Do not run rollback by deleting a live service or changing active OpenCode configuration without operator approval.
