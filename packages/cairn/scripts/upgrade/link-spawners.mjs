#!/usr/bin/env node
// Links CLI runs recorded before Cairn tracked spawners to the session that started them, from the shell commands
// each session ran. A run started while exactly one session had a command running is linked to that session; a run
// that falls inside more than one session's command, or none, is left alone. Run it after reindex-all.mjs, which
// marks which sessions are CLI runs.
//
// The commands come from Claude Code transcripts (the main agent's and its subagents', and a background command
// until its completion notice) and from OpenCode's shell tool calls (from the end of the model call that asked for
// the command to the start of that session's next one).
//
// Usage: node link-spawners.mjs [--apply]
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { backup, claudeProjects, openCatalog, openCodeDatabase, wantsApply } from "./lib.mjs";

// Commands that could start a CLI run, directly or through a script.
const launcher = /claude|opencode|python|node|\.sh\b|bash /;

// A command with no recorded end counts as running this long.
const unendedMs = 6 * 60 * 60 * 1000;

// Clock slack around a command's start and end.
const slackMs = 1000;

const windows = new Map();

function addWindow(key, start, end) {
  const list = windows.get(key) ?? [];

  list.push([start, Math.max(start, end)]);
  windows.set(key, list);
}

function claudeWindows(path, rootId) {
  const starts = new Map();
  const ends = new Map();

  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (line === "") {
      continue;
    }

    let entry;

    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }

    const at = Date.parse(entry.timestamp ?? "");
    const content = entry.message?.content;

    if (Number.isNaN(at)) {
      continue;
    }

    if (entry.type === "assistant" && Array.isArray(content)) {
      for (const block of content) {
        if (block?.type === "tool_use" && block.name === "Bash") {
          starts.set(block.id, { at, command: String(block.input?.command ?? ""), background: block.input?.run_in_background === true });
        }
      }
    }

    if (entry.type === "user") {
      const blocks = Array.isArray(content) ? content : [{ type: "text", text: String(content ?? "") }];

      for (const block of blocks) {
        if (block?.type === "tool_result" && starts.has(block.tool_use_id) && !ends.has(block.tool_use_id)) {
          ends.set(block.tool_use_id, at);
        }

        // A background command's completion notice names the tool call that started it.
        for (const match of String(block?.text ?? "").matchAll(/<tool-use-id>(toolu_[A-Za-z0-9]+)<\/tool-use-id>/g)) {
          ends.set(match[1], at);
        }
      }
    }
  }

  for (const [id, call] of starts) {
    if (launcher.test(call.command) || call.background) {
      addWindow(`claude-code:${rootId}`, call.at, ends.get(id) ?? call.at + unendedMs);
    }
  }
}

const projects = claudeProjects();

for (const folder of existsSync(projects) ? readdirSync(projects) : []) {
  const path = join(projects, folder);

  for (const name of readdirSync(path)) {
    if (name.endsWith(".jsonl")) {
      claudeWindows(join(path, name), basename(name, ".jsonl"));
    }

    const subagents = join(path, name, "subagents");

    if (existsSync(subagents)) {
      for (const file of readdirSync(subagents).filter((entry) => entry.endsWith(".jsonl"))) {
        claudeWindows(join(subagents, file), name);
      }
    }
  }
}

const source = openCodeDatabase();

if (source !== null && existsSync(source)) {
  const opencode = new DatabaseSync(source, { readOnly: true, timeout: 10_000 });
  const bySession = new Map();

  const rows = opencode
    .prepare(
      `SELECT session_id, json_extract(data, '$.time.created') AS created, json_extract(data, '$.time.completed') AS completed,
        CASE WHEN data LIKE '%"name":"shell"%' OR data LIKE '%"name":"bash"%' THEN data END AS data
      FROM session_message WHERE type = 'assistant' ORDER BY session_id, seq`
    )
    .all();

  for (const row of rows) {
    const list = bySession.get(row.session_id) ?? [];

    list.push(row);
    bySession.set(row.session_id, list);
  }

  for (const [sessionId, messages] of bySession) {
    for (const [index, message] of messages.entries()) {
      if (message.data === null || message.completed === null) {
        continue;
      }

      const commands = (JSON.parse(message.data).content ?? [])
        .filter((part) => part.type === "tool" && (part.name === "shell" || part.name === "bash"))
        .map((part) => String(part.state?.input?.command ?? ""));

      if (commands.some((command) => launcher.test(command))) {
        addWindow(`opencode:${sessionId}`, message.completed, messages[index + 1]?.created ?? message.completed + unendedMs);
      }
    }
  }

  opencode.close();
}

const db = openCatalog(!wantsApply());

const runs = db
  .prepare(
    `SELECT id, harness || ':' || native_id AS key, started_at FROM session
    WHERE parent_session_id IS NULL AND origin = 'cli' AND spawned_by_session_id IS NULL`
  )
  .all();

const sessionIds = new Map(db.prepare("SELECT id, harness || ':' || native_id AS key FROM session").all().map((row) => [row.key, row.id]));

const links = [];

let ambiguous = 0;

let unmatched = 0;

for (const run of runs) {
  const started = Date.parse(run.started_at);
  const spawners = new Set();

  for (const [key, list] of windows) {
    if (key !== run.key && list.some(([start, end]) => start - slackMs <= started && started <= end + slackMs)) {
      spawners.add(key);
    }
  }

  const [spawner] = [...spawners];

  if (spawners.size > 1) {
    ambiguous += 1;
  } else if (spawner === undefined || !sessionIds.has(spawner)) {
    unmatched += 1;
  } else {
    links.push({ run: run.id, spawner, spawnerId: sessionIds.get(spawner) });
  }
}

const perSpawner = new Map();

for (const link of links) {
  perSpawner.set(link.spawner, (perSpawner.get(link.spawner) ?? 0) + 1);
}

console.log(`CLI runs without a spawner: ${runs.length}`);

console.log(`  one candidate: ${links.length}, more than one: ${ambiguous}, none: ${unmatched}`);

for (const [spawner, count] of [...perSpawner].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
  console.log(`  ${count}\tfrom ${spawner}`);
}

if (!wantsApply()) {
  console.log(links.length === 0 ? "Nothing to link." : "Dry run. Run again with --apply to link the runs with one candidate.");
  process.exit(0);
}

if (links.length > 0) {
  console.log(`Backed up to ${backup()}`);

  const update = db.prepare("UPDATE session SET spawned_by_session_id = ? WHERE id = ? AND spawned_by_session_id IS NULL");

  db.exec("BEGIN");

  for (const link of links) {
    update.run(link.spawnerId, link.run);
  }

  db.exec("COMMIT");
  console.log(`Linked ${links.length} runs.`);
}
