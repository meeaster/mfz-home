# Maintenance

- `opencode/agents/ui-ux-designer.md` must remain frontmatter-only so OpenCode uses its normal provider prompt.
- `profiles/base/profile.yml` owns the Sol/medium assignment and shared activation.
- The caller owns the target, expected output, implementation boundary, acceptance behavior, and task-specific skills beyond `ui-ux-design`.
- `/orchestrate` owns optional consultation routing, bounded authority, and continuity. Keep the agent promptless; callers require `ui-ux-design` and read-only task-relevant handoffs rather than embedding a model-specific implementation transfer here.
- The shared global subagent guidance owns `context-transfer`; this agent and its UI/UX skill do not duplicate that cross-cutting workflow.
- Change the model or role only after evidence from comparable UI design sessions establishes a reason.
- Apply source changes with `mfz apply --agent opencode-v2`, then inspect the rendered agent and resolved profile.
