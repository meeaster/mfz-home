import { tool, type PluginModule } from "@opencode-ai/plugin";

const CurrentSessionPlugin: PluginModule = {
  id: "current-session",
  server: async () => ({
    tool: {
      current_session_id: tool({
        description: "Return the ID of the current OpenCode session.",
        args: {},
        async execute(_args, context) {
          return context.sessionID;
        },
      }),
    },
  }),
};

export default CurrentSessionPlugin;
