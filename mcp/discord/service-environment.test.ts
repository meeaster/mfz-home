import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const servicePath = new URL(
  "../../profiles/personal/.config/systemd/user/discord-mcp.service",
  import.meta.url
);

describe("Discord systemd environment boundary", () => {
  test("passes only the allowlisted child environment", async () => {
    const unit = await readFile(servicePath, "utf8");

    const execLine = unit
      .split("\n")
      .find((line) => line.startsWith("ExecStart=/usr/bin/zsh -c "));

    expect(execLine).toBeDefined();
    expect(execLine).toContain("/usr/bin/env -i");
    expect(execLine).toContain('DISCORD_BOT_TOKEN="$DISCORD_BOT_TOKEN"');
    expect(execLine).not.toContain("set -a");

    const home = await mkdtemp("/tmp/opencode/discord-mcp-service-");
    const secretDirectory = join(home, ".mindframe-z", "secrets");
    const nodeDirectory = join(home, ".local", "share", "mise", "shims");
    const fakeNode = join(nodeDirectory, "node");

    try {
      await mkdir(secretDirectory, { recursive: true });
      await mkdir(nodeDirectory, { recursive: true });
      await writeFile(
        join(secretDirectory, "zsh.env"),
        "DISCORD_BOT_TOKEN=synthetic-token\nUNRELATED_SENTINEL=must-not-reach-child\nexport DISCORD_BOT_TOKEN UNRELATED_SENTINEL\n"
      );
      await writeFile(
        fakeNode,
        "#!/usr/bin/zsh\nif [[ \"${DISCORD_BOT_TOKEN:-}\" != synthetic-token ]]; then exit 10; fi\nif [[ -n \"${UNRELATED_SENTINEL:-}\" ]]; then exit 11; fi\nprint -r -- \"$HOME|$PATH|$DISCORD_MCP_HOST|$DISCORD_MCP_PORT|$DISCORD_DESTINATIONS_JSON|$DISCORD_DEFAULT_DESTINATION\"\n"
      );
      await chmod(fakeNode, 0o755);

      const script = execLine
        ?.slice("ExecStart=/usr/bin/zsh -c ".length + 1, -1)
        .replaceAll("%h", home);

      if (script === undefined) throw new Error("service ExecStart was not found");

      const result = await runZsh(script, home);

      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe(
        `${home}|${home}/.local/share/mise/shims:${home}/.local/bin:${home}/.opencode/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin|127.0.0.1|29980|{"opencode":"1550738885615554621"}|opencode`
      );
      expect(result.stderr).toBe("");
    } finally {
      await rm(home, { recursive: true, force: true });
    }
  });
});

function runZsh(script: string, home: string): Promise<{
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;
}> {
  return new Promise((resolve, reject) => {
    const child = spawn("/usr/bin/zsh", ["-c", script], {
      env: {
        HOME: home,
        PATH: `${home}/.local/share/mise/shims:${home}/.local/bin:${home}/.opencode/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`,
        DISCORD_MCP_HOST: "127.0.0.1",
        DISCORD_MCP_PORT: "29980",
        DISCORD_DESTINATIONS_JSON: '{"opencode":"1550738885615554621"}',
        DISCORD_DEFAULT_DESTINATION: "opencode"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => stdout.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(Buffer.from(chunk)));
    child.once("error", reject);
    child.once("exit", (exitCode) => {
      resolve({
        exitCode,
        stdout: Buffer.concat(stdout).toString(),
        stderr: Buffer.concat(stderr).toString()
      });
    });
  });
}
