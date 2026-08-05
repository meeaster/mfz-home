# Log

## 2026-08-02 - Initial Design

- Chose a user-invoked companion because starting or continuing a large planning effort is deliberate, and Wayfinder is also deliberately invoked.
- Made the evidence pack the only added durable layer: source-grounded research, a working model, and experiment links.
- Preserved a single source of truth by assigning planning and decisions to Wayfinder while the companion owns only contextual evidence and model state.
- Left the durable location to the active effort so the skill carries no project, workspace, tracker, or storage assumption.
- Kept prototypes as linked evidence governed by Wayfinder's existing prototype-ticket behavior rather than introducing another workflow.
- Chose a manual handshake instead of peer-skill loading so the companion never implies it can execute Wayfinder's user-invoked map workflow by itself.
- Kept the map as the only orientation index after confirming that the local-map convention already provides the adjacent research and working-model layer; the companion must not add a second README.
- Enabled Wayfinder's `grilling` and `domain-modeling` peers in the shared profile so its charting path is available wherever the companion is available.

## 2026-08-02 - Add Human-Owned Vision

- Expanded the companion from evidence-only context to a three-authority model: vision for durable human direction, Wayfinder map and tickets for planning decisions, and the evidence pack for source-grounded understanding.
- Kept the map as the sole planning index by linking the vision from `## Notes` rather than copying product intent into the destination or decisions list.
- Required human acceptance before evidence or implementation drift may revise the vision.
- Added evaluation scenarios for feature vision creation and evidence that challenges accepted direction.

## 2026-08-03 - Context, Experiments, And Decision Forums

- Clarified that Wayfinder's map is a low-resolution planning index while ticket records retain authoritative decision detail.
- Replaced the literal evidence-pack framing with optional adjacent companion artifacts: vision, working model, source research, and experiment readouts.
- Defined source research and prototype learning as distinct evidence types. Prototype source remains in its owning repository or worktree; its durable readout records the hypothesis, method, observations, limits, and model changes.
- Defined the working model as a current synthesis rather than a target state, roadmap, or status board.
- Added a decision-forum pattern for user-led shared input through existing Wayfinder grilling tickets.
- Kept decision forums human-designated: the agent preserves design forks but does not infer a forum or its participants.
- Added optional decision briefs as the durable, reader-ready source for user-designated forums. They synthesize context and evidence for people to review while tickets retain authority.
- Required every closed in-scope ticket, including research and prototype tickets, to receive a concise map pointer while preserving Wayfinder's out-of-scope treatment.
