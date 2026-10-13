import { expect, test } from "vitest"
import { COMPACTOR, SUBAGENT } from "./prompt.js"

// The intro names "# Turns" and "# Compactions" in passing; the prompts are cut from the headings on their own lines.
test("subagents get the guide to the view", () => {
  expect(SUBAGENT).toContain("# The view")
  expect(SUBAGENT).toContain("zoom(id, n)")
})

test("the compactor gets the view and the compaction rules, without the turn instructions or tools", () => {
  expect(COMPACTOR).toContain("# The view")
  expect(COMPACTOR).toContain("# Compactions")
  expect(COMPACTOR).not.toContain("# Turns")
  expect(COMPACTOR).not.toContain("zoom(id, n)")
})
