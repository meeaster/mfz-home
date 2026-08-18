# Agent Exec Evaluations

## Invocation

### Explicit OpenCode 2 CLI Run

**Prompt:** Use the OpenCode 2 CLI to run a fresh review with the default model.

**Assertions:** Agent Exec invokes, chooses `opencode2 run`, omits an unnecessary model override, applies read-only posture through the selected agent or configuration, and captures the final text and session ID.

### Native OpenCode Test

**Prompt:** I edited an agent's permissions. Test whether the current OpenCode session sees them.

**Assertions:** Agent Exec does not invoke. The current agent activates the home change with `mfz apply` when needed, waits for reload, and tests on the current session's next model attempt without launching a child.

### Fresh-Context Skill Test

**Prompt:** I changed a skill that this session already loaded. Test its invocation and execution without the old skill text influencing the result.

**Assertions:** Agent Exec does not invoke. The current agent applies the home, then uses a fresh native subagent because context freshness is part of the test, not because runtime reload requires a child.

### Current-Session Skill Reload

**Prompt:** I changed a skill body. Check the current version in this session.

**Assertions:** Agent Exec does not invoke. The current agent applies the home, waits for reload, and invokes the skill again. It notes that old loaded text remains in conversation history if that affects interpretation.

### Nested Workflow Through CLI

**Prompt:** Use the OpenCode 2 CLI to test a workflow whose child must launch another child.

**Assertions:** Agent Exec invokes, explains that default depth or agent permissions may block native nesting, and starts a fresh top-level CLI session rather than claiming that OpenCode 2 never supports nested subagents.

### Ambiguous Delegation

**Prompt:** Get another agent's opinion on this design.

**Assertions:** Agent Exec does not invoke without an explicit external harness CLI request. The current agent uses a native subagent when appropriate or asks which workflow the user wants.

## Execution

### OpenCode 2 Continuation

**Prompt:** Continue OpenCode 2 session `<sessionID>` with this correction.

**Assertions:** The command uses `opencode2 run --session <sessionID>`, preserves the existing model unless the user overrides it, and reports the same continuation handle.

### OpenCode 2 Clean Room

**Prompt:** Run OpenCode 2 through its CLI without loading my normal OpenCode configuration or project configuration.

**Assertions:** The run isolates all four XDG roots, supplies empty config, disables project config, copies only required authentication state, uses `--standalone`, and preserves the full environment for continuation.

### OpenCode 2 JSON Output

**Prompt:** Run OpenCode 2 and return its session handle with the answer.

**Assertions:** The command uses `--format json`, treats stdout as an event stream, extracts `sessionID` and the final `text` event's `part.text`, and does not parse the stream as one result object.

### CLI-Only Configuration

**Prompt:** I edited `cli.json`. Check the new keybinding in the current TUI.

**Assertions:** Agent Exec does not claim server hot reload. It starts a new client only when the user explicitly requests the CLI, otherwise it explains that `cli.json` is loaded at client startup.
