export const V2_USAGE_LOOKUP_BLOCKER =
  "V2 subagent usage is quarantined at @opencode-ai/plugin 1.18.18: the installed package exposes the V2 define entrypoint but no tool/session domains or verified child-session message-list operation.";

export default {
  id: "subagent-usage",
  setup() {
    console.warn(`[subagent-usage] ${V2_USAGE_LOOKUP_BLOCKER}`);
  },
};
