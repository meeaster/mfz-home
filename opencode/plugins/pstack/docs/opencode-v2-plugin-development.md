# OpenCode V2 plugin development reference

This document describes the OpenCode V2 plugin contract that `pstack` uses. Use it when changing the plugin entrypoint, packaged skills, registered agents, dependencies, or runtime verification.

OpenCode V2's plugin API is beta. Treat every SDK upgrade as a contract review, not a routine dependency update.

## Current boundary

`pstack` is a local, server-only Promise plugin. It registers package-local skills and two subagents. It does not register tools, commands, hooks, models, integrations, storage, background tasks, or TUI components.

The intended boundary is recorded in:

- `README.md`
- `UPSTREAM.md`
- `../../../../skill-meta/mfz-home/skills/pstack/VISION.md`
- `../../../../skill-meta/mfz-home/skills/pstack/MAINTENANCE.md`

Cursor model setup, transcript readers, Benny automations, Graphite workflows, pull-request polling, TUI code, hooks, and background services remain excluded until an OpenCode use case justifies an OpenCode-native design.

## Runtime path

The active path is:

```text
profiles/personal/profile.yml
  -> Mindframe-Z renders the pstack server-plugin entry
  -> OpenCode resolves and imports src/index.ts
  -> Plugin.define({ id: "pstack", setup })
  -> setup loads skills and agent prompts
  -> skill.transform registers Skill.Info values
  -> agent.transform updates two Agent.Info values
  -> OpenCode materializes the skill and agent state
```

`profiles/personal/profile.yml` selects `pstack` under `opencode_v2.plugins`. The profile does not enumerate the packaged skills or agents. OpenCode discovers them only after the plugin runs.

`src/index.ts` owns the complete pstack registration path:

| Symbol | Responsibility |
| --- | --- |
| `loadSkills` | Read immediate `skills/` children, parse each `SKILL.md`, and produce `Skill.Info` values. |
| `parseSkillFile` | Parse the small frontmatter subset owned by this package. |
| `registerSkills` | Add the loaded values to the skill draft. |
| `loadPrompts` | Read the two package-local agent prompts. |
| `registerAgents` | Update the two pstack subagent definitions. |
| `plugin` | Register the skill and agent transforms during `setup`. |

## Server plugin contract

The Promise API comes from `@opencode-ai/plugin`. Its contract is defined in the OpenCode reference at:

- `/home/mark/workspace/references/opencode/packages/plugin/src/promise/plugin.ts`
- `/home/mark/workspace/references/opencode/packages/plugin/src/promise/index.ts`

A Promise plugin has this shape:

```ts
interface Plugin {
  readonly id: string
  readonly tui?: boolean
  readonly setup: (context: Context) => Promise<Cleanup | void> | Cleanup | void
}
```

`Plugin.define` returns the supplied object. The OpenCode loader validates the imported default export and adapts a Promise plugin to its internal Effect lifecycle.

The pstack entrypoint follows the required shape:

```ts
const plugin = Plugin.define({
  id: "pstack",
  setup: async (context) => {
    const [prompts, skills] = await Promise.all([loadPrompts(), loadSkills()])
    await context.skill.transform((registry) => registerSkills(registry, skills))
    await context.agent.transform((agents) => registerAgents(agents, prompts))
  },
})

export default plugin
```

Keep asynchronous file loading outside transform callbacks. The Promise transform type is synchronous even though registering the transform returns a Promise.

The plugin ignores the registrations returned by `skill.transform` and `agent.transform`. This is intentional. OpenCode attaches each registration to the plugin scope and disposes it when that scope closes. Retain a registration only when the plugin must remove that contribution before unload.

## Context capabilities

The complete Promise `Context` includes these domains:

| Domain | Relevant capability |
| --- | --- |
| `agent` | List, get, transform, and reload agents. |
| `skill` | List, transform, and reload skills. |
| `catalog` | Read and transform providers, models, and defaults. |
| `command` | List, transform, and reload commands. |
| `integration` and `mcp` | Read, connect, transform, and reload integrations. |
| `reference` | List, transform, and reload references. |
| `tool` | Register tools and tool-execution hooks. |
| `session` | Operate on sessions and register request hooks. |
| `aisdk`, `shell`, and `event` | Register runtime hooks or consume events. |
| `storage` | Read and write plugin-ID-scoped JSON state. |
| `plugin` | List the active plugin inventory. |
| `options` | Read the JSON options supplied by plugin configuration. |

