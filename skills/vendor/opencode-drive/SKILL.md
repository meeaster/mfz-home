---
name: opencode-drive
description: Use when an agent needs drive OpenCode via a script or interact with an isolated instance
---

# OpenCode Drive

Use `opencode-drive` to launch an isolated OpenCode instance and control it via commands or a script.

Default to scripts for complete walkthroughs. Use live interaction only when you need to connect to an existing instance or iterate on its UI.

## Scripted usage

Type-check scripts before running them:

```bash
opencode-drive check ./drive.ts
opencode-drive start --name unique-run --script ./drive.ts
```

Use a unique name for headless instances. Stop instances when finished:

```bash
opencode-drive stop --name unique-run
```

Scripts can use `defineScript` from `opencode-drive`:

```ts
import { defineScript } from "opencode-drive"

export default defineScript({
  async setup({ fs, config }) {
    config.autoupdate = false
    await fs.writeFile("src/example.ts", "export const value = 1\n")
  },
  async run({ ui, llm }) {
    await ui.submit("Open src/example.ts")
    await llm.send(llm.text("The file exports `value`."))
    await ui.waitFor("The file exports `value`.")
  },
})
```

Use `opencode-drive init --name <name>` to prepare an isolated home and project, `send` for ordered UI commands, `responses` to control simulated model output, `screenshot` to capture the UI, `dir` to locate artifacts, and `prune` to remove failed-run artifacts.

## Live interaction

```bash
opencode-drive start --name unique-run
opencode-drive send --name unique-run --command.ui.type '{"text":"Explain this project"}' --command.ui.enter
opencode-drive stop --name unique-run
```

The driver requires Bun 1.3.14 or newer. Recording export additionally requires `ffmpeg`.
