import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { z } from "zod";
import { main } from "./cli.ts";

const artifactEntry = z.object({
  path: z.string(),
  status: z.string(),
  category: z.string().nullable(),
  pointer_type: z.string().nullable(),
  title: z.string().nullable(),
  efforts: z.array(z.string())
});

const fileEvent = z.union([
  z.object({ recorded: z.literal(false), reason: z.string() }),
  z.object({ recorded: z.literal(true), created: z.boolean(), artifact: artifactEntry })
]);

const describedSession = z.object({
  session: z.object({ key: z.string(), efforts: z.array(z.string()) }),
  close_matches: z.array(z.object({ requested: z.string(), matches: z.array(z.object({ slug: z.string() })) }))
});

const artifactList = z.object({ artifacts: z.array(artifactEntry) });

const groupedArtifacts = z.object({ groups: z.array(z.object({ group: z.string(), artifacts: z.array(artifactEntry) })) });

const effortList = z.object({ efforts: z.array(z.object({ slug: z.string(), title: z.string() })) });

const sessionList = z.object({ sessions: z.array(z.object({ key: z.string() })) });

const writePath = z.object({ path: z.string() });

const compactionNote = z.object({ note: z.string(), coordination: z.array(z.string()) });

const checkReport = z.object({
  missing: z.array(z.string()),
  changed: z.array(z.string()),
  moved: z.array(z.object({ from: z.string(), to: z.string() })),
  captured: z.array(z.string())
});

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function workspace() {
  const root = mkdtempSync(join(tmpdir(), "cairn-test-"));
  let now = new Date("2026-09-25T10:00:00");

  roots.push(root);

  const run = (...args: string[]) => {
    let stdout = "";
    let stderr = "";

    const code = main(args, { CAIRN_ROOT: root }, {
      stdout: (text) => {
        stdout += text;
      },
      stderr: (text) => {
        stderr += text;
      },
      stdin: () => "",
      now: () => now,
      launchIndex: () => {}
    });

    return { code, stdout, stderr };
  };

  const json = <Parser extends z.ZodType>(parser: Parser, ...args: string[]): z.infer<Parser> => {
    const result = run(...args, "--json");

    if (result.code !== 0) {
      throw new Error(`cairn ${args.join(" ")} failed: ${result.stderr}`);
    }

    return parser.parse(JSON.parse(result.stdout));
  };

  const write = (path: string, content: string): string => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);

    return path;
  };

  const index = (slug: string): string => readFileSync(join(root, "efforts", slug, "index.md"), "utf8");

  return {
    root,
    run,
    json,
    write,
    index,
    setNow: (value: string) => {
      now = new Date(value);
    }
  };
}

function writeEvidence(cairn: ReturnType<typeof workspace>, session: string, topic: string): string {
  const { path } = cairn.json(writePath, "location", "--session", session, "--topic", topic);

  cairn.write(path, `# ${topic}\n`);
  cairn.run("capture", path, "--session", session);

  return path;
}

