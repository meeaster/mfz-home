import { afterEach, expect, test } from "vitest"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { SubagentLogs } from "./subagent-logs.js"

const directories: string[] = []

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true })
})

const fresh = (): string => {
  const directory = mkdtempSync(join(tmpdir(), "optchat-agents-"))

  directories.push(directory)

  return directory
}

test("a subagent's chat is found by title, agent name or session ID, and survives a restart", () => {
  const directory = fresh()
  const logs = new SubagentLogs(directory)

  logs.register("ses_a", "reviewer", "Review stats command")
  logs.append("ses_a", { kind: "user", text: "Check rounding", source: "1" })
  logs.append("ses_a", { kind: "agent", text: "Rounding is floored", source: "2" })
  logs.append("ses_a", { kind: "agent", text: "Rounding is floored", source: "2" })

  const reopened = new SubagentLogs(directory)

  for (const name of ["Review stats command", "reviewer", "ses_a"]) {
    expect(reopened.render(name)).toBe("[reviewer: Review stats command] (ses_a)\nuser: Check rounding\nagent: Rounding is floored")
  }

  expect(reopened.label("ses_a")).toBe("reviewer: Review stats command")
})

test("an unknown agent name lists the agents that exist", () => {
  const logs = new SubagentLogs(fresh())

  logs.register("ses_b", "explore", "Find parsers")

  expect(logs.render("nobody")).toBe('zoom: no agent named "nobody". Known agents: explore: Find parsers (ses_b)')
})

test("the most recent agent wins when several share a name", () => {
  const logs = new SubagentLogs(fresh())

  logs.register("ses_1", "reviewer", "First review")
  logs.register("ses_2", "reviewer", "Second review")

  expect(logs.render("reviewer").startsWith("[reviewer: Second review]")).toBe(true)
})
