import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Plugin, type Skill } from "@opencode-ai/plugin";

type SkillRegistry = {
  add(skill: Skill.Info): void;
};

type SkillInput = {
  id: string;
  name: string;
  description?: string;
  slash?: boolean;
  autoinvoke?: boolean;
  location: string;
  content: string;
};

type AgentDefinition = {
  description?: string;
  hidden: boolean;
  mode: "subagent" | "primary" | "all";
  permissions: Array<{ action: string; resource: string; effect: "allow" | "ask" | "deny" }>;
  system?: string;
};

type AgentRegistry = {
  update(id: string, update: (agent: AgentDefinition) => void): void;
};

export type PstackPrompts = {
  commentSicko: string;
  potetoAgent: string;
};

export const skillDirectory = fileURLToPath(new URL("../skills", import.meta.url));

export async function loadSkills(directory = skillDirectory): Promise<Skill.Info[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const skills = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(async (entry) => {
        const id = entry.name;
        const location = path.join(directory, id, "SKILL.md");
        const parsed = parseSkillFile(await readFile(location, "utf8"));
        if (parsed.name !== id) {
          throw new Error(`Skill name "${parsed.name}" must match directory ID "${id}".`);
        }

        const skill: SkillInput = {
          id,
          name: parsed.name,
          location,
          content: parsed.content,
        };
        if (parsed.description !== undefined) skill.description = parsed.description;
        if (parsed.slash !== undefined) skill.slash = parsed.slash;
        if (parsed.autoinvoke !== undefined) skill.autoinvoke = parsed.autoinvoke;
        // SAFETY: The parser validates every field and the directory check establishes the branded skill ID.
        return skill as Skill.Info;
      }),
  );
  return skills;
}

export function registerSkills(registry: SkillRegistry, skills: Skill.Info[]) {
  for (const skill of skills) registry.add(skill);
}

export function registerAgents(agents: AgentRegistry, prompts: PstackPrompts) {
  agents.update("pstack-poteto-agent", (agent) => {
    agent.description = "Runs delegated work using the poteto-mode workflow and its packaged pstack skills.";
    agent.hidden = false;
    agent.mode = "subagent";
    agent.system = prompts.potetoAgent;
  });

  agents.update("pstack-comment-sicko", (agent) => {
    agent.description = "Read-only reviewer that finds comments and suppressions which should be deleted or encoded in code.";
    agent.hidden = false;
    agent.mode = "subagent";
    agent.permissions = [...agent.permissions, { action: "edit", resource: "*", effect: "deny" }];
    agent.system = prompts.commentSicko;
  });
}

export async function loadPrompts(): Promise<PstackPrompts> {
  const [potetoAgent, commentSicko] = await Promise.all([
    readFile(new URL("../agents/poteto-agent.md", import.meta.url), "utf8"),
    readFile(new URL("../agents/comment-sicko.md", import.meta.url), "utf8"),
  ]);
  return { potetoAgent, commentSicko };
}

const plugin = Plugin.define({
  id: "pstack",
  setup: async (context) => {
    const [prompts, skills] = await Promise.all([loadPrompts(), loadSkills()]);
    await context.skill.transform((registry) => registerSkills(registry, skills));
    await context.agent.transform((agents) => registerAgents(agents, prompts));
  },
});

export default plugin;

type ParsedSkill = {
  name: string;
  description?: string;
  slash?: boolean;
  autoinvoke?: boolean;
  content: string;
};

export function parseSkillFile(source: string): ParsedSkill {
  if (!source.startsWith("---\n")) throw new Error("Skill is missing YAML frontmatter.");
  const end = source.indexOf("\n---\n", 4);
  if (end === -1) throw new Error("Skill frontmatter is not closed.");

  const frontmatter = source.slice(4, end);
  const content = source.slice(end + 5).trimStart();
  let name: string | undefined;
  let description: string | undefined;
  let slash: boolean | undefined;
  let autoinvoke: boolean | undefined;

  for (const line of frontmatter.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("name:")) name = parseString(trimmed.slice(5));
    if (trimmed.startsWith("description:")) description = parseString(trimmed.slice(12));
    if (trimmed.startsWith("slash:")) slash = parseBoolean(trimmed.slice(6), "slash");
    if (trimmed.startsWith("opencode/autoinvoke:")) {
      autoinvoke = parseBoolean(trimmed.slice(20), "opencode/autoinvoke");
    }
  }

  if (!name) throw new Error("Skill frontmatter is missing name.");
  return { name, description, slash, autoinvoke, content };
}

function parseString(source: string): string {
  const value = source.trim();
  if (!value.startsWith('"')) return value;
  // SAFETY: A valid JSON value beginning with a double quote can only decode to a string.
  return JSON.parse(value) as string;
}

function parseBoolean(source: string, field: string): boolean {
  const value = source.trim();
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`Expected ${field} to be true or false.`);
}