Pstack currently uses only `agent.transform` and `skill.transform`. Add another domain only when the feature needs that runtime behavior. Do not use internal OpenCode services from a plugin; the public context is the supported boundary.

## Skill registration

OpenCode validates every value passed to `skill.add` against `Skill.Info`. The current schema requires:

```text
id
name
location  (absolute path)
content
```

The schema also accepts optional `description`, `slash`, and `autoinvoke` fields. See:

- `/home/mark/workspace/references/opencode/packages/schema/src/skill.ts`
- `/home/mark/workspace/references/opencode/packages/core/src/plugin/host.ts`, `skill.transform`

`loadSkills` reads only immediate subdirectories and expects one `SKILL.md` in each directory. It sorts directory names before reading them and requires the frontmatter `name` to equal the directory name. One missing or malformed skill fails the whole plugin setup; the loader does not skip invalid entries.

`parseSkillFile` is not a YAML parser. It supports only:

```yaml
name: pstack-example
description: Example description
slash: false
metadata:
  opencode/autoinvoke: false
```

The parser requires LF-delimited `---` frontmatter and accepts only single-line values. Do not add multiline YAML values or new metadata fields without extending the parser and its tests.

Supporting files under a skill's directory are not separate skills. OpenCode receives the absolute `SKILL.md` location, so relative references remain available to the loaded skill.

Skills with `autoinvoke: false` remain explicitly loadable but are omitted from OpenCode's automatic skill guidance. Skills without that field remain candidates for the normal description-based selection path.

## Agent registration

`registerAgents` creates or updates:

| ID | Purpose |
| --- | --- |
| `pstack-poteto-agent` | Run delegated work with `poteto-mode` and the packaged leaf skills. |
| `pstack-comment-sicko` | Review comments and suppression directives. |

Both agents inherit OpenCode's model and baseline permissions. Neither agent hardcodes a provider or model.

`agent.update` creates a missing agent from `Agent.Info.default`. OpenCode's configuration-backed agent transform runs later and can append or replace fields from the active configuration.

### Comment reviewer permission limit

`pstack-comment-sicko` is not an enforced read-only security boundary.

The plugin appends this rule:

```ts
{ action: "edit", resource: "*", effect: "deny" }
```

OpenCode evaluates the last matching permission rule. Its configuration-backed agent transform runs after pstack and appends profile permissions. A later scoped `edit` allow can therefore override pstack's wildcard deny for that path. The agent also inherits the `shell` action, which is separate from `edit` and can mutate files.

Treat the agent as a report-only workflow enforced partly by its prompt, not as a sandbox. Before describing it as securely read-only, define an explicit allowlist, deny mutation-capable actions, and verify the effective runtime tool snapshot.

Relevant OpenCode sources are:

- `/home/mark/workspace/references/opencode/packages/core/src/permission.ts`, `evaluate`
- `/home/mark/workspace/references/opencode/packages/core/src/config/plugin/agent.ts`
- `/home/mark/workspace/references/opencode/packages/core/src/tool.ts`, `whollyDisabled`
- `/home/mark/workspace/references/opencode/packages/core/src/tool/plugin/shell.ts`

## Transform order and conflicts

OpenCode activates plugins in this order:

```text
internal pre plugins
SDK-contributed plugins
configured and discovered plugins, including pstack
internal post plugins
```

The internal post group includes the configuration-backed agent and skill plugins. See:

- `/home/mark/workspace/references/opencode/packages/core/src/plugin/supervisor.ts`, `activate`
- `/home/mark/workspace/references/opencode/packages/core/src/plugin/internal.ts`, `pre` and `post`

State transforms run in registration order against a fresh draft. Later transforms observe and can replace earlier contributions. Consequences for pstack include:

- A later skill with the same ID can replace a pstack skill.
- Active configuration can modify a pstack agent after pstack registers it.
- Later matching permission rules can override pstack's earlier rules.
- Pstack must not depend on overriding an internal post-plugin.

