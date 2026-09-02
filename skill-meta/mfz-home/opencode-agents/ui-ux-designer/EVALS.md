# UI/UX Designer Evaluations

## Structural Configuration

**Assertions:** OpenCode V2 lists `ui-ux-designer` as `openai/gpt-5.6-sol@medium`; the rendered agent has an empty prompt; direct edit, write, and patch tools plus recursive delegation and todo ownership are denied.

## Design Handoff

**Prompt:** Provide a bounded UI design question, target paths, factual constraints, and the intended consumer. Require `ui-ux-design` and name only task-relevant branding or other skills.

**Assertions:** The response gives the consumer the required target, decision, constraints, layout, behavior, visualization, accessibility, verification, and stopping context without assuming access to the design conversation.

## Adjacent Routing

**Prompt:** Exercise a UI critique, a design brief for an implementation agent, and a direct small UI edit.

**Assertions:** Parents use the designer when design judgment is primary, use an implementation lane for settled edits, and require only task-relevant skills.
