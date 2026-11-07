import {
  ProviderError,
  ResponseStatusError,
  decodeJson,
  defineProvider,
  oauth2,
  object,
  secrets,
  string,
} from "apps";
import { host, info } from "./opencode.js";

// Both providers copy their apps' definitions exactly. A provider's identity comes from its whole
// definition except hosts, so an identical copy accepts the accounts already linked to the
// official Discord app and to the opencode app. Change neither without changing its source too.

const User = object({ id: string(), username: string() });

// Copied from Executor's official Discord app (@executor.sh/discord).
export const discord = defineProvider({
  name: "Discord",
  hosts: ["discord.com"],
  auth: {
    botToken: secrets({
      label: "Bot token",
      fields: object({ token: string({ minLength: 1 }) }),
    }),
    // Discord has no client registration: the connect page asks for an application's client.
    oauth: oauth2({
      authorizationUrl: "https://discord.com/oauth2/authorize",
      tokenUrl: "https://discord.com/api/oauth2/token",
      revocationUrl: "https://discord.com/api/oauth2/token/revoke",
      tokenEndpointAuthMethod: "client_secret_post",
      scopes: ["identify", "guilds", "guilds.members.read", "connections"],
    }),
  },
  async health({ account, fetch, signal }) {
    const authorization =
      account.method === "oauth"
        ? `Bearer ${account.fields.access_token}`
        : `Bot ${account.fields.token}`;
    // /users/@me works for both bot tokens and OAuth2 tokens with the identify scope.
    const response = await fetch("https://discord.com/api/v10/users/@me", {
      signal,
      headers: { Authorization: authorization },
    });
    const me = await decodeJson(response, User);
    return { accountInfo: { externalId: me.id, username: me.username } };
  },
});

// Copied from executor/apps/opencode/index.ts.
export const opencode = defineProvider({
  name: "OpenCode",
  hosts: [host],
  auth: {
    password: secrets({
      label: "Service password",
      fields: object({ password: string({ minLength: 1 }) }),
    }),
  },
  async health({ account, fetch, signal }) {
    try {
      await info({ fetch, signal, password: account.fields.password });
    } catch (error) {
      if (error instanceof ResponseStatusError && error.status === 401)
        throw new ProviderError({ reason: "unauthorized", status: 401 });

      throw error;
    }
  },
});
