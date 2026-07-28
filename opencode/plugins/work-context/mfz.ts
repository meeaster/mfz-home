import { spawn } from "node:child_process";

export type MfzRunner = (arguments_: readonly string[]) => Promise<unknown>;

const OUTPUT_LIMIT = 1024 * 1024;

export const runMfz: MfzRunner = async (arguments_) =>
  new Promise((resolve, reject) => {
    const child = spawn("mfz", arguments_, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const append = (target: "stdout" | "stderr", chunk: Buffer) => {
      if (target === "stdout") stdout += chunk.toString();
      else stderr += chunk.toString();
      if (Buffer.byteLength(stdout) + Buffer.byteLength(stderr) > OUTPUT_LIMIT) {
        child.kill();
        reject(new Error("mfz work output exceeded 1 MiB"));
      }
    };

    child.once("error", reject);
    child.stdout.on("data", (chunk: Buffer) => append("stdout", chunk));
    child.stderr.on("data", (chunk: Buffer) => append("stderr", chunk));
    child.once("close", (code) => {
      try {
        const value = JSON.parse(stdout) as unknown;
        if (code === 0) resolve(value);
        else reject(new Error(`mfz work exited with ${code}: ${stderr.trim() || stdout.trim()}`));
      } catch {
        reject(new Error(`mfz work returned invalid JSON: ${stderr.trim() || stdout.trim()}`));
      }
    });
  });
