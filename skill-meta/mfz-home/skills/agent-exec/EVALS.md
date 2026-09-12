# Agent Exec Evaluations

These are expected behaviors, not recorded model-execution passes. On 2026-09-12, static checks against installed OpenCode `v2.0.2` confirmed the documented `run`, model and agent discovery, database-path lookup, and session deletion commands. No child model run or trace is recorded for this revision.

## Invocation

### Explicit OpenCode CLI Run

**Prompt:** Use the OpenCode CLI to run a fresh review with the default model.

**Assertions:** Agent Exec invokes, chooses `opencode run`, omits an unnecessary model override, applies read-only posture through the selected agent or configuration, and captures the final text and session ID.

### Shared Service Is Not Isolation

**Prompt:** Start a fresh OpenCode CLI session so it uses a completely fresh server.

**Assertions:** Agent Exec corrects the premise: a normal `opencode run` creates a client and session on the shared background service. It uses `--standalone` only if a private server is actually required and adds clean-room controls only if normal configuration and state must also be excluded.

### Native OpenCode Test

**Prompt:** I edited an agent's permissions. Test whether the current OpenCode session sees them.

**Assertions:** Agent Exec does not invoke. The current agent completes any render or installation step required by the user's configuration workflow, waits for reload, and tests on the current session's next model attempt without launching a child.

### Fresh-Context Skill Test

**Prompt:** I changed a skill that this session already loaded. Test its invocation and execution without the old skill text influencing the result.

**Assertions:** Agent Exec does not invoke. The current agent completes any required render or installation step, then uses a fresh native subagent because context freshness is part of the test, not because runtime reload requires a child.

### Current-Session Skill Reload

**Prompt:** I changed a skill body. Check the current version in this session.

**Assertions:** Agent Exec does not invoke. The current agent completes any required render or installation step, waits for reload, and invokes the skill again. It notes that old loaded text remains in conversation history if that affects interpretation.

### Nested Workflow Through CLI

**Prompt:** Use the OpenCode CLI to test a workflow whose child must launch another child.

**Assertions:** Agent Exec invokes, explains that default depth or agent permissions may block native nesting, and starts a fresh top-level CLI session rather than claiming that OpenCode never supports nested subagents.

### Ambiguous Delegation

**Prompt:** Get another agent's opinion on this design.

**Assertions:** Agent Exec does not invoke without an explicit external harness CLI request. The current agent uses a native subagent when appropriate or asks which workflow the user wants.

## Execution

### Cross-harness failure and cleanup

**Prompt:** Run a read-only Codex or Claude Code investigation, then continue the returned handle.

**Assertions:** The selected harness reference determines permissions, output parsing, and continuation. An explicit handle wins over an ambiguous latest session. A parent permission denial is a blocked launch; a handle with no assistant answer is not success. Disposable probes are deleted through supported individual-session cleanup or reported as retained; requested continuation handles remain available. These branches are untested here.

### OpenCode Continuation

**Prompt:** Continue OpenCode session `<sessionID>` with this correction.

**Assertions:** The command uses `opencode run --session <sessionID>`, preserves the existing model unless the user overrides it, and reports the same continuation handle.

### OpenCode Clean Room

**Prompt:** Run OpenCode through its CLI without loading my normal OpenCode configuration or project configuration.

**Assertions:** The run selects an appropriate temporary directory for the current environment, isolates all four XDG roots, supplies empty config, disables project config, copies only required authentication state, uses `--standalone`, and preserves the full environment for continuation.

### OpenCode JSON Output

**Prompt:** Run OpenCode and return its session handle with the answer.

**Assertions:** The command uses `--format json`, treats stdout as an event stream, extracts `sessionID` and the final `text` event's `part.text`, and does not parse the stream as one result object.

### CLI-Only Configuration

**Prompt:** I edited `cli.json`. Check the new keybinding in the current TUI.

**Assertions:** Agent Exec does not claim server hot reload. It starts a new client only when the user explicitly requests the CLI, otherwise it explains that `cli.json` is loaded at client startup.
