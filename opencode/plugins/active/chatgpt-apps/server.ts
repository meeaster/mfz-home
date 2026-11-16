import { Plugin } from "@opencode/plugin";
import { z } from "zod";

import { CodexAuth } from "./codex-auth.js";
import { AppsClient, AppsProxy, type Connector } from "./proxy.js";

// Connectors that run ChatGPT and Codex themselves rather than an outside app; never registered.
const INTERNAL_CONNECTORS = new Set([
  "codex-document-control",
  "hotline",
  "plugin-management",
  "safety-settings",
  "search-service",
]);

// Module scope, so every location's plugin instance shares one token refresher and one cached tool list.
const client = new AppsClient({ auth: new CodexAuth() });

const Options = z
  .object({
    // Connectors to connect at startup, by slug ("google-calendar"), display name, or connector ID. Every other
    // connector is registered disabled, so it can still be connected for one session from the MCP dialog.
    connectors: z.array(z.string()).default([]),
  })
  .strict();

export function slug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function selects(selector: string, connector: Connector) {
  const wanted = selector.toLowerCase();

  return wanted === connector.id.toLowerCase() || wanted === connector.name.toLowerCase() || wanted === slug(connector.name);
}

async function register(context: Plugin.Context, base: string, selectors: string[]) {
  const connectors = (await client.connectors()).filter((connector) => !INTERNAL_CONNECTORS.has(slug(connector.name)));
  const unmatched = selectors.filter((selector) => !connectors.some((connector) => selects(selector, connector)));

  if (unmatched.length > 0)
    console.warn(`[chatgpt-apps] no linked ChatGPT connector matches: ${unmatched.join(", ")}`);

  await context.mcp.transform((editor) => {
    for (const connector of connectors) {
      editor.set(`chatgpt-${slug(connector.name)}`, {
        type: "remote",
        url: `${base}/c/${encodeURIComponent(connector.id)}`,
        oauth: false,
        disabled: !selectors.some((selector) => selects(selector, connector)),
      });
    }
  });
}

export default Plugin.define({
  id: "chatgpt-apps",
  setup: async (context) => {
    const options = Options.parse(context.options);
    const proxy = new AppsProxy(client);
    const base = await proxy.start();

    // Listing connectors needs the network; don't hold up plugin loading for it.
    void (async () => {
      try {
        await register(context, base, options.connectors);
      } catch (error) {
        console.warn("[chatgpt-apps] could not register ChatGPT connectors:", error instanceof Error ? error.message : error);
      }
    })();

    return () => proxy.close();
  },
});
