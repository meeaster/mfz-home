Load the `orchestrator-mode` skill explicitly with the skill tool in `baked-in` mode. Treat this current session as the orchestrator: dispatch specialists directly, own the effort's `assignments/` workspace, accept producer packets, and return accepted results to the human. Follow the skill's baked-in topology and shared contracts. This command does not select the orchestrator subagent.

## User prompt

The OpenEval repository is checked out at `./checkout` in this workspace.

Answer one question about it: when a benchmark is resumed, how does OpenEval decide that a slot must run its candidate again, must be judged again from recorded evidence, or can be reused unchanged? Name the files that own that decision, explain the inputs each one compares, and state what happens to already-recorded evidence when the decision changes.

Ground every claim in a path from the checkout and quote the decisive lines. Run everything in the foreground: do not dispatch subagents or commands in the background, and wait for each step to finish before responding. This is read-only: do not modify the repository, publish anything, or contact an external service. Return the accepted findings.
