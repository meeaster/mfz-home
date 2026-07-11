import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createDeepAgent } from "deepagents";
import { createChatGptModel, type ModelId, type ReasoningEffort } from "./chatgpt-codex.js";

const DEFAULT_SOURCE = "/mnt/c/Users/chewb/VoiceNotes/Transcripts/20260711_013533_40a330836496.md";

const SYSTEM_PROMPT = `You are a light transcript copyeditor, not a summarizer.
Return only the cleaned Markdown body. Preserve every distinct idea, claim, example, alternative, question, number, proper noun, qualification, and uncertainty. Preserve names as heard; do not correct them from outside knowledge.
Add punctuation and paragraph breaks. Remove only immediate duplicated words or phrases, empty filler words, and obvious abandoned starts when they add no meaning.
Do not summarize, condense, paraphrase, reorder, combine ideas, infer facts, or turn uncertainty into certainty. Keep the output close in content to the source.`;

function splitTranscript(text: string): { frontmatter: string; body: string } {
  if (!text.startsWith("---\n")) {
    throw new Error("Transcript is missing YAML frontmatter.");
  }
  const closing = text.indexOf("\n---\n", 4);
  if (closing < 0) {
    throw new Error("Transcript frontmatter is not closed.");
  }
  return {
    frontmatter: text.slice(4, closing).trimEnd(),
    body: text.slice(closing + "\n---\n".length).trim(),
  };
}

function messageText(message: unknown): string {
  if (typeof message === "string") {
    return message;
  }
  if (Array.isArray(message)) {
    return message
      .map((block) => {
        if (block && typeof block === "object" && "text" in block) {
          const text = (block as { text?: unknown }).text;
          return typeof text === "string" ? text : "";
        }
        return "";
      })
      .join("");
  }
  return "";
}

export async function cleanupTranscript(
  sourcePath: string,
  outputPath: string,
  modelId: ModelId,
  effort: ReasoningEffort,
): Promise<void> {
  const source = splitTranscript(await readFile(sourcePath, "utf8"));
  const startedAt = Date.now();
  const agent = createDeepAgent({
    model: await createChatGptModel(modelId, effort),
    tools: [],
    systemPrompt: SYSTEM_PROMPT,
  });
  const result = await agent.invoke({
    messages: [{ role: "user", content: source.body }],
  });
  const messages = result.messages as Array<{ content?: unknown }>;
  const cleaned = messageText(messages.at(-1)?.content).trim();
  if (!cleaned) {
    throw new Error("Deep Agents returned an empty cleanup.");
  }
  const durationMs = Date.now() - startedAt;

  const metadata = [
    `cleanup_model: ${modelId}`,
    "cleanup_runner: deepagents-chatgpt-cleanup",
    "cleanup_version: light-copyedit-v1",
    `cleanup_reasoning_effort: ${effort}`,
    `cleanup_duration_ms: ${durationMs}`,
    `cleanup_processed_utc: ${new Date().toISOString()}`,
    `cleanup_source_sha256: ${createHash("sha256").update(source.body).digest("hex")}`,
  ].join("\n");
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `---\n${source.frontmatter}\n${metadata}\n---\n\n${cleaned}\n`);
}

export const defaultSourcePath = DEFAULT_SOURCE;
