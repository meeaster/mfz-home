import net from "node:net";

import type { HerdrState } from "./state.js";

const SOURCE = "herdr:opencode";
const AGENT = "opencode";

export type HerdrEnvironment = {
  paneID: string;
  socketPath: string;
};

type HerdrRequest =
  | {
      method: "pane.report_agent_session";
      params: { agent_session_id: string; session_start_source: "select" };
    }
  | {
      method: "pane.report_agent";
      params: { state: HerdrState; agent_session_id: string };
    };

export function herdrEnvironment(env = process.env): HerdrEnvironment | undefined {
  if (env.HERDR_ENV !== "1" || !env.HERDR_PANE_ID || !env.HERDR_SOCKET_PATH) return undefined;
  return { paneID: env.HERDR_PANE_ID, socketPath: env.HERDR_SOCKET_PATH };
}

export function createReporter(environment: HerdrEnvironment) {
  let sequence = Date.now() * 1000;
  let chain = Promise.resolve();

  const request = (input: HerdrRequest) => {
    const pending = chain.then(() => requestOnce(environment, input, ++sequence));
    chain = pending.catch(() => undefined);
    return pending;
  };

  return {
    session(sessionID: string) {
      return request({
        method: "pane.report_agent_session",
        params: { agent_session_id: sessionID, session_start_source: "select" }
      });
    },
    state(state: HerdrState, sessionID: string) {
      return request({ method: "pane.report_agent", params: { state, agent_session_id: sessionID } });
    }
  };
}

function requestOnce(environment: HerdrEnvironment, input: HerdrRequest, sequence: number) {
  const endpoint = process.platform === "win32" ? `\\\\.\\pipe\\${environment.socketPath}` : environment.socketPath;
  const request = {
    id: `${SOURCE}:tui:${Date.now()}:${Math.floor(Math.random() * 1_000_000).toString().padStart(6, "0")}`,
    method: input.method,
    params: {
      pane_id: environment.paneID,
      source: SOURCE,
      agent: AGENT,
      seq: sequence,
      ...input.params
    }
  };

  return new Promise<void>((resolve) => {
    const client = net.createConnection(endpoint, () => client.write(`${JSON.stringify(request)}\n`));
    const finish = () => {
      client.destroy();
      resolve();
    };
    client.setTimeout(500, finish);
    client.on("data", finish);
    client.on("error", finish);
    client.on("end", finish);
    client.on("close", resolve);
  });
}
