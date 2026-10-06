import type { SessionKey, SessionOrigin } from "../schemas.ts";

export type Environment = Readonly<Record<string, string | undefined>>;

// The session whose shell started a process, from the variables the process inherited. Cairn sets CAIRN_SESSION
// in every Claude Code shell, and OpenCode sets OPENCODE_SESSION_ID in every shell its sessions run. Cairn's
// OpenCode plugin removes CAIRN_SESSION from OpenCode shells, so CAIRN_SESSION, when present, is always the
// nearer of the two; an OPENCODE_SESSION_ID beside it was inherited from further up.
export function spawnerFromEnvironment(env: Environment): SessionKey | undefined {
  const cairn = env.CAIRN_SESSION;
  const separator = cairn?.indexOf(":") ?? -1;

  if (cairn !== undefined && separator > 0) {
    return { harness: cairn.slice(0, separator), nativeId: cairn.slice(separator + 1) };
  }

  const opencode = env.OPENCODE_SESSION_ID;

  return opencode === undefined || opencode === "" ? undefined : { harness: "opencode", nativeId: opencode };
}

// Claude Code's entrypoint for a session: cli for the interactive terminal, sdk-cli for claude -p, and other
// sdk-* values for the Agent SDK. Anything else, such as an editor or desktop app, is interactive.
export function claudeCodeOrigin(entrypoint: string | undefined): SessionOrigin | undefined {
  if (entrypoint === undefined || entrypoint === "") {
    return undefined;
  }

  return entrypoint.startsWith("sdk") ? "cli" : "interactive";
}

// The origin of the Claude Code process the hook runs in. Remote Control drives its sessions through the SDK, so
// their entrypoint is sdk-cli like claude -p, but it marks their environment kind as bridge.
export function claudeCodeProcessOrigin(env: Environment): SessionOrigin | undefined {
  return env.CLAUDE_CODE_ENVIRONMENT_KIND === "bridge" ? "interactive" : claudeCodeOrigin(env.CLAUDE_CODE_ENTRYPOINT);
}