The state engine stores transforms as scoped callbacks and replays them during reload. See `/home/mark/workspace/references/opencode/packages/core/src/state.ts`.

Use globally distinct `pstack-*` IDs for packaged assets. Keep `poteto-mode` unprefixed only as the intentional user-facing mode name.

## Discovery and entrypoint resolution

OpenCode accepts a configured package specifier, a relative or absolute local path, or an automatically discovered config-directory plugin.

Pstack's package exports both its root and `./server` entrypoints:

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./server": "./src/index.ts"
  }
}
```

Package-spec resolution prefers the `server` subpath. An explicitly rendered absolute source path imports `src/index.ts` directly.

Do not rely on automatic discovery of the pstack package directory. OpenCode's directory fallback recognizes a string `exports`, `module`, `main`, root `index.ts`, or root `index.js`. Pstack has an object export map and no root index file.

Relevant OpenCode sources are:

- `/home/mark/workspace/references/opencode/packages/core/src/config/plugin/source.ts`
- `/home/mark/workspace/references/opencode/packages/core/src/plugin/supervisor.ts`, `load`
- `/home/mark/workspace/references/opencode/packages/util/src/npm.ts`

Only one configured target may export `id: "pstack"`. Duplicate plugin IDs abort activation of the new generation. Do not render both a package target and an absolute local target for the same plugin.

## Activation and reload lifecycle

OpenCode performs these steps for each plugin generation:

1. Resolve and import the default export.
2. Validate the Promise or Effect plugin shape.
3. Fork a child scope for the plugin.
4. Run `setup` through the Promise-to-Effect adapter.
5. Materialize registered state transforms.
6. Publish the active or failed plugin inventory.

When replacing a generation, OpenCode closes the previous scope before loading the replacement. Closing the scope removes pstack's transforms and rebuilds affected state. If the replacement fails, OpenCode attempts to restore the previous plugin definition.

Pstack returns no cleanup function because it owns no timers, watchers, connections, or background tasks. Return cleanup if a future change owns one of those resources. Transform and hook registrations already belong to the plugin scope.

Plugin setup rereads the packaged skills and prompts only when a new plugin generation loads. Pstack does not watch its asset directories. Depending on the rendered target and active process, changing only a package-local `SKILL.md` or prompt might require `mfz apply`, a watched entrypoint change, or a server restart before setup runs again. Verify changes in a fresh OpenCode process rather than relying on hot reload.

Relevant lifecycle sources are:

- `/home/mark/workspace/references/opencode/packages/core/src/plugin.ts`
- `/home/mark/workspace/references/opencode/packages/core/src/plugin/supervisor.ts`
- `/home/mark/workspace/references/opencode/packages/plugin/src/promise/adapter.ts`

## Dependencies and versions

The plugin imports Node built-ins and `@opencode-ai/plugin`. It currently has no additional runtime dependency.

Keep the exact SDK version in `package.json` equal to the installed `opencode2` build:

```sh
opencode2 --version
pnpm --dir opencode/plugins/pstack exec node -p "require('./node_modules/@opencode-ai/plugin/package.json').version"
```

The OpenCode reference checkout can describe a different release from the installed beta. Use the reference to understand internals, then verify version-sensitive claims against the installed SDK and runtime.

Do not add the built-in `@opencode-ai/plugin` SDK to `opencode_v2.dependencies`. Declare any new non-host runtime import with an exact version under the profile's `opencode_v2.dependencies`, as required by `../../../AGENTS.md`.

## Change map

Use the narrowest owner for each change:

| Change | Owner | Required evidence |
| --- | --- | --- |
| Add or revise a skill | `skills/<id>/SKILL.md` and its references | Parser or registration test, `mfz apply`, and fresh runtime skill discovery. |
| Add a parsed frontmatter field | `parseSkillFile` and tests | Valid, absent, and malformed field cases plus runtime schema acceptance. |
| Add or revise an agent prompt | `agents/*.md` | Registration test and fresh runtime agent inspection. |
| Change agent permissions | `registerAgents` | Effective resolved permissions and tool snapshot, not only an isolated array assertion. |
| Add a transform | `setup` and the matching registration helper | Unit test plus runtime inspection of the transformed domain. |
| Add a runtime hook | `setup` | Focused hook test, failure behavior, and a fresh operation that executes the hook. |
| Add a resource with a lifecycle | `setup` cleanup | Reload and shutdown evidence that the resource is released. |
| Add a runtime import | `package.json` and `profiles/personal/profile.yml` | Resolution from the rendered entrypoint in a fresh process. |
| Add TUI behavior | A separate native TUI entrypoint and CLI configuration | Visible slot execution in a fresh TUI process. Server-plugin loading is insufficient. |

Before changing a skill, run `mfz guide skills`. Before changing the plugin or profile, run `mfz guide`.

## Verification

Run the package's fast checks:

```sh
pnpm --dir opencode/plugins/pstack check
```

Render source changes:

```sh
mfz apply
```

Inspect the active plugin:

```sh
opencode2 api get /api/plugin
```

Inspect runtime-registered skills and agents:

```sh
opencode2 api get '/api/skill?directory=%2Fhome%2Fmark%2Fworkspace%2Frepos%2Fmfz-home'
opencode2 api get '/api/agent?directory=%2Fhome%2Fmark%2Fworkspace%2Frepos%2Fmfz-home'
```

Count the packaged skills without maintaining a hardcoded count:

```sh
find opencode/plugins/pstack/skills -mindepth 1 -maxdepth 1 -type d | wc -l
```

Complete the repository maintenance checks recorded in `../../../../skill-meta/mfz-home/skills/pstack/MAINTENANCE.md`. Unit tests prove the package parser and registration helpers. They do not prove rendered dependency resolution, plugin activation, reload behavior, effective permissions, or model-visible behavior.

For a server behavior change, exercise the changed behavior in a fresh `opencode2` process. `/api/plugin` reporting `status: "active"` proves setup completed; it does not prove that a hook, tool, or delegated workflow executed correctly.

## Failure interpretation

| Symptom | Likely boundary |
| --- | --- |
| `pstack` is absent from `/api/plugin` | Profile rendering, target resolution, or a stale location. |
| `pstack` has `status: "failed"` | Import, asset loading, parsing, transform registration, or setup failure. |
| Plugin is active but a skill is absent | Skill parsing, duplicate ID precedence, state materialization, or wrong location query. |
| A changed skill still has old content | The plugin generation did not reload, or the current conversation retains previously loaded skill text. |
| Both old and new plugin behavior disappear | Replacement and restoration both failed. Inspect the server log. |
| Plugin activation hangs or the prior generation remains | Check for duplicate IDs or a failed supervisor generation. |
| A package import works in the source tree but fails after rendering | The dependency is not resolvable from the rendered entrypoint. |
| A supposedly read-only agent can mutate files | Later permission rules or a mutation-capable action such as `shell` remains allowed. |

## Source index

Use these OpenCode reference files when the beta API changes:

| Concern | Reference source |
| --- | --- |
| Promise plugin shape and context | `packages/plugin/src/promise/plugin.ts` |
| Promise transforms | `packages/plugin/src/promise/registration.ts` |
| Promise-to-Effect lifecycle | `packages/plugin/src/promise/adapter.ts` |
| Plugin source discovery | `packages/core/src/config/plugin/source.ts` |
| Plugin import and ordering | `packages/core/src/plugin/supervisor.ts` |
| Activation, failure restoration, and scopes | `packages/core/src/plugin.ts` |
| Transform replay and disposal | `packages/core/src/state.ts` |
| Agent draft bridge | `packages/core/src/plugin/host.ts`, `agent.transform` |
| Skill draft bridge and validation | `packages/core/src/plugin/host.ts`, `skill.transform` |
| Internal pre and post ordering | `packages/core/src/plugin/internal.ts` |
| Config-backed agent composition | `packages/core/src/config/plugin/agent.ts` |
| Permission precedence | `packages/core/src/permission.ts` |
| Tool visibility from permissions | `packages/core/src/tool.ts` |
| Skill schema | `packages/schema/src/skill.ts` |
| Active plugin API | `packages/server/src/handlers/plugin.ts` |

The canonical public documentation is [OpenCode V2 plugins](https://opencode.ai/v2/docs/build/plugins). Use the public contract for supported behavior and the matching release source for loader or ordering details that the public page does not specify.
