export type ModelAlias = { providerID: string; modelID: string };

export type ModelAliases = Record<string, ModelAlias>;

/** The models.dev provider that prices a recorded provider's models. Claude Code runs Anthropic's models. */
export function catalogProviderID(providerID: string) {
  return providerID === "claude-code" ? "anthropic" : providerID;
}
