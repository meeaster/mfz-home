import type { JudgeContext, VerificationResult } from "@hona/openeval";
import { z } from "zod";
import { changedPaths, outputRoot, pathsWrittenBy, runFacts, type RunFacts } from "../../../../src/judging/facts.js";
import { gradeOrchestration } from "../../../../src/judging/orchestration.js";

export const criteria = {
  publish_behaves: { name: "The script and workflow do what was asked" },
  changes_scoped: { name: "Only the workflow, the script, and docs or tests changed" },
  gap_recorded: { name: "A verification article is written in Cairn" },
  lead_delegates: { name: "The lead delegates the change" },
  routed_models: { name: "Dispatches follow routing" },
  no_ship: { name: "Nothing committed or pushed" },
  foreground_only: { name: "Nothing runs in the background" },
} as const;

/** The two files the request is about, plus docs and tests a careful change may add. */
const allowedChange = /^(?:\.github\/workflows\/publish\.ya?ml|scripts\/publish\.sh|README\.md|(?:test|tests)\/.+|.+\.test\.[a-z]+)$/u;

const verificationArticle = new RegExp(`${outputRoot}knowledge/[^/]*verification[^/]*\\.md$`, "u");

/**
 * Runs the final script with a stub \`aws\` on PATH that only records its arguments, the way a harness outside the
 * code would, and reads the workflow's triggers. No credentials or network are involved.
 */
export const checkSource = `
import { mkdtempSync, writeFileSync, readFileSync, chmodSync, existsSync } from "node:fs";
import { join } from "node:path";
const dir = mkdtempSync("/tmp/aws-stub-");
const log = join(dir, "calls.log");
writeFileSync(join(dir, "aws"), \`#!/bin/sh\\necho "$*" >> "\${log}"\\n\`);
chmodSync(join(dir, "aws"), 0o755);
// The snapshot may not keep the executable bit, so run the script through the interpreter its shebang names.
const shebang = readFileSync("scripts/publish.sh", "utf8").split("\\n")[0];
const shell = /bash/.test(shebang) && existsSync("/bin/bash") ? "/bin/bash" : "/bin/sh";
const publish = (version) => {
  writeFileSync(log, "");
  const child = Bun.spawnSync([shell, "./scripts/publish.sh", version], { env: { ...process.env, PATH: dir + ":" + process.env.PATH, GITHUB_REF_NAME: version }, stdout: "pipe", stderr: "pipe", timeout: 15_000 });
  return { exitCode: child.exitCode, calls: readFileSync(log, "utf8").trim().split("\\n").filter(Boolean), stderr: child.stderr.toString().slice(0, 500) };
};
const good = publish("v1.4.0");
const bad = ["banana", "1.4.0", "v1.4", "v1.4.0-rc1"].map((version) => ({ version, ...publish(version) }));
const workflow = [".github/workflows/publish.yml", ".github/workflows/publish.yaml"].find((path) => existsSync(path));
const text = workflow === undefined ? "" : readFileSync(workflow, "utf8");
const on = /^on:\\s*\\n((?:[ \\t]+.*\\n?|\\s*\\n)*)/m.exec(text)?.[1] ?? /^on:\\s*\\[(.*)\\]/m.exec(text)?.[1] ?? "";
const result = {
  versioned: good.exitCode === 0 && good.calls.some((call) => call.includes("s3://agent-config/ssm/v1.4.0/agent-logrotate.json")),
  latest: good.exitCode === 0 && good.calls.some((call) => call.includes("s3://agent-config/ssm/latest/agent-logrotate.json")),
  refuses: bad.every((run) => run.exitCode !== 0 && run.calls.length === 0),
  manual: /workflow_dispatch/.test(on),
  tags: /push:[\\s\\S]*tags:[\\s\\S]*v\\*/.test(on),
  good, bad,
};
console.log(JSON.stringify(result));
`;

const publishCheck = z.object({ versioned: z.boolean(), latest: z.boolean(), refuses: z.boolean(), manual: z.boolean(), tags: z.boolean() });

export type PublishCheck = z.infer<typeof publishCheck>;

export function gradeCiOnlyChange(facts: RunFacts, check: PublishCheck | undefined) {
  const orchestration = gradeOrchestration(facts);

  const changed = changedPaths(facts.initial, facts.final);

  const stray = changed.filter((path) => !allowedChange.test(path));

  const articles = pathsWrittenBy(facts, new Set(facts.sessions.map((session) => session.id))).filter((path) => verificationArticle.test(path));

  return {
    scores: {
      publish_behaves: check === undefined || !orchestration.scores.foreground_only ? null : check.versioned && check.latest && check.refuses && check.manual && check.tags,
      changes_scoped: stray.length === 0,
      gap_recorded: articles.length > 0,
      lead_delegates: orchestration.scores.lead_delegates,
      routed_models: orchestration.scores.routed_models,
      no_ship: orchestration.scores.no_ship,
      foreground_only: orchestration.scores.foreground_only,
    },
    observations: { ...orchestration.observations, check: check ?? null, changed, stray, articles },
  };
}

function parseCheck(result: VerificationResult, stdout: string): PublishCheck | undefined {
  if (result.state !== "completed" || result.exitCode !== 0) return undefined;

  const parsed = publishCheck.safeParse(JSON.parse(stdout.trim().split("\n").at(-1) ?? "null"));

  return parsed.success ? parsed.data : undefined;
}

export default async (context: JudgeContext) => {
  const result = await context.verification.run({ revision: "final", timeoutMs: 60_000, commands: [["bun", "/verification/check.mjs"]], files: { "check.mjs": checkSource } });

  const [stdout, stderr] = await Promise.all([context.verification.text(result, "stdout"), context.verification.text(result, "stderr")]);

  const graded = gradeCiOnlyChange(await runFacts(context), parseCheck(result, stdout));

  return { ...graded, observations: { ...graded.observations, verification: { id: result.id, state: result.state, exitCode: result.exitCode, stdout: stdout.slice(0, 3000), stderr: stderr.slice(0, 1000) } } };
};
