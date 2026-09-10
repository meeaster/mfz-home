# Vision

`/orchestrate` remains the explicit human-facing entry in the current conversation and selected model. It loads and follows the shared `orchestrator-mode` skill rather than duplicating workflow behavior or selecting a child agent. Its final `User prompt` section contains the complete raw current input once, interpreted naturally with prior conversation, including partial ideas and corrections.

The shared workflow and retained behavioral intent live at `../../skills/orchestrator-mode/`. This record owns command invocation only. The historical `LOG.md` remains here.
