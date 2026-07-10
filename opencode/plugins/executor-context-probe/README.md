# Executor Context Probe

An opt-in diagnostic plugin for evaluating which executor context OpenCode
exposes to plugins. It does not add an agent-facing tool or mutate prompts.

Enable it only for a fresh probe process:

```sh
OPENCODE_CONFIG_CONTENT='{"plugin":["file:///home/mark/code/mindframe-z-personal-home/opencode/plugins/executor-context-probe/server.ts"]}' \
OPENCODE_EXECUTOR_CONTEXT_PROBE_DIR=/tmp/executor-context-probe \
opencode run --format json "Use a tool, then describe what you learned."
```

The directory contains JSONL observations with allowlisted metadata only. Each
entry states its fidelity: exact session evidence, global inventory, or
default-agent approximation. Set `OPENCODE_EXECUTOR_CONTEXT_PROBE_INVENTORIES=1`
to include SDK inventory calls; they deliberately perturb `tool.definition`
and are disabled by default. The probe deliberately
records its own presence as an observer effect: it is one additional loaded
plugin, not one additional executor tool.
