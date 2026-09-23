import { expect, test } from "bun:test";
import { parsePresets, parseSelection, resolveAgents, selectPreset } from "./presets.js";

const source = `${JSON.stringify(
  {
    default: "gpt6",
    roles: ["orchestrator", "scribe", "explore"],
    presets: {
      gpt6: {
        candidate: "openai/gpt-6-sol#medium",
        judge: "openai/gpt-6-astra#medium",
        agents: {
          orchestrator: "openai/gpt-6-sol#medium",
          scribe: "openai/gpt-6-luna#high",
          explore: "openai/gpt-6-luna#high",
        },
      },
      glm: {
        candidate: "zai-coding-plan/glm-5.3#high",
        judge: "zai-coding-plan/glm-5.3-flash#high",
        agents: { orchestrator: "zai-coding-plan/glm-5.3#high", "*": "zai-coding-plan/glm-5.3-flash#high" },
      },
    },
  },
  null,
  2,
)}\n`;

const file = parsePresets(source);

test("parses presets with their candidate and judge models", () => {
  expect(file.default).toBe("gpt6");

  expect(file.presets.gpt6?.candidate).toBe("openai/gpt-6-sol#medium");

  expect(file.presets.gpt6?.judge).toBe("openai/gpt-6-astra#medium");

  expect(file.presets.gpt6?.agents.orchestrator).toBe("openai/gpt-6-sol#medium");

  expect(file.presets.glm?.candidate).toBe("zai-coding-plan/glm-5.3#high");

  expect(file.presets.glm?.judge).toBe("zai-coding-plan/glm-5.3-flash#high");
});

test("rejects an unknown default preset", () => {
  const broken = source.replace('"default": "gpt6"', '"default": "missing"');

  expect(() => parsePresets(broken)).toThrow(/default preset missing/);
});

test("rejects a candidate that is not a provider/model ref", () => {
  const broken = source.replace("zai-coding-plan/glm-5.3#high", "glm-5.3#high");

  expect(() => parsePresets(broken)).toThrow(/not a provider\/model ref/);
});

test("rejects an agent role outside the declared roles", () => {
  const broken = source.replace('"scribe": "openai/gpt-6-luna#high"', '"scribbe": "openai/gpt-6-luna#high"');

  expect(() => parsePresets(broken)).toThrow(/unknown role scribbe/);
});

test("expands the wildcard fallback over every declared role", () => {
  const glm = selectPreset(file, "glm");

  expect(resolveAgents(glm, file.roles)).toEqual({
    orchestrator: "zai-coding-plan/glm-5.3#high",
    scribe: "zai-coding-plan/glm-5.3-flash#high",
    explore: "zai-coding-plan/glm-5.3-flash#high",
  });
});

test("an explicit role entry wins over the wildcard", () => {
  const gpt6 = selectPreset(file, "gpt6");

  const resolved = resolveAgents({ ...gpt6, agents: { ...gpt6.agents, "*": "openai/gpt-6-luna#low" } }, file.roles);

  expect(resolved.orchestrator).toBe("openai/gpt-6-sol#medium");

  expect(resolved.scribe).toBe("openai/gpt-6-luna#high");
});

test("a preset without a fallback must name every role", () => {
  const gpt6 = selectPreset(file, "gpt6");

  const partial = { ...gpt6, agents: { orchestrator: gpt6.agents.orchestrator ?? "" } };

  expect(() => resolveAgents(partial, file.roles)).toThrow(/no "\*" fallback/);
});

test("selecting an unknown preset names the available presets", () => {
  expect(() => selectPreset(file, "claude")).toThrow(/Available presets: gpt6, glm/);
});

test("parses a selection document and rejects a malformed one", () => {
  expect(parseSelection('{"preset": "glm"}')).toBe("glm");

  expect(() => parseSelection('{"name": "glm"}')).toThrow(/preset/);
});
