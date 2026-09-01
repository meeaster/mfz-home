import { describe, expect, it } from "vitest";

import plugin, { loadPrompts, loadSkills, parseSkillFile, registerAgents, registerSkills } from "../src/index.js";

describe("pstack plugin", () => {
  it("exports a loadable server plugin", () => {
    expect(plugin.id).toBe("pstack");
    expect(plugin.setup).toBeTypeOf("function");
  });

  it("loads and registers the explicit mode and namespaced skill set", async () => {
    const skills = await loadSkills();
    const registered: typeof skills = [];
    registerSkills({ add: (skill) => registered.push(skill) }, skills);

    expect(registered.map((skill) => skill.id)).toContain("poteto-mode");
    expect(registered.map((skill) => skill.id)).toContain("pstack-how");
    expect(registered.map((skill) => skill.id)).toContain("pstack-principle-laziness-protocol");
    expect(registered.filter((skill) => skill.id.startsWith("pstack-")).length).toBeGreaterThan(20);
    expect(registered.find((skill) => skill.id === "poteto-mode")).toMatchObject({ autoinvoke: false });
    expect(registered.every((skill) => !Object.hasOwn(skill, "slash"))).toBe(true);
    expect(registered.every((skill) => skill.location.endsWith("SKILL.md"))).toBe(true);
  });

  it("rejects malformed owned frontmatter", () => {
    expect(() => parseSkillFile("# Missing frontmatter")).toThrow("missing YAML frontmatter");
    expect(() => parseSkillFile("---\nname: demo\nslash: maybe\n---\nBody")).toThrow(
      "Expected slash to be true or false",
    );
  });

  it("registers inherited-model subagents with the expected permissions", async () => {
    const prompts = await loadPrompts();
    const definitions = new Map<
      string,
      {
        description?: string;
        hidden: boolean;
        mode: "subagent" | "primary" | "all";
        permissions: Array<{ action: string; resource: string; effect: "allow" | "ask" | "deny" }>;
        system?: string;
      }
    >();

    registerAgents(
      {
        update(id, update) {
          const agent = { hidden: false, mode: "all" as const, permissions: [] };
          update(agent);
          definitions.set(id, agent);
        },
      },
      prompts,
    );

    expect(definitions.get("pstack-poteto-agent")).toMatchObject({
      mode: "subagent",
      system: prompts.potetoAgent,
    });
    expect(definitions.get("pstack-comment-sicko")).toMatchObject({
      mode: "subagent",
      permissions: [{ action: "edit", resource: "*", effect: "deny" }],
      system: prompts.commentSicko,
    });
  });
});
