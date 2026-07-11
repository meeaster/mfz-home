import { cleanupTranscript, defaultSourcePath } from "./cleanup.js";
import { DEFAULT_MODEL_ID, login, type ModelId, type ReasoningEffort } from "./chatgpt-codex.js";

const command = process.argv[2] ?? "cleanup";

try {
  if (command === "login") {
    const tokens = await login();
    console.log(`Logged in${tokens.email ? ` as ${tokens.email}` : ""}${tokens.planType ? ` (${tokens.planType})` : ""}.`);
    process.exit(0);
  }

  if (command !== "cleanup") {
    throw new Error(`Unknown command: ${command}`);
  }

  const args = process.argv.slice(3);
  if (args[0] === "--") {
    args.shift();
  }
  let modelId: ModelId = DEFAULT_MODEL_ID;
  if (args[0] === "gpt-5.6-luna" || args[0] === "gpt-5.6-terra") {
    modelId = args.shift() as ModelId;
  }
  const effort = args[0] ?? "low";
  if (effort !== "low" && effort !== "medium" && effort !== "high") {
    throw new Error("Cleanup effort must be low, medium, or high.");
  }
  const sourcePath = args[1] ?? defaultSourcePath;
  const modelName = modelId.replace("gpt-5.6-", "");
  const outputPath = args[2] ?? `/tmp/opencode/${sourcePath.split("/").at(-1)?.replace(/\.md$/u, "")}.cleaned-deepagents-chatgpt-${modelName}-${effort}.md`;
  await cleanupTranscript(sourcePath, outputPath, modelId, effort as ReasoningEffort);
  console.log(`Wrote ${outputPath}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