describe("sessions and derived membership", () => {
  test("evidence written by an unattached child session joins every effort its root later attaches", () => {
    const cairn = workspace();

    cairn.run("session", "start", "opencode:root");
    cairn.run("session", "start", "opencode:explore", "--parent", "opencode:root");

    const evidence = writeEvidence(cairn, "opencode:explore", "Account structure");

    expect(evidence.startsWith(join(cairn.root, "sessions", "opencode"))).toBe(true);

    cairn.run("session", "describe", "opencode:root", "--create", "Logs archived to S3");
    cairn.run("session", "describe", "opencode:root", "--create", "OPW deployment on AWS");

    const found = cairn.json(artifactList, "find", "artifacts", "--effort", "opw-deployment-on-aws");

    expect(found.artifacts.map((entry) => entry.path)).toEqual([evidence]);
    expect(found.artifacts[0]?.efforts).toEqual(["logs-archived-to-s3", "opw-deployment-on-aws"]);
    expect(cairn.index("logs-archived-to-s3")).toContain("account-structure.md");
  });

  test("a child session attached to its own effort doesn't also feed its parent's efforts", () => {
    const cairn = workspace();

    cairn.run("session", "describe", "opencode:chief", "--create", "Chief program");
    cairn.run("session", "start", "opencode:orchestrator", "--parent", "opencode:chief");
    cairn.run("session", "describe", "opencode:orchestrator", "--create", "Review PR 123", "--workstream", "review-pr-123");

    const output = writeEvidence(cairn, "opencode:orchestrator", "review");

    expect(output).toBe(join(cairn.root, "sessions", "opencode", "2026-09", "chief", "review-pr-123", "review.md"));

    const found = cairn.json(artifactList, "find", "artifacts", "--text", "review");

    expect(found.artifacts[0]?.efforts).toEqual(["review-pr-123"]);
  });

  test("an explicit exclusion restricts a file to some of its session's efforts", () => {
    const cairn = workspace();

    cairn.run("session", "describe", "opencode:root", "--create", "Logs archived to S3");
    cairn.run("session", "describe", "opencode:root", "--create", "Cisco ASA log ingestion");

    const note = writeEvidence(cairn, "opencode:root", "ASA syslog format");

    cairn.run("describe", note, "--category", "evidence", "--title", "ASA syslog format", "--exclude", "logs-archived-to-s3");

    const inS3 = cairn.json(artifactList, "find", "artifacts", "--effort", "logs-archived-to-s3");
    const inAsa = cairn.json(artifactList, "find", "artifacts", "--effort", "cisco-asa-log-ingestion");

    expect(inS3.artifacts).toEqual([]);
    expect(inAsa.artifacts.map((entry) => entry.title)).toEqual(["ASA syslog format"]);
  });

  test("a parent learned after the child moves the child's new output into the root's folder", () => {
    const cairn = workspace();

    cairn.run("session", "start", "claude-code:agent-1");
    cairn.run("session", "start", "claude-code:agent-1", "--parent", "claude-code:main");

    const { path } = cairn.json(writePath, "location", "--session", "claude-code:agent-1", "--topic", "notes");

    expect(path).toBe(join(cairn.root, "sessions", "claude-code", "2026-09", "main", "notes.md"));
  });

  test("a session can't become its own ancestor", () => {
    const cairn = workspace();

    cairn.run("session", "start", "opencode:child", "--parent", "opencode:root");

    const result = cairn.run("session", "start", "opencode:root", "--parent", "opencode:child");

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("own ancestor");
  });
});

