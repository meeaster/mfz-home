import net from "node:net";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createReporter } from "./reporter.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("createReporter", () => {
  it("serializes session and state reports for the selected root", async () => {
    mkdirSync("/tmp/opencode", { recursive: true });
    const root = mkdtempSync("/tmp/opencode/herdr-v2-");
    roots.push(root);
    const socketPath = join(root, "herdr.sock");
    const requests: Array<{
      method: string;
      params: { pane_id: string; agent_session_id: string; state?: string; seq?: number };
    }> = [];
    const server = net.createServer((socket) => {
      let input = "";
      socket.on("data", (chunk) => {
        input += chunk.toString();
        const newline = input.indexOf("\n");
        if (newline < 0) return;
        // SAFETY: The test server receives JSON emitted by createReporter and validates its observable fields below.
        requests.push(JSON.parse(input.slice(0, newline)) as (typeof requests)[number]);
        socket.end("{}\n");
      });
    });
    await new Promise<void>((resolve) => server.listen(socketPath, resolve));

    try {
      const reporter = createReporter({ paneID: "pane-1", socketPath });
      await reporter.session("ses_root");
      await reporter.state("working", "ses_root");
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }

    expect(requests).toHaveLength(2);
    expect(requests[0]).toMatchObject({
      method: "pane.report_agent_session",
      params: { pane_id: "pane-1", agent_session_id: "ses_root" }
    });
    expect(requests[1]).toMatchObject({
      method: "pane.report_agent",
      params: { pane_id: "pane-1", agent_session_id: "ses_root", state: "working" }
    });
    expect(requests[1]!.params.seq).toBeGreaterThan(requests[0]!.params.seq!);
  });
});
