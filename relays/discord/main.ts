// Discord Gateway relay: keeps one Gateway connection for the bot and forwards the owner's mentions
// in the watched channel to the discord-mentions Executor webhook. Logs never include the token,
// the signing secret, or message content.
import {
  deliveryBody,
  shouldForward,
  signatureHeaders,
  type Filter,
  type GatewayMessage,
} from "./relay.ts";

const api = "https://discord.com/api/v10";
const gatewayQuery = "?v=10&encoding=json";

// GUILD_MESSAGES only: mentions of the bot carry their content without the privileged intent.
const intents = 1 << 9;

// Close codes after which reconnecting cannot help, such as a bad token or intents.
const fatalCloseCodes = new Set([4004, 4010, 4011, 4012, 4013, 4014]);

// Close codes that end the session, so the next connection identifies instead of resuming.
const sessionEndingCloseCodes = new Set([4007, 4009]);

interface Config {
  readonly token: string;
  readonly webhookURL: string;
  readonly secret: string;
  readonly filter: Filter;
}

interface Session {
  id: string;
  resumeURL: string;
  sequence: number | null;
  botID: string;
}

interface Payload {
  readonly op: number;
  readonly d: unknown;
  readonly s: number | null;
  readonly t: string | null;
}

function log(message: string) {
  console.log(`[discord-relay] ${message}`);
}

function readConfig(): Config {
  const names = [
    "DISCORD_BOT_TOKEN",
    "DISCORD_RELAY_URL",
    "DISCORD_RELAY_SECRET",
    "DISCORD_RELAY_CHANNEL_ID",
    "DISCORD_RELAY_OWNER_ID",
  ] as const;
  const missing = names.filter((name) => !process.env[name]?.trim());

  if (missing.length > 0) {
    log(`missing configuration: ${missing.join(", ")}`);
    process.exit(1);
  }

  const value = (name: (typeof names)[number]) => process.env[name]?.trim() ?? "";

  return {
    token: value("DISCORD_BOT_TOKEN"),
    webhookURL: value("DISCORD_RELAY_URL"),
    secret: value("DISCORD_RELAY_SECRET"),
    filter: { channelID: value("DISCORD_RELAY_CHANNEL_ID"), ownerID: value("DISCORD_RELAY_OWNER_ID") },
  };
}

async function gatewayURL(token: string): Promise<string> {
  const response = await fetch(`${api}/gateway/bot`, { headers: { authorization: `Bot ${token}` } });

  if (!response.ok) throw new Error(`GET /gateway/bot failed with status ${response.status}`);

  const { url } = (await response.json()) as { url: string };

  return url;
}

