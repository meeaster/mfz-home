import type { EnvironmentName, EnvironmentSpec } from "./types.js";

export const environmentNames: readonly EnvironmentName[] = ["minimal", "personal"];

export function isEnvironmentName(value: string): value is EnvironmentName {
  return environmentNames.some((name) => name === value);
}

export function environmentSpec(
  sourceHome: string,
  sourceCommit: string,
  profile: EnvironmentName,
): EnvironmentSpec {
  return {
    sourceHome,
    sourceCommit,
    profile,
    overlays: [profile],
  };
}
