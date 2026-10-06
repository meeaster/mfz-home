import { appendFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { main } from "../cli.ts";
import { openCairn } from "../core/db.ts";
import { requireSessionId } from "../core/lookup.ts";
import { loadAliases, pricer, type Catalog } from "./pricing.ts";
import { sessionCost } from "./rollup.ts";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

// Rates in dollars per million tokens, shaped like models.dev.
const catalog: Catalog = {
  anthropic: { models: { "claude-opus-5-5": { cost: { input: 4, output: 20, cache_read: 0.2, cache_write: 5 } } } },
  openai: {
    models: {
      "gpt-x": {
        id: "gpt-x",
        cost: { input: 1, output: 2, cache_read: 0.1, tiers: [{ input: 10, output: 20, cache_read: 1, tier: { type: "context", size: 1000 } }] },
        experimental: { modes: { fast: { cost: { input: 3, output: 6 } } } }
      }
    }
  }
};

// The fields of an OpenCode message the usage reader and the export read.
type MessageData = {
  readonly text?: string;
  readonly status?: string;
  readonly reason?: string;
  readonly content?: readonly { readonly type: string; readonly text: string }[];
  readonly model?: { readonly providerID: string; readonly id: string };
  readonly tokens?: { readonly input: number; readonly output: number; readonly reasoning: number; readonly cache: { readonly read: number; readonly write: number } };
};

type Usage = {
  readonly input_tokens: number;
  readonly output_tokens: number;
  readonly cache_read_input_tokens?: number;
  readonly cache_creation_input_tokens?: number;
  readonly cache_creation?: { readonly ephemeral_5m_input_tokens: number; readonly ephemeral_1h_input_tokens: number };
};

function workspace() {
  const base = mkdtempSync(join(tmpdir(), "cairn-usage-test-"));
  const root = join(base, "cairn");
  const projects = join(base, "projects", "-work");

  roots.push(base);
  mkdirSync(projects, { recursive: true });

  const run = (...args: string[]) =>
    main([...args, "--json"], { CAIRN_ROOT: root }, {
      stdout: () => {},
      stderr: () => {},
      stdin: () => "",
      now: () => new Date("2026-09-25T10:00:00"),
      launchIndex: () => {},
      pricing: () => catalog
    });

  // One response, written the way Claude Code writes it: a line per content block, each with the response's usage.
  const response = (transcript: string, id: string, model: string, usage: Usage, blocks = 1) => {
    for (let block = 0; block < blocks; block += 1) {
      appendFileSync(
        transcript,
        `${JSON.stringify({ type: "assistant", uuid: `${id}-${block}`, timestamp: "2026-09-25T10:00:00Z", message: { id, model, role: "assistant", content: [], usage } })}\n`
      );
    }
  };

  return {
    root,
    run,
    response,
    transcript: (sessionId: string) => join(projects, `${sessionId}.jsonl`),
    subagent: (sessionId: string, agentId: string, meta: Readonly<Record<string, string>>) => {
      const folder = join(projects, sessionId, "subagents");

      mkdirSync(folder, { recursive: true });
      writeFileSync(join(folder, `agent-${agentId}.meta.json`), JSON.stringify(meta));

      return join(folder, `agent-${agentId}.jsonl`);
    },
    cost: (key: string) => {
      const cairn = openCairn(root);
      const [harness = "", nativeId = ""] = key.split(":");

      try {
        return sessionCost(cairn, requireSessionId(cairn, { harness, nativeId }));
      } finally {
        cairn.db.close();
      }
    }
  };
}

describe("session cost", () => {
  test("a session's cost is its own calls, its subagents', and its CLI runs', at models.dev rates", () => {
    const cairn = workspace();
    const lead = cairn.transcript("ses-lead");
    const runTranscript = cairn.transcript("ses-run");

    // 100 input, 10 output, 1,000 cache reads, and 200 one-hour cache writes at twice the input rate: $0.0024.
    cairn.response(lead, "msg-1", "claude-opus-5-5", {
      input_tokens: 100,
      output_tokens: 10,
      cache_read_input_tokens: 1000,
      cache_creation_input_tokens: 200,
      cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 200 }
    }, 3);
    cairn.response(lead, "msg-2", "<synthetic>", { input_tokens: 0, output_tokens: 0 });

    // The subagent's own call is $0.0003, and its call to a model models.dev doesn't price is left out.
    const agent = cairn.subagent("ses-lead", "a17", { agentType: "Explore", description: "Price the buckets" });

    cairn.response(agent, "msg-3", "claude-opus-5-5", { input_tokens: 50, output_tokens: 5 });
    cairn.response(agent, "msg-4", "claude-mystery", { input_tokens: 1000, output_tokens: 100 });

    // A claude -p run the lead started: $0.00006.
    cairn.response(runTranscript, "msg-5", "claude-opus-5-5", { input_tokens: 10, output_tokens: 1 });
    cairn.run("session", "start", "claude-code:ses-run", "--spawned-by", "claude-code:ses-lead", "--origin", "cli");

    expect(cairn.run("session", "index", "claude-code:ses-lead", "--source", lead)).toBe(0);
    expect(cairn.run("session", "index", "claude-code:ses-run", "--source", runTranscript)).toBe(0);

    const cost = cairn.cost("claude-code:ses-lead");

    expect(cost?.own).toBeCloseTo(0.0024, 10);
    expect(cost?.subagents).toBeCloseTo(0.0003, 10);
    expect(cost?.cli_runs).toBeCloseTo(0.00006, 10);
    expect(cost?.total).toBeCloseTo(0.00276, 10);
    expect(cost?.unpriced_calls).toBe(1);
    expect(cairn.cost("claude-code:a17")?.own).toBeCloseTo(0.0003, 10);
  });

  test("an OpenCode session's cost counts its child sessions as subagents, and a completed compaction as a call", () => {
    const cairn = workspace();
    const source = join(cairn.root, "..", "opencode.db");
    const opencode = new DatabaseSync(source);
    let seq = 0;

    opencode.exec(`
      CREATE TABLE session_v2 (id TEXT PRIMARY KEY, title TEXT, parent_id TEXT, time_viewed INTEGER);
      CREATE TABLE session_message (
        id TEXT PRIMARY KEY, session_id TEXT NOT NULL, type TEXT NOT NULL, seq INTEGER NOT NULL,
        time_created INTEGER NOT NULL, time_updated INTEGER NOT NULL, data TEXT NOT NULL
      );
    `);

    const message = (session: string, type: string, data: MessageData) => {
      seq += 1;
      opencode.prepare("INSERT INTO session_message VALUES (?, ?, ?, ?, ?, ?, ?)").run(`msg_${seq}`, session, type, seq, seq, seq, JSON.stringify(data));
    };

    const call = (input: number, output: number) => ({
      model: { providerID: "openai", id: "gpt-x" },
      tokens: { input, output, reasoning: 0, cache: { read: 0, write: 0 } }
    });

    opencode.prepare("INSERT INTO session_v2 VALUES (?, ?, ?, ?)").run("ses_lead", "Log pipeline", null, 1);
    opencode.prepare("INSERT INTO session_v2 VALUES (?, ?, ?, ?)").run("ses_child", "Map the buckets", "ses_lead", null);
    message("ses_lead", "user", { text: "Where should the logs go?" });
    message("ses_lead", "assistant", { ...call(100, 10), content: [{ type: "text", text: "S3." }] });
    message("ses_lead", "compaction", { ...call(200, 20), status: "completed", reason: "auto" });
    message("ses_lead", "compaction", { ...call(999, 999), status: "failed", reason: "auto" });
    message("ses_child", "assistant", { ...call(50, 5), content: [] });
    opencode.close();

    expect(cairn.run("session", "index", "opencode:ses_lead", "--source", source)).toBe(0);

    const cost = cairn.cost("opencode:ses_lead");

    expect(cost?.own).toBeCloseTo((300 * 1 + 30 * 2) / 1e6, 12);
    expect(cost?.subagents).toBeCloseTo((50 * 1 + 5 * 2) / 1e6, 12);
    expect(cost?.cli_runs).toBe(0);
  });

  test("an alias prices a gateway's model name as the models.dev model behind it", () => {
    const cairn = workspace();
    const aliases = join(cairn.root, "aliases.json");
    const tokens = { input: 1000, output: 100, reasoning: 0, cacheRead: 0, cacheWrite: 0, cacheWriteLong: 0 };

    mkdirSync(cairn.root, { recursive: true });
    // Either target form: a string, or the session-cost-tui plugin's { providerID, modelID }.
    writeFileSync(aliases, JSON.stringify({ "gateway/opus": "anthropic/claude-opus-5-5", "gateway/sol": { providerID: "openai", modelID: "gpt-x" } }));

    const price = pricer(catalog, loadAliases(aliases));

    expect(price("gateway", "opus", tokens)).toBeCloseTo((1000 * 4 + 100 * 20) / 1e6, 12);
    expect(price("gateway", "sol", tokens)).toBeCloseTo((1000 * 1 + 100 * 2) / 1e6, 12);
    expect(price("gateway", "unmapped", tokens)).toBeNull();
    expect(loadAliases(join(cairn.root, "missing.json")).size).toBe(0);

    writeFileSync(aliases, JSON.stringify({ opus: "anthropic/claude-opus-5-5" }));

    expect(() => loadAliases(aliases)).toThrow(/<provider>\/<model>/);
  });

  test("a call past a context tier takes the tier's rates, and a model ID can name a mode", () => {
    const price = pricer(catalog);
    const tokens = { input: 0, output: 1000, reasoning: 0, cacheRead: 0, cacheWrite: 0, cacheWriteLong: 0 };

    expect(price("openai", "gpt-x", { ...tokens, input: 900 })).toBeCloseTo((900 * 1 + 1000 * 2) / 1e6, 12);
    expect(price("openai", "gpt-x", { ...tokens, input: 900, cacheRead: 200 })).toBeCloseTo((900 * 10 + 1000 * 20 + 200 * 1) / 1e6, 12);
    expect(price("openai", "gpt-x-fast", { ...tokens, input: 100 })).toBeCloseTo((100 * 3 + 1000 * 6) / 1e6, 12);
    // Reasoning is billed at the output rate when the model has no reasoning rate.
    expect(price("openai", "gpt-x", { ...tokens, output: 0, reasoning: 500 })).toBeCloseTo((500 * 2) / 1e6, 12);
    expect(price("openai", "gpt-unknown", tokens)).toBeNull();
    expect(pricer(null)("anthropic", "claude-opus-5-5", tokens)).toBeNull();
  });
});
