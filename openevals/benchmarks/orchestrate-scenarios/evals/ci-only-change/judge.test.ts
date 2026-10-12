import { expect, test } from "bun:test";
import { call, child, dispatch, goodRun, type EditableFacts } from "../../../../src/judging/constructed-runs.js";
import { gradeCiOnlyChange, type PublishCheck } from "./judge.js";

const works: PublishCheck = { versioned: true, latest: true, refuses: true, manual: true, tags: true };

function ciRun(): EditableFacts {
  const base = goodRun();

  return {
    tools: [
      base.tools[0]!,
      base.tools[1]!,
      dispatch("ses_build", "implementer: manual trigger and versioned publish"),
      call("ses_build", "skill", { id: "verification" }),
      call("ses_build", "edit", { filePath: "/workspace/scripts/publish.sh" }),
      call("ses_build", "edit", { filePath: "/workspace/.github/workflows/publish.yml" }),
      call("ses_root", "write", { filePath: "/home/dev/workspace/artifacts/cairn/knowledge/agent-config-verification.md" }),
    ],
    sessions: [base.sessions[0]!, child("ses_build", "openai/gpt-6.1-sol#medium")],
    initial: [{ path: "scripts/publish.sh", bytes: 1, sha256: "a" }, { path: ".github/workflows/publish.yml", bytes: 1, sha256: "b" }],
    final: [{ path: "scripts/publish.sh", bytes: 2, sha256: "c" }, { path: ".github/workflows/publish.yml", bytes: 2, sha256: "d" }],
  };
}

const allPass = { publish_behaves: true, changes_scoped: true, gap_recorded: true, lead_delegates: true, routed_models: true, no_ship: true, foreground_only: true };

test("the change with a verification article in Cairn passes", () => {
  expect(gradeCiOnlyChange(ciRun(), works).scores).toEqual(allPass);
});

test("each missing behavior fails publish_behaves; an incomplete check is unresolved", () => {
  const keys: (keyof PublishCheck)[] = ["versioned", "latest", "refuses", "manual", "tags"];

  for (const key of keys) expect(gradeCiOnlyChange(ciRun(), { ...works, [key]: false }).scores.publish_behaves).toBe(false);

  expect(gradeCiOnlyChange(ciRun(), undefined).scores.publish_behaves).toBeNull();
});

test("an article outside knowledge/, or none, fails gap_recorded", () => {
  const elsewhere = ciRun();

  elsewhere.tools[6] = call("ses_root", "write", { filePath: "/home/dev/workspace/artifacts/cairn/sessions/opencode/2026-10/ses_root/verification-notes.md" });

  expect(gradeCiOnlyChange(elsewhere, works).scores.gap_recorded).toBe(false);

  const none = ciRun();

  none.tools.pop();

  expect(gradeCiOnlyChange(none, works).scores.gap_recorded).toBe(false);
});

test("evidence or other files left in the project fail changes_scoped; README and tests are allowed", () => {
  const litter = ciRun();

  litter.final = [...litter.final, { path: "verification-evidence/aws-calls.log", bytes: 1, sha256: "e" }];

  expect(gradeCiOnlyChange(litter, works).scores.changes_scoped).toBe(false);

  const documented = ciRun();

  documented.final = [...documented.final, { path: "README.md", bytes: 1, sha256: "r" }, { path: "test/publish.test.sh", bytes: 1, sha256: "t" }];

  expect(gradeCiOnlyChange(documented, works).scores.changes_scoped).toBe(true);
});
