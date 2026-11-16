import { randomUUID } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import { z } from "zod";

// Codex's public OAuth client; refresh tokens are bound to it.
const CODEX_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";

const TOKEN_URL = "https://auth.openai.com/oauth/token";

// Refresh this long before the access token expires so an in-flight call never carries an expired token.
const EXPIRY_MARGIN_MS = 5 * 60 * 1000;

// Only the fields this plugin reads are checked; everything else in the file is written back untouched.
const AuthFile = z.looseObject({
  tokens: z.looseObject({
    access_token: z.string(),
    refresh_token: z.string(),
    id_token: z.string().optional(),
    account_id: z.string().optional(),
  }),
});

const RefreshResponse = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  id_token: z.string().optional(),
});

const JwtExpiry = z.looseObject({ exp: z.number() });

export interface CodexToken {
  readonly accessToken: string;
  readonly accountId: string | undefined;
}

export interface CodexAuthOptions {
  readonly path?: string;
  readonly tokenUrl?: string;
}

function expiresAt(jwt: string) {
  const payload = jwt.split(".")[1] ?? "";
  const claims = JwtExpiry.safeParse(JSON.parse(Buffer.from(payload, "base64url").toString() || "{}"));

  return claims.success ? claims.data.exp * 1000 : 0;
}

// Reads the ChatGPT login that `codex login` stores in ~/.codex/auth.json and refreshes it in place when it expires,
// writing the result back in Codex's own format so Codex keeps working with the rotated refresh token.
export class CodexAuth {
  readonly #path: string;

  readonly #tokenUrl: string;

  #refreshing: Promise<CodexToken> | undefined;

  constructor(options: CodexAuthOptions = {}) {
    this.#path = options.path ?? join(process.env.CODEX_HOME ?? join(homedir(), ".codex"), "auth.json");
    this.#tokenUrl = options.tokenUrl ?? TOKEN_URL;
  }

  // The file is read on every call so a refresh Codex itself performs is picked up immediately.
  async token(): Promise<CodexToken> {
    const { tokens } = await this.#load();

    if (expiresAt(tokens.access_token) - EXPIRY_MARGIN_MS > Date.now())
      return { accessToken: tokens.access_token, accountId: tokens.account_id };

    this.#refreshing ??= this.#refresh(tokens.refresh_token).finally(() => {
      this.#refreshing = undefined;
    });

    return this.#refreshing;
  }

  async #load() {
    let raw: string;

    try {
      raw = await readFile(this.#path, "utf8");
    } catch (error) {
      throw new Error(`No Codex login at ${this.#path}; run \`codex login\``, { cause: error });
    }

    return AuthFile.parse(JSON.parse(raw));
  }

  async #refresh(refreshToken: string): Promise<CodexToken> {
    const response = await fetch(this.#tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: CODEX_CLIENT_ID,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok)
      throw new Error(`Codex token refresh failed with HTTP ${response.status}; run \`codex login\``);

    const fresh = RefreshResponse.parse(await response.json());

    // Codex may have refreshed while this request was in flight. Its rotation wins: keep the file as it is.
    const current = await this.#load();

    if (current.tokens.refresh_token !== refreshToken)
      return { accessToken: current.tokens.access_token, accountId: current.tokens.account_id };

    const tokens = {
      ...current.tokens,
      access_token: fresh.access_token,
      refresh_token: fresh.refresh_token ?? refreshToken,
    };

    if (fresh.id_token !== undefined) tokens.id_token = fresh.id_token;

    const temporary = `${this.#path}.${randomUUID()}.tmp`;

    await writeFile(temporary, `${JSON.stringify({ ...current, tokens, last_refresh: new Date().toISOString() }, null, 2)}\n`, {
      mode: 0o600,
    });
    await rename(temporary, this.#path);

    return { accessToken: tokens.access_token, accountId: tokens.account_id };
  }
}
