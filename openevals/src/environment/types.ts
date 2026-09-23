import type { JsonValue } from "@hona/openeval";

export type EnvironmentName = "minimal" | "personal";

export type EnvironmentSpec = {
  sourceHome: string;
  sourceCommit: string;
  profile: EnvironmentName;
  overlays?: string[];
  sourceOverrides?: string[];
};

export type EnvironmentComponent =
  | "instructions"
  | "skills"
  | "commands"
  | "agents"
  | "mcp";

export type EnvironmentFile = {
  path: string;
  sha256: string;
  component: EnvironmentComponent | "config" | "manifest";
};

export type EnvironmentManifest = {
  version: 1;
  profile: EnvironmentName;
  sourceCommit: string;
  mfzVersion: string;
  openEvalVersion: string;
  overlays: string[];
  sourceOverrides?: { path: string; sha256: string }[];
  components: {
    instructions: string[];
    skills: string[];
    commands: string[];
    agents: string[];
    mcp: string[];
  };
  files: EnvironmentFile[];
};

export type MaterializedEnvironment = {
  root: string;
  workspace: string;
  manifestPath: string;
  manifest: EnvironmentManifest;
};

export type EnvironmentContractReport = {
  ok: boolean;
  errors: string[];
  manifest: EnvironmentManifest;
  files: EnvironmentFile[];
  observations: Record<string, JsonValue>;
};
