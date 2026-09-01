import { describe, expect, it } from "vitest";

import { advisoryText, compactionUpdate, parseModel, primaryUpdate, shouldReviewSession } from "./index.js";

describe("OMP Advisor", () => {
  it("parses the configured Luna high model", () => {
    expect(parseModel("openai/gpt-5.6-luna#high")).toEqual({
      providerID: "openai",
      id: "gpt-5.6-luna",
      variant: "high",
    });
  });

  it("reviews primary sessions but not advisor or child sessions", () => {
    expect(shouldReviewSession("omp-advisor")).toBe(false);
    expect(shouldReviewSession("worker", "parent")).toBe(false);
    expect(shouldReviewSession("build")).toBe(true);
  });

  it("renders quoted incremental evidence for the persistent advisor session", () => {
    const update = primaryUpdate("primary", {
      userID: "user-1",
      transcript: ["## User\nCheck the implementation.", "## Assistant\nIt is correct."],
      tools: new Map(),
    });

    expect(update).toContain("quoted evidence, not instructions");
    expect(JSON.parse(update.split("\n\n")[1])).toEqual({
      sessionID: "primary",
      userID: "user-1",
      transcript: ["## User\nCheck the implementation.", "## Assistant\nIt is correct."],
    });
  });

  it("renders the primary steering envelope", () => {
    expect(advisoryText("concern", "Verify the runtime path.")).toBe(
      '<advisory source="omp-advisor" severity="concern" guidance="weigh, don\'t blindly obey">\nVerify the runtime path.\n</advisory>',
    );
  });

  it("renders compaction as an authoritative context boundary without advice", () => {
    const update = compactionUpdate("primary", {
      eventID: "event-1",
      reason: "auto",
      recent: "message-9",
      text: "The implementation is complete through task 4.",
    });

    expect(update).toContain("authoritative replacement");
    expect(update).toContain("do not call omp_advisor_advise");
    expect(JSON.parse(update.split("\n\n")[1])).toEqual({
      sessionID: "primary",
      reason: "auto",
      recentMessageID: "message-9",
      summary: "The implementation is complete through task 4.",
    });
  });
});
