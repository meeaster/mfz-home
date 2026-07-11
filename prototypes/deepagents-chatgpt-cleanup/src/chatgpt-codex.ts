import { createHash, randomBytes } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ChatOpenAI } from "@langchain/openai";

const CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const AUTHORIZE_URL = "https://auth.openai.com/oauth/authorize";
const TOKEN_URL = "https://auth.openai.com/oauth/token";
const CALLBACK_PORT = 1455;
const REDIRECT_URI = `http://localhost:${CALLBACK_PORT}/auth/callback`;
const CODEX_BASE_URL = "https://chatgpt.com/backend-api/codex";
const TOKEN_DIR = path.join(process.env.HOME ?? process.cwd(), ".deepagents-chatgpt");
const TOKEN_PATH = path.join(TOKEN_DIR, ".env");
export type ModelId = "gpt-5.6-luna" | "gpt-5.6-terra";
export const DEFAULT_MODEL_ID: ModelId = "gpt-5.6-luna";

export type ReasoningEffort = "low" | "medium" | "high";

type Tokens = {
  access: string;
  refresh: string;
  expiresAtMs: number;
  accountId: string;
  email: string | null;
  planType: string | null;
};

function base64url(value: Buffer): string {
  return value
    .toString("base64")
    .replace(/\+/gu, "-")
    .replace(/\//gu, "_")
    .replace(/=+$/u, "");
}

function decodeIdentity(access: string): Pick<Tokens, "accountId" | "email" | "planType"> {
  const empty = { accountId: "", email: null, planType: null };
  const parts = access.split(".");

  if (parts.length !== 3) {
    return empty;
  }

  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as Record<
      string,
      unknown
    >;
    const auth = payload["https://api.openai.com/auth"] as Record<string, unknown> | undefined;
    const profile = payload["https://api.openai.com/profile"] as
      | Record<string, unknown>
      | undefined;

    return {
      accountId: typeof auth?.chatgpt_account_id === "string" ? auth.chatgpt_account_id : "",
      email: typeof profile?.email === "string" ? profile.email : null,
      planType: typeof auth?.chatgpt_plan_type === "string" ? auth.chatgpt_plan_type : null,
    };
  } catch {
    return empty;
  }
}

function parseEnv(text: string): Record<string, string> {
  const values: Record<string, string> = {};

  for (const line of text.split("\n")) {
    const match = /^([A-Z0-9_]+)=(.*)$/u.exec(line.trim());
    if (match) {
      values[match[1]] = match[2];
    }
  }

  return values;
}

async function readTokens(): Promise<Tokens | null> {
  try {
    const values = parseEnv(await readFile(TOKEN_PATH, "utf8"));
    if (!values.ACCESS_TOKEN || !values.REFRESH_TOKEN || !values.ACCOUNT_ID) {
      return null;
    }

    return {
      access: values.ACCESS_TOKEN,
      refresh: values.REFRESH_TOKEN,
      expiresAtMs: Number(values.EXPIRES_AT),
      accountId: values.ACCOUNT_ID,
      email: values.EMAIL || null,
      planType: values.PLAN || null,
    };
  } catch {
    return null;
  }
}

async function saveTokens(tokens: Tokens): Promise<void> {
  await mkdir(TOKEN_DIR, { recursive: true, mode: 0o700 });
  await writeFile(
    TOKEN_PATH,
    [
      `ACCESS_TOKEN=${tokens.access}`,
      `REFRESH_TOKEN=${tokens.refresh}`,
      `EXPIRES_AT=${tokens.expiresAtMs}`,
      `ACCOUNT_ID=${tokens.accountId}`,
      `EMAIL=${tokens.email ?? ""}`,
      `PLAN=${tokens.planType ?? ""}`,
      "",
    ].join("\n"),
    { mode: 0o600 },
  );
  await chmod(TOKEN_PATH, 0o600);
}

async function exchange(body: URLSearchParams): Promise<Tokens> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error(`ChatGPT token request failed (${response.status}).`);
  }

  const json = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!json.access_token || !json.refresh_token || json.expires_in == null) {
    throw new Error("ChatGPT token response was incomplete.");
  }

  const identity = decodeIdentity(json.access_token);
  if (!identity.accountId) {
    throw new Error("The ChatGPT token did not contain an account id.");
  }

  return {
    access: json.access_token,
    refresh: json.refresh_token,
    expiresAtMs: Date.now() + json.expires_in * 1000,
    ...identity,
  };
}

