import { z } from "zod";

/**
 * Model presets for the orchestrator-mode benchmark.
 *
 * A preset names the candidate session model, the judge model, and the agent
 * model overrides that must travel with them. `select-preset.ts` writes the
 * selection and the per-eval `agent-models.json` files; `benchmark.ts` reads
 * the selection so the model list and the overrides can never disagree.
 */

/** Agent model overrides keyed by role name. */
export type AgentModels = Record<string, string>;

export type Preset = {
  /** Candidate session model, `provider/model` or `provider/model#variant`. */
  candidate: `${string}/${string}`;
  /** Judge model for the preset, `provider/model` or `provider/model#variant`. */
  judge: `${string}/${string}`;
  /** Agent overrides keyed by role, with an optional `"*"` fallback. */
  agents: AgentModels;
};

export type PresetFile = {
  /** Preset used when no selection is recorded. */
  default: string;
  /** Agent roles that every preset must cover, explicitly or through `"*"` */
  roles: readonly string[];
  presets: Record<string, Preset>;
};

const modelRef = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*(#[A-Za-z0-9._-]+)?$/, "not a provider/model ref");

const presetSchema = z.object({
  candidate: modelRef,
  judge: modelRef,
  agents: z.record(z.string(), modelRef),
});

const presetsFileSchema = z.object({
  default: z.string().min(1),
  roles: z.array(z.string().min(1)).min(1),
  presets: z.record(z.string(), presetSchema),
});

const selectionSchema = z.object({ preset: z.string().min(1) });

function parseJson<T>(schema: z.ZodType<T>, source: string): T {
  const result = schema.safeParse(JSON.parse(source));

  if (!result.success) throw new Error(z.prettifyError(result.error));

  return result.data;
}

function refOf(ref: string, label: string): `${string}/${string}` {
  // SAFETY: The schema checked the provider/model shape at the boundary.
  return ref as `${string}/${string}`;
}

/** Parse and validate a `presets.json` document. */
export function parsePresets(source: string): PresetFile {
  const file = parseJson(presetsFileSchema, source);

  const presets: Record<string, Preset> = {};

  for (const [name, preset] of Object.entries(file.presets)) {
    for (const role of Object.keys(preset.agents)) {
      if (role !== "*" && !file.roles.includes(role))
        throw new Error(`presets.${name}.agents has unknown role ${role}; add it to roles`);
    }

    presets[name] = {
      candidate: refOf(preset.candidate, `presets.${name}.candidate`),
      judge: refOf(preset.judge, `presets.${name}.judge`),
      agents: preset.agents,
    };
  }

  if (!(file.default in presets)) throw new Error(`default preset ${file.default} is not defined in presets`);

  return { default: file.default, roles: file.roles, presets };
}

/** Parse a `selected-preset.json` document written by `select-preset.ts`. */
export function parseSelection(source: string): string {
  return parseJson(selectionSchema, source).preset;
}

/** Resolve a preset by name, naming the available presets on a miss. */
export function selectPreset(file: PresetFile, name: string): Preset {
  const preset = file.presets[name];

  if (preset === undefined)
    throw new Error(`Unknown preset ${name}. Available presets: ${Object.keys(file.presets).join(", ")}`);

  return preset;
}

/**
 * Expand a preset's agent map over every declared role. `"*"` covers roles the
 * preset does not name; a preset without a fallback must name every role.
 */
export function resolveAgents<const Role extends string>(
  preset: Preset,
  roles: readonly Role[],
): Record<Role, string> {
  const fallback = preset.agents["*"];

  const entries: [Role, string][] = [];

  for (const role of roles) {
    const model = preset.agents[role] ?? fallback;

    if (model === undefined) throw new Error(`Preset does not define agent role ${role} and has no "*" fallback`);

    entries.push([role, model]);
  }

  // SAFETY: Every key comes from `roles`, so the built record is complete over Role.
  return Object.fromEntries(entries) as Record<Role, string>;
}
