import { expect, test } from "bun:test";
import { parsePresets, parseSelection, resolveAgents, selectPreset } from "./presets.js";

const source = `${JSON.stringify(
  {
    default: "luna",
    roles: ["orchestrator", "scribe", "explore"],
    presets: {
      luna: {
        candidate: "opencode-go/gpt-5.6-luna#high",
        judge: "opencode-go/gpt-5.6-luna#high",
        agents: {
          orchestrator: "opencode-go/gpt-5.6-luna#max",
          scribe: "opencode-go/gpt-5.6-luna#high",
          explore: "opencode-go/gpt-5.6-luna#high",
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
  expect(file.default).toBe("luna");

  expect(file.presets.luna?.candidate).toBe("opencode-go/gpt-5.6-luna#high");

  expect(file.presets.luna?.judge).toBe("opencode-go/gpt-5.6-luna#high");

  expect(file.presets.glm?.candidate).toBe("zai-coding-plan/glm-5.3#high");

  expect(file.presets.glm?.judge).toBe("zai-coding-plan/glm-5.3-flash#high");
});

test("rejects an unknown default preset", () => {
  const broken = source.replace('"default": "luna"', '"default": "missing"');

  expect(() => parsePresets(broken)).toThrow(/default preset missing/);
});

test("rejects a candidate that is not a provider/model ref", () => {
  const broken = source.replace("zai-coding-plan/glm-5.3#high", "glm-5.3#high");

  expect(() => parsePresets(broken)).toThrow(/not a provider\/model ref/);
});

test("rejects an agent role outside the declared roles", () => {
  const broken = source.replace('"scribe": "opencode-go/gpt-5.6-luna#high"', '"scribbe": "opencode-go/gpt-5.6-luna#high"');

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
  const luna = selectPreset(file, "luna");

  const resolved = resolveAgents({ ...luna, agents: { ...luna.agents, "*": "opencode-go/gpt-5.6-luna#low" } }, file.roles);

  expect(resolved.orchestrator).toBe("opencode-go/gpt-5.6-luna#max");

  expect(resolved.scribe).toBe("opencode-go/gpt-5.6-luna#high");
});

test("a preset without a fallback must name every role", () => {
  const luna = selectPreset(file, "luna");

  const partial = { ...luna, agents: { orchestrator: luna.agents.orchestrator ?? "" } };

  expect(() => resolveAgents(partial, file.roles)).toThrow(/no "\*" fallback/);
});

test("selecting an unknown preset names the available presets", () => {
  expect(() => selectPreset(file, "claude")).toThrow(/Available presets: luna, glm/);
});

test("parses a selection document and rejects a malformed one", () => {
  expect(parseSelection('{"preset": "glm"}')).toBe("glm");

  expect(() => parseSelection('{"name": "glm"}')).toThrow(/preset/);
});
