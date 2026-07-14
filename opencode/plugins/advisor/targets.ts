import process from "node:process";

export type OpenCodeAdvisorTarget = {
  harness: "opencode";
  providerID: string;
  modelID: string;
  variant?: string;
};

export type ClaudeCodeAdvisorTarget = {
  harness: "claude-code";
  modelID: string;
  effort: string;
};

export type AdvisorTarget = OpenCodeAdvisorTarget | ClaudeCodeAdvisorTarget;

function resolveOpenCodeAdvisorModel(raw: string): OpenCodeAdvisorTarget {
  const at = raw.indexOf("@");
  const variant = at >= 0 ? raw.slice(at + 1) || undefined : undefined;
  const modelPart = at >= 0 ? raw.slice(0, at) : raw;
  const slash = modelPart.indexOf("/");
  const base =
    slash <= 0
      ? { providerID: "anthropic", modelID: modelPart }
      : { providerID: modelPart.slice(0, slash), modelID: modelPart.slice(slash + 1) };
  return variant ? { harness: "opencode", ...base, variant } : { harness: "opencode", ...base };
}

function parseAdvisorTarget(raw: string): AdvisorTarget {
  const separator = raw.indexOf(":");
  const harness = raw.slice(0, separator);
  const model = raw.slice(separator + 1);
  if (separator <= 0 || model.length === 0) {
    throw new Error(`Invalid advisor target "${raw}". Use opencode:provider/model@variant or claude-code:model@effort.`);
  }
  if (harness === "opencode") return resolveOpenCodeAdvisorModel(model);
  if (harness === "claude-code") {
    const at = model.indexOf("@");
    const modelID = at >= 0 ? model.slice(0, at) : model;
    const effort = at >= 0 ? model.slice(at + 1) : "";
    if (modelID.length === 0 || effort.length === 0) {
      throw new Error(`Invalid Claude Code advisor target "${raw}". Include both model and effort.`);
    }
    return { harness, modelID, effort };
  }
  throw new Error(`Unsupported advisor harness "${harness}". Use opencode or claude-code.`);
}

export function resolveAdvisorTargets(): AdvisorTarget[] {
  const configured = process.env.OPENCODE_ADVISOR_MODELS?.trim();
  if (configured) return configured.split(",").map((target) => parseAdvisorTarget(target.trim()));
  return [resolveOpenCodeAdvisorModel(process.env.OPENCODE_ADVISOR_MODEL ?? "anthropic/claude-opus-4-8")];
}

export function modelLabel(model: { modelID: string; variant?: string }): string {
  return model.variant ? `${model.modelID}@${model.variant}` : model.modelID;
}

export function targetLabel(target: AdvisorTarget): string {
  return target.harness === "opencode"
    ? `opencode:${target.providerID}/${modelLabel(target)}`
    : `claude-code:${target.modelID}@${target.effort}`;
}

type Gpt56Tier = "luna" | "terra" | "sol";

const GPT56_TIERS: Record<Gpt56Tier, number> = { luna: 0, terra: 1, sol: 2 };

export function gpt56Tier(modelID: string | undefined): Gpt56Tier | undefined {
  const match = modelID?.match(/^gpt-5\.6-(luna|terra|sol)(?:-(?:fast|pro))?$/);
  return match?.[1] as Gpt56Tier | undefined;
}

export function advisorUnavailable(executorModelID: string | undefined, advisorModelID: string): boolean {
  const executorTier = gpt56Tier(executorModelID);
  const advisorTier = gpt56Tier(advisorModelID);
  return Boolean(executorTier && advisorTier && GPT56_TIERS[executorTier] >= GPT56_TIERS[advisorTier]);
}

export function advisorAvailabilityPrompt(executorModelID: string | undefined): string | undefined {
  let targets: AdvisorTarget[];
  try {
    targets = resolveAdvisorTargets();
  } catch {
    return undefined;
  }
  const eligible = targets.some(
    (target) => target.harness === "claude-code" || !advisorUnavailable(executorModelID, target.modelID),
  );
  if (eligible) return undefined;
  const advisor = targets.find((target): target is OpenCodeAdvisorTarget => target.harness === "opencode");
  if (!advisor) return undefined;
  return `Do not call the advisor tool: your ${executorModelID} model is equal to or stronger than the configured advisor model ${advisor.modelID}, so it cannot provide a stronger review.`;
}
