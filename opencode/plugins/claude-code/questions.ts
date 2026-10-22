// Lets Claude Code ask the user questions through OpenCode. Claude Code offers AskUserQuestion only to a host that
// answers permission requests, so this bridge is that host: the question becomes a call to OpenCode's own `question`
// tool, the OpenCode step ends on that call while Claude's turn waits, and the answer OpenCode returns at the start of
// the next step goes back to Claude.
import type { CanUseTool, PermissionResult } from "@anthropic-ai/claude-agent-sdk";
import type { LanguageModelV3StreamPart, LanguageModelV3ToolResultOutput } from "@ai-sdk/provider";
import { z } from "zod";

export const ASK_TOOL = "AskUserQuestion";

const Question = z.object({
  question: z.string(),
  header: z.string(),
  options: z.array(z.object({ label: z.string(), description: z.string() })),
  multiSelect: z.boolean().optional(),
});

const AskInput = z.object({ questions: z.array(Question).min(1) });

// OpenCode's question tool reports one list of selected labels per question.
const AnswerOutput = z.object({ answers: z.array(z.array(z.string())) });

type Question = z.infer<typeof Question>;

type Step = {
  emit: (part: LanguageModelV3StreamPart) => void;
  // Ends the OpenCode step while Claude's turn keeps waiting for the answer.
  park: () => void;
};

type Pending = { questions: Question[]; resolve: (result: PermissionResult) => void };

export class QuestionBridge {
  private step: Step | undefined;

  private readonly pending = new Map<string, Pending>();

  readonly canUseTool: CanUseTool = (toolName, input, options) => {
    // Only questions are bridged. Anything else that needs approval is denied, as in any headless Claude Code run.
    if (toolName !== ASK_TOOL) {
      return Promise.resolve({ behavior: "deny", message: `${toolName} needs approval, which this OpenCode session cannot show.` });
    }

    const parsed = AskInput.safeParse(input);
    const step = this.step;

    if (!parsed.success || !step) return Promise.resolve({ behavior: "deny", message: "The user cannot be asked a question right now." });

    return new Promise((resolve) => {
      this.pending.set(options.toolUseID, { questions: parsed.data.questions, resolve });
      step.emit({
        type: "tool-call",
        toolCallId: options.toolUseID,
        toolName: "question",
        input: JSON.stringify({
          questions: parsed.data.questions.map((question) => ({
            question: question.question,
            header: question.header,
            options: question.options,
            multiple: question.multiSelect === true,
          })),
        }),
      });
      step.park();
    });
  };

  // The step now streaming, which a question would be shown in.
  open(step: Step) {
    this.step = step;
  }

  close() {
    this.step = undefined;
  }

  awaits(toolCallId: string) {
    return this.pending.has(toolCallId);
  }

  answer(toolCallId: string, output: LanguageModelV3ToolResultOutput) {
    const pending = this.pending.get(toolCallId);

    if (!pending) return;

    this.pending.delete(toolCallId);

    if (output.type === "error-text" || output.type === "error-json" || output.type === "execution-denied") {
      pending.resolve({ behavior: "deny", message: "The user dismissed the question." });

      return;
    }

    const answers = answersOf(output, pending.questions);

    pending.resolve({ behavior: "allow", updatedInput: { questions: pending.questions, answers } });
  }

  // Questions the next step brought no answer for, for example because the user dismissed them.
  dismissUnanswered() {
    for (const pending of this.pending.values()) pending.resolve({ behavior: "deny", message: "The user dismissed the question." });

    this.pending.clear();
  }
}

// Claude Code expects answers keyed by question text, with several selected labels joined by commas.
function answersOf(output: LanguageModelV3ToolResultOutput, questions: Question[]) {
  const structured = output.type === "json" ? AnswerOutput.safeParse(output.value).data?.answers : undefined;
  const text = output.type === "text" ? output.value : "";
  const answers: Record<string, string> = {};

  questions.forEach((question, index) => {
    const selected = structured?.[index]?.join(", ") ?? quotedAnswer(text, question.question);

    if (selected) answers[question.question] = selected;
  });

  return answers;
}

// OpenCode's text form is `User has answered your questions: "question"="answer", …`.
function quotedAnswer(text: string, question: string) {
  const marker = `"${question}"="`;
  const start = text.indexOf(marker);

  if (start < 0) return undefined;

  const from = start + marker.length;

  return text.slice(from, text.indexOf('"', from));
}
