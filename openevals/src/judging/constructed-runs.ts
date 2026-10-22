import type { ToolCall } from "@hona/openeval";
import type { RecordedSession, RunFacts } from "./facts.js";

// Constructed recordings for grading tests: they test grading boundaries, not that any of these sessions ran.

const routing = `| Role | Task type | Model |
| --- | --- | --- |
| implementer | default | \`openai/gpt-6.1-sol#medium\` |
| reviewer | code | \`openai/gpt-6-astra#medium\` |
| architect | default | \`openai/gpt-6-astra#medium\` |`;

let calls = 0;

export function call(sessionID: string, name: string, input: ToolCall["input"], text?: string): ToolCall {
  calls += 1;

  return { id: `call_${calls}`, assistantMessageId: "msg_1", sessionID, name, status: "succeeded", input, content: text === undefined ? undefined : [{ type: "text", text }] };
}

export function dispatch(childID: string, description: string, continued = false): ToolCall {
  const fresh = { agent: "general", description, prompt: "…" };

  const input = continued ? { ...fresh, sessionID: childID } : fresh;

  return call("ses_root", "subagent", input, `<subagent sessionID="${childID}" state="completed">\nDone.\n</subagent>`);
}

export function child(id: string, model: string, parentID = "ses_root"): RecordedSession {
  const [providerID = "", rest = ""] = model.split("/");

  const [modelID = "", variant] = rest.split("#");

  return { id, parentID, agent: "general", model: { providerID, id: modelID, variant } };
}

/** Run facts whose lists each test can edit. */
export type EditableFacts = RunFacts & { tools: ToolCall[]; sessions: RecordedSession[] };

/** The expected flow: load skills, implement, review with the review skill, repair in a fresh session. */
export function goodRun(): EditableFacts {
  return {
    tools: [
      call("ses_root", "skill", { id: "orchestrate" }),
      call("ses_root", "skill", { id: "role-models" }, `<skill_content name="role-models">\n${routing}\n</skill_content>`),
      dispatch("ses_build", "implementer: build the feature"),
      call("ses_build", "write", { filePath: "/workspace/src/feature.ts" }),
      dispatch("ses_review", "reviewer/code: review the feature"),
      call("ses_review", "skill", { id: "thermo-nuclear-code-quality-review" }),
      dispatch("ses_repair", "implementer: fix review findings"),
      call("ses_repair", "edit", { filePath: "/workspace/src/feature.ts" }),
      call("ses_root", "write", { filePath: "/home/dev/.local/state/cairn/sessions/opencode/2026-10/ses_root/notes.md" }),
    ],
    sessions: [
      { id: "ses_root", agent: "build", model: { providerID: "openai", id: "gpt-6.1-sol", variant: "medium" } },
      child("ses_build", "openai/gpt-6.1-sol#medium"),
      child("ses_review", "openai/gpt-6-astra#medium"),
      child("ses_repair", "openai/gpt-6.1-sol#medium"),
    ],
    initial: [],
    final: [],
  };
}