export async function login(): Promise<Tokens> {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  const state = randomBytes(16).toString("hex");
  const authorize = new URL(AUTHORIZE_URL);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("client_id", CLIENT_ID);
  authorize.searchParams.set("redirect_uri", REDIRECT_URI);
  authorize.searchParams.set("scope", "openid profile email offline_access");
  authorize.searchParams.set("code_challenge", challenge);
  authorize.searchParams.set("code_challenge_method", "S256");
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("id_token_add_organizations", "true");
  authorize.searchParams.set("codex_cli_simplified_flow", "true");
  authorize.searchParams.set("originator", "deepagents-prototype");

  const code = await new Promise<string>((resolve, reject) => {
    let settled = false;
    let timeout: NodeJS.Timeout | undefined;

    const finish = (value: string): void => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      process.stdin.off("data", onStdin);
      server.close();
      resolve(value);
    };

    const fail = (error: Error): void => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      process.stdin.off("data", onStdin);
      server.close();
      reject(error);
    };

    const onStdin = (chunk: string | Buffer): void => {
      const input = chunk.toString().trim();
      if (!input) return;
      const url = input.startsWith("http")
        ? new URL(input)
        : new URL(`http://localhost:${CALLBACK_PORT}/auth/callback?${input.includes("=") ? input : `code=${encodeURIComponent(input)}`}`);
      if (url.searchParams.get("state") && url.searchParams.get("state") !== state) {
        console.error("The pasted callback belongs to a different login attempt.");
        return;
      }
      const authCode = url.searchParams.get("code");
      if (authCode) finish(authCode);
    };

    const server = createServer((request: IncomingMessage, response: ServerResponse) => {
      const url = new URL(request.url ?? "", REDIRECT_URI);
      if (url.pathname !== "/auth/callback") {
        response.writeHead(404).end();
        return;
      }
      if (url.searchParams.get("state") !== state) {
        response.writeHead(400).end("State mismatch");
        return;
      }
      const authCode = url.searchParams.get("code");
      if (!authCode) {
        response.writeHead(400).end("Missing authorization code");
        return;
      }
      response.writeHead(200, { "Content-Type": "text/plain" }).end("Login complete. Close this tab.");
      finish(authCode);
    });
    server.on("error", fail);
    server.listen(CALLBACK_PORT, "localhost", () => {
      console.log(`Open this URL in your browser:\n\n${authorize}\n`);
      console.log("If the browser cannot return automatically, paste the final redirect URL here:");
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", onStdin);
    });
    timeout = setTimeout(() => fail(new Error("ChatGPT login timed out after five minutes.")), 300_000);
  });

  const tokens = await exchange(
    new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      code,
      code_verifier: verifier,
      redirect_uri: REDIRECT_URI,
    }),
  );
  await saveTokens(tokens);
  return tokens;
}

async function freshTokens(): Promise<Tokens> {
  const current = await readTokens();
  if (!current) {
    return login();
  }
  if (Number.isFinite(current.expiresAtMs) && Date.now() < current.expiresAtMs - 60_000) {
    return current;
  }

  const identity = await exchange(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: current.refresh,
      client_id: CLIENT_ID,
    }),
  );
  await saveTokens(identity);
  return identity;
}

function isResponsesRequest(input: Parameters<typeof fetch>[0]): boolean {
  const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const actual = new URL(raw);
  return actual.origin === new URL(`${CODEX_BASE_URL}/responses`).origin && actual.pathname === "/backend-api/codex/responses";
}

function createCodexFetch(modelId: string, effort: ReasoningEffort): typeof fetch {
  return async (input, init) => {
    const codexModel = (modelId === "gpt-5.6-luna" || modelId === "gpt-5.6-terra") && isResponsesRequest(input);
    const luna = modelId === "gpt-5.6-luna" && codexModel;
    if (typeof init?.body === "string") {
      try {
        const payload = JSON.parse(init.body) as Record<string, unknown>;
        let changed = false;
        const items = Array.isArray(payload.input) ? payload.input : [];
        for (const item of items) {
          if (item && typeof item === "object" && !Array.isArray(item)) {
            const record = item as Record<string, unknown>;
            if (record.role === "system") {
              record.role = "developer";
              changed = true;
            }
          }
        }
        if (luna) {
          const prefix: unknown[] = [];
          if (Array.isArray(payload.tools)) {
            prefix.push({ type: "additional_tools", role: "developer", tools: payload.tools });
          }
          if (typeof payload.instructions === "string" && payload.instructions.length > 0) {
            prefix.push({
              type: "message",
              role: "developer",
              content: [{ type: "input_text", text: payload.instructions }],
            });
          }
          payload.input = [...prefix, ...items];
          delete payload.instructions;
          delete payload.tools;
        }
        if (codexModel) {
          payload.reasoning = {
            ...(payload.reasoning && typeof payload.reasoning === "object" ? payload.reasoning : {}),
            effort,
            ...(luna ? { context: "all_turns" } : {}),
          };
          changed = true;
        }
        if (luna) {
          payload.parallel_tool_calls = false;
          changed = true;
        }
        if (changed) {
          init = { ...init, body: JSON.stringify(payload) };
        }
      } catch {
        // Forward a non-JSON request unchanged.
      }
    }
    if (luna) {
      const headers = new Headers(input instanceof Request ? input.headers : undefined);
      new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
      headers.set("originator", "codex_cli_rs");
      headers.set("user-agent", "codex_cli_rs/0.0.0");
      headers.set("x-openai-internal-codex-responses-lite", "true");
      init = { ...init, headers };
    }
    return fetch(input, init);
  };
}

export async function createChatGptModel(modelId: ModelId, effort: ReasoningEffort) {
  const tokens = await freshTokens();
  return new ChatOpenAI({
    apiKey: tokens.access,
    model: modelId,
    useResponsesApi: true,
    zdrEnabled: true,
    streaming: true,
    configuration: {
      baseURL: CODEX_BASE_URL,
      defaultHeaders: {
        "chatgpt-account-id": tokens.accountId,
        originator: "deepagents-prototype",
        "OpenAI-Beta": "responses=experimental",
      },
      fetch: createCodexFetch(modelId, effort),
    },
  });
}

export async function getSavedIdentity(): Promise<{ email: string | null; planType: string | null }> {
  const tokens = await readTokens();
  return { email: tokens?.email ?? null, planType: tokens?.planType ?? null };
}
