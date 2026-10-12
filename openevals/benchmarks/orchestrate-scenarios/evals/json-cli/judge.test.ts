import { expect, test } from "bun:test";
import { call, child, dispatch, goodRun } from "../../../../src/judging/constructed-runs.js";
import { gradeJsonCli, type CliChecks } from "./judge.js";

const working: CliChecks = { file: true, stdin: true, indent: true, invalid: true };

const allPass = { cli_works: true, lead_delegates: true, routed_models: true, reviewed: true, repairs_fresh: true, proportionate: true, no_ship: true, foreground_only: true };

test("the expected flow passes every criterion, including the lead saving notes outside the project", () => {
  expect(gradeJsonCli(goodRun(), working).scores).toEqual(allPass);
});

test("a CLI check the verification could not complete is unresolved, not failed", () => {
  expect(gradeJsonCli(goodRun(), undefined).scores.cli_works).toBeNull();
  expect(gradeJsonCli(goodRun(), { ...working, invalid: false }).scores.cli_works).toBe(false);
});

test("the lead editing project code fails delegation even when an implementer also worked", () => {
  const facts = goodRun();

  facts.tools.push(call("ses_root", "edit", { filePath: "src/cli.ts" }));

  expect(gradeJsonCli(facts, working).scores).toEqual({ ...allPass, lead_delegates: false });
});

test("a reviewer named by role alone passes on its code row's model, as the first pilot run dispatched it", () => {
  const roleOnly = goodRun();

  roleOnly.tools[4] = dispatch("ses_review", "reviewer: review JSON formatter");

  expect(gradeJsonCli(roleOnly, working).scores).toEqual(allPass);
});

test("a failed dispatch still links to its child session through the error", () => {
  const failed = goodRun();

  failed.tools[2] = { ...call("ses_root", "subagent", { agent: "general", description: "implementer: build the JSON CLI", prompt: "…" }), status: "failed", error: { type: "tool.execution", message: "Subagent failed (sessionID: ses_build): Request failed: 400" } };

  const graded = gradeJsonCli(failed, working);

  expect(graded.observations.dispatches[0]?.model).toBe("openai/gpt-6.1-sol#medium");
  expect(JSON.parse(JSON.stringify(graded.observations))).toEqual(graded.observations);
});

test("a dispatch off its routed model, to a named agent, or without a role fails routing", () => {
  const offModel = goodRun();

  offModel.sessions = offModel.sessions.map((session) => (session.id === "ses_build" ? child("ses_build", "openai/gpt-6-luna#max") : session));

  expect(gradeJsonCli(offModel, working).scores.routed_models).toBe(false);

  const namedAgent = goodRun();

  namedAgent.tools.push(call("ses_root", "subagent", { agent: "explore", description: "explorer: look around", prompt: "…" }, `<subagent sessionID="ses_explore" state="completed">`));
  namedAgent.sessions = [...namedAgent.sessions, child("ses_explore", "openai/gpt-6-luna#high")];

  expect(gradeJsonCli(namedAgent, working).scores.routed_models).toBe(false);

  const noRole = goodRun();

  noRole.tools[2] = dispatch("ses_build", "Build the JSON CLI");

  expect(gradeJsonCli(noRole, working).scores.routed_models).toBe(false);
});

test("a reviewer that never loads the review skill, or reviews before anything is built, does not count", () => {
  const withoutSkill = goodRun();

  withoutSkill.tools = withoutSkill.tools.filter((tool) => tool.sessionID !== "ses_review" || tool.name !== "skill");

  expect(gradeJsonCli(withoutSkill, working).scores.reviewed).toBe(false);

  const reviewFirst = goodRun();

  const [skills, route, build, write, review, reviewSkill] = reviewFirst.tools;

  reviewFirst.tools = [skills!, route!, review!, reviewSkill!, build!, write!];

  expect(gradeJsonCli(reviewFirst, working).scores.reviewed).toBe(false);
});

test("repairs sent back to the original implementer fail, while continuing it before review is fine", () => {
  const backToBuilder = goodRun();

  backToBuilder.tools[6] = dispatch("ses_build", "implementer: fix review findings", true);

  expect(gradeJsonCli(backToBuilder, working).scores.repairs_fresh).toBe(false);

  const followUpBeforeReview = goodRun();

  followUpBeforeReview.tools.splice(4, 0, dispatch("ses_build", "implementer: also handle --indent", true));

  expect(gradeJsonCli(followUpBeforeReview, working).scores.repairs_fresh).toBe(true);
});

test("an architect for this task, or a commit nobody asked for, fails its criterion", () => {
  const withArchitect = goodRun();

  withArchitect.tools.splice(2, 0, dispatch("ses_arch", "architect: options for the CLI"));
  withArchitect.sessions = [...withArchitect.sessions, child("ses_arch", "openai/gpt-6-astra#medium")];

  expect(gradeJsonCli(withArchitect, working).scores).toEqual({ ...allPass, proportionate: false });

  const committed = goodRun();

  committed.tools.push(call("ses_repair", "bash", { command: "git add -A && git commit -m 'feat: add fmt'" }));

  expect(gradeJsonCli(committed, working).scores).toEqual({ ...allPass, no_ship: false });
});
