import { array, boolean, decodeJson, json, object, record, string, type Infer } from "apps";

// The local OpenCode background service. Its port follows the release channel, and its password
// is saved in the service config, so both survive restarts (`opencode service get password`).
export const origin = "http://127.0.0.1:49374";
export const host = "127.0.0.1:49374";

export interface Client {
  readonly fetch: typeof fetch;
  readonly signal?: AbortSignal | undefined;
  readonly password: string;
}

export const Start = object({
  directory: string({ minLength: 1 }),
  prompt: string({ minLength: 1 }),
  agent: string().optional(),
  // Without a model, sessions use defaultModel: the OpenCode default here is a blocked free model.
  model: object({ providerID: string(), id: string(), variant: string().optional() }).optional(),
  title: string().optional(),
});

// Opus 5.5 through the Claude agent provider.
export const defaultModel = { providerID: "claude-agent", id: "opus", variant: "medium" };

export const SessionRef = object({ sessionID: string() });

export const Result = object({
  sessionID: string(),
  running: boolean(),
  outcome: string().optional(),
  error: string().optional(),
  reply: string().optional(),
});

const Info = object({ version: string() });
const Created = object({ data: object({ id: string() }) });
const Active = object({ data: record(json()) });

const Messages = object({
  data: array(
    object({
      type: string(),
      outcome: string().optional(),
      error: object({ message: string() }).optional(),
      content: array(object({ type: string(), text: string().optional() })).optional(),
    }),
  ),
});

export function basic(password: string): string {
  // Executor swaps the password handle inside a Basic header for the real value.
  return `Basic ${btoa(`opencode:${password}`)}`;
}

function request(client: Client, method: string, path: string, body?: unknown) {
  return client.fetch(`${origin}${path}`, {
    method,
    ...(client.signal === undefined ? {} : { signal: client.signal }),
    headers: {
      authorization: basic(client.password),
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

export async function info(client: Client) {
  return decodeJson(await request(client, "GET", "/api/info"), Info);
}

export async function startSession(client: Client, input: Infer<typeof Start>) {
  const created = await decodeJson(
    await request(client, "POST", "/api/session", {
      location: { directory: input.directory },
      ...(input.agent === undefined ? {} : { agent: input.agent }),
      model: input.model ?? defaultModel,
      ...(input.title === undefined ? {} : { title: input.title }),
    }),
    Created,
  );

  const sessionID = created.data.id;
  const prompted = await request(client, "POST", `/api/session/${sessionID}/prompt`, {
    text: input.prompt,
  });

  if (!prompted.ok) throw new Error(`OpenCode refused the prompt with status ${prompted.status}`);

  return { sessionID };
}

// OpenCode ends every turn with an `idle` message carrying its outcome and any error, so a
// session is finished once it is no longer active and its newest message is that marker.
export async function sessionResult(
  client: Client,
  sessionID: string,
): Promise<Infer<typeof Result>> {
  const [active, messages] = await Promise.all([
    request(client, "GET", "/api/session/active").then((response) => decodeJson(response, Active)),
    request(client, "GET", `/api/session/${sessionID}/message?limit=10&order=desc`).then(
      (response) => decodeJson(response, Messages),
    ),
  ]);

  const idle = messages.data[0]?.type === "idle" ? messages.data[0] : undefined;

  if (sessionID in active.data || idle === undefined) return { sessionID, running: true };

  const reply = messages.data
    .find((message) => message.type === "assistant")
    ?.content?.flatMap((part) => (part.type === "text" && part.text !== undefined ? [part.text] : []))
    .join("\n\n");

  return {
    sessionID,
    running: false,
    ...(idle.outcome === undefined ? {} : { outcome: idle.outcome }),
    ...(idle.error === undefined ? {} : { error: idle.error.message }),
    ...(reply === undefined || reply === "" ? {} : { reply }),
  };
}