// Executor dedupes by message ID, so retrying a delivery that may have arrived is safe.
async function forward(config: Config, message: GatewayMessage, botID: string) {
  const body = deliveryBody(message, botID);

  for (const delay of [0, 1000, 3000, 10000]) {
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      const response = await fetch(config.webhookURL, {
        method: "POST",
        headers: { "content-type": "application/json", ...signatureHeaders(body, config.secret) },
        body,
      });

      if (response.ok) {
        log(`forwarded message ${message.id}`);
        return;
      }

      log(`webhook answered ${response.status} for message ${message.id}`);

      // A refused signature or request will not succeed on retry.
      if (response.status === 400 || response.status === 401 || response.status === 404) return;
    } catch (error) {
      log(`webhook unreachable for message ${message.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  log(`gave up forwarding message ${message.id}; the poller will answer it`);
}

interface Outcome {
  readonly code: number;
  readonly resumable: boolean;
}

// One Gateway connection, from Hello until close. Resolves with how the next connection should start.
function connect(config: Config, url: string, session: Session | undefined, onSession: (session: Session | undefined) => void): Promise<Outcome> {
  return new Promise((resolve) => {
    const socket = new WebSocket(`${url}${gatewayQuery}`);
    let current = session;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let firstBeat: ReturnType<typeof setTimeout> | undefined;
    let acknowledged = true;
    let resumable = session !== undefined;

    const send = (op: number, d: unknown) => socket.send(JSON.stringify({ op, d }));
    const beat = () => send(1, current?.sequence ?? null);

    const stop = (code: number) => {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) socket.close(code);
    };

    socket.addEventListener("message", (event) => {
      const payload = JSON.parse(String(event.data)) as Payload;

      if (payload.s !== null && current !== undefined) current.sequence = payload.s;

      switch (payload.op) {
        case 10: {
          const { heartbeat_interval: interval } = payload.d as { heartbeat_interval: number };

          // The first beat is jittered so many clients reconnecting together spread out.
          firstBeat = setTimeout(() => {
            beat();
            heartbeat = setInterval(() => {
              // No acknowledgement since the last beat means a zombied connection: drop and resume.
              if (!acknowledged) {
                log("heartbeat not acknowledged; reconnecting");
                stop(4000);
                return;
              }

              acknowledged = false;
              beat();
            }, interval);
          }, interval * Math.random());

          if (current === undefined) {
            send(2, {
              token: config.token,
              intents,
              properties: { os: process.platform, browser: "mfz-discord-relay", device: "mfz-discord-relay" },
            });
          } else {
            send(6, { token: config.token, session_id: current.id, seq: current.sequence });
          }

          break;
        }

        case 11:
          acknowledged = true;
          break;

        case 1:
          beat();
          break;

        // Discord asks for a reconnect; the session stays resumable.
        case 7:
          resumable = true;
          stop(4000);
          break;

        // Invalid session: `d` says whether it can still be resumed.
        case 9:
          resumable = payload.d === true;
          if (!resumable) {
            current = undefined;
            onSession(undefined);
          }
          stop(4000);
          break;

        case 0:
          if (payload.t === "READY") {
            const ready = payload.d as { session_id: string; resume_gateway_url: string; user: { id: string } };
            current = { id: ready.session_id, resumeURL: ready.resume_gateway_url, sequence: payload.s, botID: ready.user.id };
            onSession(current);
            log("connected");
          } else if (payload.t === "RESUMED") {
            log("resumed");
          } else if (payload.t === "MESSAGE_CREATE" && current !== undefined) {
            const message = payload.d as GatewayMessage;

            if (shouldForward(message, config.filter, current.botID)) void forward(config, message, current.botID);
          }

          break;
      }
    });

    socket.addEventListener("close", (event) => {
      clearTimeout(firstBeat);
      clearInterval(heartbeat);
      resolve({ code: event.code, resumable: resumable && !sessionEndingCloseCodes.has(event.code) });
    });

    socket.addEventListener("error", () => log("socket error"));
  });
}

async function main() {
  const config = readConfig();
  let session: Session | undefined;
  let failures = 0;

  for (;;) {
    try {
      const url = session?.resumeURL ?? (await gatewayURL(config.token));
      const startedAt = Date.now();
      const outcome = await connect(config, url, session, (next) => {
        session = next;
      });

      if (fatalCloseCodes.has(outcome.code)) {
        log(`Discord closed the connection with fatal code ${outcome.code}; check the token and intents`);
        process.exit(1);
      }

      if (!outcome.resumable) session = undefined;

      // A connection that lasted a while resets the backoff.
      failures = Date.now() - startedAt > 60_000 ? 0 : failures + 1;
      log(`disconnected with code ${outcome.code}; ${session === undefined ? "identifying" : "resuming"} again`);
    } catch (error) {
      failures += 1;
      log(`connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Exponential backoff with jitter, capped at one minute.
    const delay = Math.min(60_000, 1000 * 2 ** Math.min(failures, 6)) * (0.5 + Math.random() / 2);
    await new Promise((resolve) => setTimeout(resolve, failures === 0 ? 1000 : delay));
  }
}

await main();
