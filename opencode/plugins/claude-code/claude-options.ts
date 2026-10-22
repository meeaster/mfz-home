// Claude Agent SDK options shared by every Claude Code run this plugin starts, so turns and compactions see the
// same Claude Code setup.
import type { Options } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

const MCP_TOOL_TIMEOUT_MS = 24 * 60 * 60_000;

export const Settings = z.object({
  cwd: z.string().optional(),
  executable: z.string().optional(),
  permissionMode: z.enum(["default", "acceptEdits", "bypassPermissions", "plan", "dontAsk", "auto"]).optional(),
  effort: z.enum(["low", "medium", "high", "xhigh", "max"]).optional(),
});

export type Settings = z.infer<typeof Settings>;

export function claudeOptions(settings: Settings, model: string, openCodeSession: string | undefined): Options {
  const base = {
    ...process.env,
    // OpenCode subagents can run for a long time.
    MCP_TOOL_TIMEOUT: String(MCP_TOOL_TIMEOUT_MS),
  };

  // Cairn links a Claude Code session to the OpenCode session that spawned it.
  const env = openCodeSession === undefined ? base : { ...base, OPENCODE_SESSION_ID: openCodeSession };

  const options: Options = {
    model,
    env,
    settingSources: ["user", "project", "local"],
    systemPrompt: { type: "preset", preset: "claude_code" },
  };

  if (settings.permissionMode !== undefined) options.permissionMode = settings.permissionMode;

  if (settings.cwd !== undefined) options.cwd = settings.cwd;

  if (settings.executable !== undefined) options.pathToClaudeCodeExecutable = settings.executable;

  if (settings.effort !== undefined) options.effort = settings.effort;

  return options;
}
