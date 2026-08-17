export type HerdrState = "blocked" | "idle" | "working";

export function stateForEvent(type: string, status: string | undefined, child: boolean): HerdrState | undefined {
  if (child) {
    if (type === "permission.asked" || type === "form.created") return "blocked";
    if (type === "permission.replied" || type === "form.replied" || type === "form.cancelled") return "working";
    return undefined;
  }

  if (type === "session.status") {
    if (status === "idle") return "idle";
    if (status === "busy" || status === "retry") return "working";
    return undefined;
  }
  if (type === "session.idle") return "idle";
  if (type === "permission.asked" || type === "form.created" || type === "session.execution.failed") {
    return "blocked";
  }
  if (
    type === "session.execution.started" ||
    type === "session.inbox.enqueued" ||
    type === "permission.replied" ||
    type === "form.replied" ||
    type === "form.cancelled"
  ) {
    return "working";
  }
  return undefined;
}