describe("files", () => {
  test("capture ignores files outside the root and Cairn's own index files", () => {
    const cairn = workspace();
    const outside = join(mkdtempSync(join(tmpdir(), "cairn-outside-")), "note.md");

    roots.push(dirname(outside));
    cairn.write(outside, "x");
    cairn.run("effort", "create", "--title", "Logs archived to S3");

    const external = cairn.json(fileEvent, "capture", outside, "--session", "opencode:root");
    const index = cairn.json(fileEvent, "capture", join(cairn.root, "efforts", "logs-archived-to-s3", "index.md"), "--session", "opencode:root");

    expect(external.recorded).toBe(false);
    expect(index.recorded).toBe(false);
  });

  test("location never hands out a path that exists or is already recorded", () => {
    const cairn = workspace();
    const first = writeEvidence(cairn, "opencode:root", "Findings");
    const second = cairn.json(writePath, "location", "--session", "opencode:root", "--topic", "Findings");

    expect(second.path).toBe(first.replace("findings.md", "findings-2.md"));
  });

  test("location with an effort returns a path in that effort's folder, and the file joins the effort", () => {
    const cairn = workspace();

    cairn.run("effort", "create", "--title", "Logs archived to S3");

    const { path } = cairn.json(writePath, "location", "--session", "opencode:root", "--topic", "context", "--effort", "logs-archived-to-s3");

    expect(path).toBe(join(cairn.root, "efforts", "logs-archived-to-s3", "context.md"));

    cairn.write(path, "# Logs archived to S3\n\nArchive every log stream to S3 for a year. OPW is the chosen shipper.\n");
    cairn.run("capture", path, "--session", "opencode:root");
    cairn.run("index");

    const index = cairn.index("logs-archived-to-s3");

    expect(index).toContain("Archive every log stream to S3 for a year. OPW is the chosen shipper.");
    expect(index).toMatch(/\[context\.md\]\(context\.md\) · about \d+ tokens/);
  });

  test("URL pointers are grouped by their derived type", () => {
    const cairn = workspace();

    cairn.run("session", "describe", "opencode:root", "--create", "OPW deployment on AWS");

    for (const url of [
      "https://github.com/org/infra/pull/42",
      "https://example.atlassian.net/browse/OBS-17",
      "https://example.atlassian.net/wiki/spaces/SEC/pages/1/OPW+security",
      "https://github.com/org/infra/issues/7"
    ]) {
      cairn.run("describe", url, "--category", "deliverable", "--title", url, "--session", "opencode:root");
    }

    const grouped = cairn.json(groupedArtifacts, "find", "artifacts", "--effort", "opw-deployment-on-aws", "--group-by", "category");

    expect(grouped.groups.map((group) => group.group)).toEqual(["pull_request", "jira_issue", "issue", "confluence_page"]);
    expect(cairn.index("opw-deployment-on-aws")).toMatch(/## Pull requests[\s\S]*## Jira items[\s\S]*## Issues[\s\S]*## Confluence pages/);
  });

  test("a file stays undescribed until it has a category and a title or description", () => {
    const cairn = workspace();
    const path = writeEvidence(cairn, "opencode:root", "draft");
    const categorized = cairn.json(artifactEntry, "describe", path, "--category", "synthesis");
    const described = cairn.json(artifactEntry, "describe", path, "--title", "Draft plan");

    expect(categorized.status).toBe("undescribed");
    expect(described.status).toBe("active");
  });

  test("describing with supersedes marks the older file superseded", () => {
    const cairn = workspace();
    const older = writeEvidence(cairn, "opencode:root", "plan v1");
    const newer = writeEvidence(cairn, "opencode:root", "plan v2");

    cairn.run("describe", newer, "--category", "synthesis", "--title", "Plan", "--supersedes", older);

    const superseded = cairn.json(artifactList, "find", "artifacts", "--status", "superseded");

    expect(superseded.artifacts.map((entry) => entry.path)).toEqual([older]);
  });

  test("mv moves the file and keeps its description", () => {
    const cairn = workspace();
    const path = writeEvidence(cairn, "opencode:root", "notes");
    const destination = join(cairn.root, "sessions", "renamed.md");

    cairn.run("describe", path, "--category", "evidence", "--title", "Notes");

    const moved = cairn.json(artifactEntry, "mv", path, destination);

    expect(existsSync(destination)).toBe(true);
    expect(moved.title).toBe("Notes");
  });

  test("check finds missing, changed, moved, and unrecorded files", () => {
    const cairn = workspace();

    cairn.run("session", "start", "opencode:root");

    const gone = writeEvidence(cairn, "opencode:root", "gone");
    const edited = writeEvidence(cairn, "opencode:root", "edited");
    const relocated = writeEvidence(cairn, "opencode:root", "relocated");
    const folder = dirname(gone);
    const shellWritten = cairn.write(join(folder, "shell-output.md"), "written by a shell redirect");
    const relocatedTo = join(folder, "archive", "relocated.md");

    writeFileSync(relocated, "moved content");
    cairn.run("capture", relocated, "--session", "opencode:root");
    rmSync(gone);
    writeFileSync(edited, "changed");
    mkdirSync(dirname(relocatedTo));
    renameSync(relocated, relocatedTo);

    const report = cairn.json(checkReport, "check");

    expect(report).toEqual({
      missing: [gone],
      changed: [edited],
      moved: [{ from: relocated, to: relocatedTo }],
      captured: [shellWritten]
    });

    const bySession = cairn.json(artifactList, "find", "artifacts", "--session", "opencode:root", "--text", "shell-output");

    expect(bySession.artifacts.map((entry) => entry.path)).toEqual([shellWritten]);
  });

  test("a read of an unrecorded file records it without crediting the reader", () => {
    const cairn = workspace();
    const path = cairn.write(join(cairn.root, "sessions", "loose.md"), "x");

    cairn.run("session", "describe", "opencode:reader", "--create", "Logs archived to S3");
    cairn.run("read", path, "--session", "opencode:reader");

    const found = cairn.json(artifactList, "find", "artifacts", "--text", "loose");

    expect(found.artifacts[0]?.efforts).toEqual([]);
  });
});

describe("efforts", () => {
  test("creating an effort close to an existing one returns the match instead of attaching", () => {
    const cairn = workspace();

    cairn.run("effort", "create", "--title", "OPW deployment on AWS");

    const proposed = cairn.json(describedSession, "session", "describe", "opencode:root", "--create", "OPW deployment");

    expect(proposed.session.efforts).toEqual([]);
    expect(proposed.close_matches[0]?.matches.map((match) => match.slug)).toEqual(["opw-deployment-on-aws"]);

    const confirmed = cairn.json(describedSession, "session", "describe", "opencode:root", "--create", "OPW deployment", "--confirm-new");

    expect(confirmed.session.efforts).toEqual(["opw-deployment"]);
  });

  test("split creates a linked effort and removes nothing from the original", () => {
    const cairn = workspace();

    cairn.run("session", "describe", "opencode:research", "--create", "Logs archived to S3", "--create-tag", "initiative:observability-pipeline");

    const opwNotes = writeEvidence(cairn, "opencode:research", "OPW hosting options");
    const bucketNotes = writeEvidence(cairn, "opencode:research", "Bucket layout");

    const split = cairn.run(
      "effort", "split", "logs-archived-to-s3",
      "--title", "OPW deployment on AWS",
      "--session", "opencode:research",
      "--artifact", opwNotes
    );

    expect(split.code).toBe(0);

    const original = cairn.json(artifactList, "find", "artifacts", "--effort", "logs-archived-to-s3");
    const splitOff = cairn.json(effortList, "find", "efforts", "--tag", "initiative:observability-pipeline");

    expect(original.artifacts.map((entry) => entry.path).sort()).toEqual([bucketNotes, opwNotes].sort());
    expect(splitOff.efforts.map((effort) => effort.slug).sort()).toEqual(["logs-archived-to-s3", "opw-deployment-on-aws"]);
    expect(cairn.index("logs-archived-to-s3")).toContain("Split into [OPW deployment on AWS](../opw-deployment-on-aws/index.md)");
    expect(cairn.index("opw-deployment-on-aws")).toContain("Split from [Logs archived to S3](../logs-archived-to-s3/index.md)");
  });

  test("a dependency can't be added in both directions", () => {
    const cairn = workspace();

    cairn.run("effort", "create", "--title", "Cisco ASA log ingestion");
    cairn.run("effort", "create", "--title", "OPW deployment on AWS");

    expect(cairn.run("link", "add", "effort", "cisco-asa-log-ingestion", "depends_on", "opw-deployment-on-aws").code).toBe(0);

    const reverse = cairn.run("link", "add", "effort", "opw-deployment-on-aws", "depends_on", "cisco-asa-log-ingestion");

    expect(reverse.code).toBe(1);
    expect(reverse.stderr).toContain("split out the shared piece");
    expect(cairn.index("opw-deployment-on-aws")).toContain("Needed by [Cisco ASA log ingestion]");
  });

  test("rename moves the effort's folder and keeps its records attached", () => {
    const cairn = workspace();

    cairn.run("effort", "create", "--title", "S3 archive");

    const { path } = cairn.json(writePath, "location", "--session", "opencode:root", "--topic", "context", "--effort", "s3-archive");

    cairn.write(path, "# S3 archive\n\nKeep a year of logs.\n");
    cairn.run("capture", path, "--session", "opencode:root");
    cairn.run("effort", "rename", "s3-archive", "logs-archived-to-s3");

    expect(existsSync(join(cairn.root, "efforts", "s3-archive"))).toBe(false);
    expect(cairn.index("logs-archived-to-s3")).toContain("Keep a year of logs.");
  });

  test("merge moves sessions and links and reports records it didn't fold in", () => {
    const cairn = workspace();

    cairn.run("session", "describe", "opencode:a", "--create", "OPW deployment on AWS");
    cairn.run("session", "describe", "opencode:b", "--create", "Observability pipelines worker hosting");
    cairn.run("effort", "create", "--title", "Cisco ASA log ingestion");
    cairn.run("link", "add", "effort", "cisco-asa-log-ingestion", "depends_on", "observability-pipelines-worker-hosting");

    const { path } = cairn.json(
      writePath, "location", "--session", "opencode:b", "--topic", "context", "--effort", "observability-pipelines-worker-hosting"
    );

    cairn.write(path, "# Hosting\n\nEC2 in the shared services VPC.\n");

    const merged = cairn.run("effort", "merge", "observability-pipelines-worker-hosting", "--into", "opw-deployment-on-aws");
    const sessions = cairn.json(sessionList, "find", "sessions", "--effort", "opw-deployment-on-aws");

    expect(merged.stdout).toContain(path);
    expect(sessions.sessions.map((session) => session.key).sort()).toEqual(["opencode:a", "opencode:b"]);
    expect(cairn.index("cisco-asa-log-ingestion")).toContain("Depends on [OPW deployment on AWS]");
  });
});

describe("compaction note", () => {
  test("lists attached efforts with record paths, linked efforts, and the coordination record", () => {
    const cairn = workspace();

    cairn.run("session", "describe", "opencode:root", "--create", "Cisco ASA log ingestion");
    cairn.run("effort", "create", "--title", "OPW deployment on AWS");
    cairn.run("link", "add", "effort", "cisco-asa-log-ingestion", "depends_on", "opw-deployment-on-aws");

    const context = cairn.write(join(cairn.root, "efforts", "cisco-asa-log-ingestion", "context.md"), "# ASA\n");
    const { path: folderProbe } = cairn.json(writePath, "location", "--session", "opencode:root", "--topic", "probe");
    const coordination = cairn.write(join(dirname(folderProbe), "coordination.md"), "# Run\n");
    const result = cairn.json(compactionNote, "session", "context", "opencode:root");

    expect(result.note).toContain(`- Cisco ASA log ingestion (cisco-asa-log-ingestion): ${context}`);
    expect(result.note).toContain("OPW deployment on AWS (cisco-asa-log-ingestion depends on opw-deployment-on-aws)");
    expect(result.coordination).toEqual([coordination]);
  });
});

describe("indexes", () => {
  test("captures don't rewrite indexes; the next other command does", () => {
    const cairn = workspace();

    cairn.run("session", "describe", "opencode:root", "--create", "Logs archived to S3");

    const path = writeEvidence(cairn, "opencode:root", "late finding");

    expect(cairn.index("logs-archived-to-s3")).not.toContain("late-finding.md");

    cairn.run("find", "efforts");

    expect(cairn.index("logs-archived-to-s3")).toContain("late-finding.md");
    expect(path).toContain("late-finding.md");
  });
});

describe("backups", () => {
  test("the first write of each day copies the database, keeping seven", () => {
    const cairn = workspace();

    for (let day = 1; day <= 9; day += 1) {
      cairn.setNow(`2026-10-${String(day).padStart(2, "0")}T09:00:00`);
      cairn.run("effort", "create", "--title", `Effort number ${day}`, "--confirm-new");
      cairn.run("effort", "create", "--title", `Second effort ${day}`, "--confirm-new");
    }

    const backups = readdirSync(join(cairn.root, "backups")).sort();

    expect(backups).toEqual([3, 4, 5, 6, 7, 8, 9].map((day) => `catalog-2026-10-0${day}.db`));
  });

  test("restore brings back the earlier catalog and keeps the replaced one", () => {
    const cairn = workspace();

    cairn.run("effort", "create", "--title", "Logs archived to S3");

    const { path } = cairn.json(writePath, "backup");

    cairn.run("effort", "create", "--title", "Cisco ASA log ingestion");

    const restored = cairn.run("restore", path);
    const efforts = cairn.json(effortList, "find", "efforts");
    const kept = readdirSync(join(cairn.root, "backups")).filter((name) => name.includes("before-restore"));

    expect(restored.code).toBe(0);
    expect(efforts.efforts.map((effort) => effort.slug)).toEqual(["logs-archived-to-s3"]);
    expect(kept).toHaveLength(1);
  });
});

describe("input validation", () => {
  test("a malformed session key is rejected with the expected form", () => {
    const cairn = workspace();
    const result = cairn.run("session", "start", "no-harness");

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Expected <harness>:<native-id>");
  });
});
