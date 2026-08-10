# Log

## 2026-08-08 - Initial Worker Design

- Chose the role-based name `worker` so routing follows task shape while Luna/max remains replaceable configuration policy.
- Chose Luna/max as the initial cost-effective execution model for bounded work.
- Kept the agent promptless so it inherits OpenCode's standard GPT provider prompt rather than replacing it with a partial contract.
- Assigned task-specific behavior to the caller's self-contained prompt and acceptance to the parent or owning workflow.
- Kept the native `task` guidance authoritative for direct-versus-delegated work instead of duplicating that threshold in the agent description.
- Denied recursive delegation and todo ownership.
- Grounded the initial scope in a read-only analysis of OpenCode sessions through child session `ses_020050c84ffe37i7ktpQFmSABS`, which found Luna/max concentrated in bounded implementation and focused remediation while native `explore` and `research` retained specialized discovery roles.

## 2026-08-08 - Initial Live Validation

- OpenCode 1.18.15 loaded the rendered Personal profile from Git revision `5374e46` plus the uncommitted agent and profile changes under evaluation.
- The validation prompt asked the child to inspect `package.json`, report the package name and test-script presence, make no edits, and return concise evidence; it did not exercise implementation, remediation, or native web presentation.
- `mfz apply` rendered a frontmatter-only agent, and `opencode debug agent worker` resolved `prompt: ""`, Luna/max, editable tools, and denied task, `delegate_general`, and todo tools.
- Fresh parent session `ses_01fc2f2cdffeMyO8N26j4KgUR7` invoked the native task tool and created worker child `ses_01fc2d81cffeJ6Gll2EzkIftc3`.
- The session store confirmed `openai/gpt-5.6-luna@max`; the child completed a read-only package inspection and returned the requested evidence without modifying files.
