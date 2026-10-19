// Read a design's records (design.json, or design.md before format 3, and changes.md) and render them as page HTML.
//
// The records hold what the design has established: the problem, goals and how it works in prose, then terms,
// requirements, parts, the plan, decisions with their options, risks, open questions, evidence and meetings. Pages pull
// tables from them with placeholders such as
//
//     <!-- records decisions -->
//     <!-- records requirements page=s3-archive -->
//     <!-- records reasoning ids=D1 -->
//     <!-- records questions blocks=D1,D2 -->
//     <!-- records progress -->
//
// Every record is defined once, on the overview (or the first page when a doc has none), and every other page refers to
// it. A record lives on one page: a requirement, part, decision or risk on its Page, a question with the things it
// blocks. The overview gathers every record, grouped by where it lives, and an area page shows its own records and those
// from elsewhere that reach it.
//
// The rendered markup is what doc.js expects: every requirement, decision, question and evidence row is a definition
// that reference cards are built from. A field named "Recorded from" is private: it says where the record came from (a
// session, a meeting, a local file) and is never rendered.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { toMarkdown } from "./jsonfmt.mjs";
import { capitalize, esc, jsonKind, partition, roundHalfEven, shortDate, splitLines, thousands, unique, weekday, WORD, words } from "./text.mjs";

// The format a design folder is written in: design.json's "format", or design.md's first line,
// "<!-- design-docs format 2 -->". doc.mjs migrate brings an older folder up to date; a folder with no line is format 1.
export const FORMAT = 4;

const FORMAT_LINE = /^<!--\s*design-docs format (\d+)\s*-->\s*$/;

const SECTIONS = {
  terms: "term",
  requirements: "requirement",
  parts: "part",
  decisions: "decision",
  risks: "risk",
  costs: "cost",
  flows: "flow",
  questions: "question",
  evidence: "evidence",
  meetings: "meeting",
  plan: "deliverable",
  links: "link",
  jira: "jira",
  facts: "fact"
};

// design.md holds what an update reads every time; Evidence and Meetings may sit in their own files beside it.
const SPLIT_FILES = ["design.md", "evidence.md", "meetings.md"];

const FACT_REF = /\{fact:([a-z0-9][a-z0-9-]*)\}/g;

// A meeting's Outcomes: one line per thing it settled, '<Kind> · <what> → <record IDs, fact:key or a phase title>'.
const OUTCOME_KINDS = new Set(["decided", "leaning", "later", "answer", "so far", "deferred", "new question", "requirement", "deliverable", "phase", "fact", "evidence", "scope", "risk", "follow-on"]);

const OUTCOME = /^(?<kind>[^·]+?)\s+·\s+(?<what>.+?)\s+(?:→|->)\s+(?<to>.+)$/;

// Prose sections an agent reads to understand the design; a page shows them with the design-section component.
const PROSE_SECTIONS = { problem: "problem", goals: "goals", "how it works": "how-it-works" };

const PREFIX = { requirement: "R", decision: "D", question: "Q", evidence: "E", deliverable: "P" };

export const ID_TOKEN = /^[EQDRP]\d+$/;

const FLOW_ID = /^[A-Z][A-Z0-9]*-F\d+$/;

const NOT_WORD = `(?!${WORD})`;

export const MENTION = new RegExp(`(?<![\\p{L}\\p{N}_#/\\\\-])([EQDRP]\\d+)${NOT_WORD}`, "gu");

const ESCAPED = new RegExp(`\\\\([EQDRP]\\d+)${NOT_WORD}`, "gu");

const LINK = /\[([^\]]+)\]\((#[\p{L}\p{N}_.-]+)\)/gu;

const PLACEHOLDER = /<!--\s*records\s+([\p{L}\p{N}_-]+)((?:\s+[\p{L}\p{N}_-]+=[^\s>]+)*)\s*-->/gu;

const MONEY = /^\$([\d,]+(?:\.\d+)?)(?:\s*(?:→|->)\s*\$([\d,]+(?:\.\d+)?))?$/;

const MEETING_HEAD = /^(\d{4}-\d{2}-\d{2})$/;

const CHANGE_HEAD = /^##\s+(\d{4}-\d{2}-\d{2})\s+·\s+(.+?)\s*$/;

const REQUIRED = {
  requirement: ["Priority", "Why", "Source"],
  decision: ["Status"],
  evidence: ["Found", "How we know", "Gathered from"],
  meeting: ["Status"],
  part: ["Does"],
  risk: ["Likelihood"],
  cost: ["Monthly"],
  flow: ["Data", "Crosses", "Assessment"],
  deliverable: ["Scope", "Exit criteria", "Status"],
  link: ["URL"],
  jira: ["URL", "Type", "Status"]
};

const ANSWER_LABELS = ["Answer", "Leaning", "For now", "Assuming", "So far"];

const DECISION_STATUS = { open: "open", leaning: "leaning", decided: "decided", later: "", given: "" };

// Option statuses, and the class an option card carries for each. Set aside and Not chosen take a date.
export const OPTION_STATUS = { "current leaning": "leaning", chosen: "chosen", "not chosen": "not-chosen", "set aside": "", "found in research": "", "not designed yet": "" };

const OPTION_PILL = { "current leaning": "leaning", chosen: "decided" };

const WHY_LIMIT = 240;

const EXPLANATION_HINT = "a few sentences on what it asks and where it fits, for a reader who doesn't follow it";

// How far a decision has got, for progress: Given counts as settled.
const DECISION_STATE = { open: "open", leaning: "leaning", later: "later", decided: "decided", given: "decided" };

const UNSETTLED = ["open", "leaning", "later"];

const MEETING_STATUS = { "awaiting review": "open", summarised: "" };

// A meeting's proposals: what the meeting could change in the design, each gone through with the user.
const PROPOSAL_STATUS = { proposed: "open", accepted: "decided", changed: "decided", rejected: "", deferred: "leaning" };

const PROPOSAL_LABEL = { proposed: "To review", accepted: "Accepted", changed: "Accepted with changes", rejected: "Rejected", deferred: "Deferred" };

// Proposals that change what the design says come first and in full; record-keeping ones fold into one group.
const PROPOSAL_ORDER = ["decided", "leaning", "later", "deferred", "answer", "so far", "deliverable", "phase", "scope", "requirement", "fact", "new question", "risk", "evidence", "follow-on"];

const ROUTINE_KINDS = new Set(["evidence", "risk", "follow-on"]);

const FIELD_TALK = /\b(Needed by|Answer from|Blocks|Waiting on|Status|Recorded from|Answered by|Explanation|Still to show)\s*:/i;

const RECOMMEND = { accept: "decided", "accept as leaning": "leaning", ask: "open", defer: "leaning", reject: "" };

// A decisions table: the decision with where it stands under it, then what it waits on and where it's worked out.
const DECISION_HEAD = ["ID", "Decision", "Waiting on", "Worked out in"];

// A deliverable's Status, and the class its pill takes.
const DELIVERABLE_STATUS = { proposed: "", planned: "", "in progress": "leaning", done: "decided" };

// The roles a link plays: something the design published, or someone else's page it relies on.
const LINK_ROLES = { published: "Published from here", referenced: "Referenced" };

// A Jira item's status as Jira's three categories, from its Category or, without one, from the status words.
const JIRA_DONE = /\b(done|closed|resolved|complete|completed|released|shipped)\b/i;

const JIRA_TODO = /\b(to ?do|open|backlog|new|selected for development|not started)\b/i;

const JIRA_KEY = /(?:\/browse\/|[?&]selectedIssue=)([A-Z][A-Z0-9_]*-\d+)/;

const LIKELIHOOD = { high: "open", medium: "open", low: "", unknown: "" };

const VERDICT = ["yes", "partly", "no"];

// How a requirement measures up, three ways: the system as it is today, what this design covers, and what still has to
// be shown before anyone can say it holds. Each maps a verdict to its class; Still to show also to its label.
const TODAY = { meets: "yes", "doesn't meet": "no", unknown: "unknown", "nothing today": "none" };

const DESIGN = { covers: "yes", "partly covers": "partly", partly: "partly", "not covered": "no" };

const STILL = { demonstrated: ["Demonstrated", "decided"], intended: ["Intended, not tested", "leaning"], unconfirmed: ["Unconfirmed", "open"], "nothing left": ["Nothing left", ""] };

// The older single verdict, read as what the design covers.
const LEGACY_MET = { yes: "covers", partly: "partly", no: "not covered" };

const TODAY_LABEL = { meets: "Meets", "doesn't meet": "Doesn't meet", unknown: "Unknown", "nothing today": "Nothing today" };

const DESIGN_LABEL = { covers: "Covers", "partly covers": "Partly covers", partly: "Partly covers", "not covered": "Not covered" };

// When a question's answer is needed; a deliverable's title works too.
const NEEDED_BY = { "choosing the design": "choose", "before building": "build", "later phase": "later" };

// How a question's answer can be got: by research an agent can do (reading documentation, a repository, an account),
// from a person, or as someone's approval. Research says where to look after a "·".
const ANSWER_FROM = { research: "Research", person: "Person", approval: "Approval" };

// An AI recommendation on an open decision or question: advice for the people deciding, never what they agreed. Its
// parts, in the order they're written. Model names the model that made it, since different models recommend
// differently; Seen is the newest evidence it was made from, so later evidence can mark it out of date.
const RECOMMEND_PARTS = ["because", "would change if", "confidence", "model", "made", "seen"];

const CONFIDENCE = ["high", "medium", "low"];

// A model's short name fits the AI tag beside a table row; a provider, platform or model ID doesn't.
const MODEL_LIMIT = 24;

// The parts an Explanation can be written in, in the order they show.
const EXPLAIN_PARTS = [
  ["means here", "What it means here"],
  ["matters", "Why it matters"],
  ["answer changes", "What the answer changes"],
  ["settled by", "What settles it"]
];

// A verdict of "not built yet" says nothing about whether the design fits; these words give it away.
const NOT_BUILT = /\b(not (yet )?built|isn't built|aren't built|to be built|once (it's|it is) built|when (it's|it is) built)\b/i;

const PRIORITY = { must: "badge", should: "badge outline" };

const PRIVATE = "recorded from";

export const LOCAL_PATH_PATTERNS = [
  [/file:\/\//i, "file:// URL"],
  [/(?<![\p{L}\p{N}_.])\/(?:home|Users|mnt|tmp)\/[\p{L}\p{N}_.-]+/u, "absolute local path"],
  [/(?<![\p{L}\p{N}_])[A-Z]:\\[\p{L}\p{N}_\\. -]+/u, "Windows path"],
  [/\\\\wsl/, "WSL path"],
  [/(?<![\p{L}\p{N}_/])~\/[\p{L}\p{N}_.-]+/u, "home-relative path"]
];

const has = (object, key) => Object.hasOwn(object, key);

const first = (status) => words(status)[0] ?? "";

// Every match of a pattern's first group.
const all = (pattern, text) => [...text.matchAll(pattern)].map((match) => match[1]);

const byNumber = (left, right) => Number(left.slice(1)) - Number(right.slice(1));

export class Field {
  constructor(value, items, line) {
    this.value = value;
    this.items = items;
    this.line = line;
  }
}

export class Record {
  constructor(kind, id, title, line) {
    this.kind = kind;
    this.id = id;
    this.title = title;
    this.line = line;
    this.fields = new Map();
    this.options = [];
    this.body = [];
  }

  get(key) {
    return this.field(key)?.value ?? "";
  }

  field(key) {
    const wanted = key.toLowerCase();

    for (const [name, value] of this.fields) {
      if (name.toLowerCase() === wanted) {
        return value;
      }
    }

    return null;
  }

  items(key) {
    return this.field(key)?.items ?? [];
  }
}

export class Design {
  constructor(path) {
    this.path = path;
    this.title = "";
    this.dek = "";
    this.terms = [];
    this.prose = new Map();
    this.records = [];
    // What the cost figures assume and leave out: '- Assumes:' and '- Leaves out:' under '## Costs', before its lines.
    this.costBasis = new Map();
    this.changes = [];
    this.errors = [];
    this.warnings = [];
    // Named values defined once under '## Facts' and written as {fact:key} anywhere else: key -> [value, line].
    this.facts = new Map();
    // Where each read line came from, for messages: [first line number, file name, that file's first line].
    this.spans = [];
    this.factSources = new Map();
    // For a design kept as JSON: where each generated line came from ("design.json › decisions › D1 › Status").
    this.labels = [];
  }

  of(kind) {
    return this.records.filter((record) => record.kind === kind);
  }

  byId() {
    const known = new Map();

    for (const record of this.records) {
      known.set(record.id, record);
    }

    return known;
  }

  where(line) {
    if (this.labels.length > 0 && line > 0 && line <= this.labels.length) {
      return this.labels[line - 1];
    }

    for (const [start, name, firstLine] of [...this.spans].reverse()) {
      if (line >= start) {
        return `${name}:${line - start + firstLine}`;
      }
    }

    return `${basename(this.path)}:${line}`;
  }
}

// Reading

export function readDesign(path) {
  const design = new Design(path);
  let section = null;
  let record = null;
  let option = null;
  let last = null;
  let prose = [];
  let titleSeen = false;
  let lines = [];
  const generated = toMarkdown(dirname(path));

  if (generated !== null) {
    lines = generated.lines;
    design.labels = generated.labels;
    design.path = join(dirname(path), "design.json");
  } else {
    for (const name of SPLIT_FILES) {
      const part = name === "design.md" ? path : join(dirname(path), name);

      if (!existsSync(part)) {
        continue;
      }

      design.spans.push([lines.length + 1, basename(part), 1]);
      lines = lines.concat(splitLines(readFileSync(part, "utf8")));
    }
  }

  lines.forEach((raw, index) => {
    const number = index + 1;
    const line = raw.trimEnd();
    const stripped = line.trim();

    if (line.startsWith("# ") && !titleSeen) {
      design.title = line.slice(2).trim();
      titleSeen = true;

      return;
    }

    if (line.startsWith("## ")) {
      const name = line.slice(3).trim().toLowerCase();

      section = has(SECTIONS, name) ? SECTIONS[name] : null;
      record = option = last = null;

      if (has(PROSE_SECTIONS, name)) {
        section = "prose";

        if (!design.prose.has(PROSE_SECTIONS[name])) {
          design.prose.set(PROSE_SECTIONS[name], []);
        }

        prose = design.prose.get(PROSE_SECTIONS[name]);

        return;
      }

      if (section === null) {
        design.warnings.push(`${design.where(number)}: section '${line.slice(3).trim()}' isn't a records section; nothing in it is rendered`);
      }

      return;
    }

    if (section === "prose") {
      prose.push(line);

      return;
    }

    if (section === null) {
      if (titleSeen && stripped && !design.dek && !stripped.startsWith("-") && !stripped.startsWith("#")) {
        design.dek = stripped;
      }

      return;
    }

    if (section === "fact") {
      const fact = /^- ([a-z0-9][a-z0-9-]*):\s*(.+)$/.exec(stripped);

      if (fact !== null) {
        const key = fact[1];
        const value = fact[2].split(/\s+·\s+Source:/)[0].trim();
        const source = /·\s+Source:\s*(.+)$/.exec(fact[2]);

        if (source !== null) {
          design.factSources.set(key, source[1].trim());
        }

        if (design.facts.has(key)) {
          design.errors.push(`${design.where(number)}: fact '${key}' is defined twice`);
        }

        design.facts.set(key, [value, number]);
      } else if (stripped) {
        design.errors.push(`${design.where(number)}: write a fact as '- key: value · Source: E1'`);
      }

      return;
    }

    if (section === "term") {
      if (stripped.startsWith("- ")) {
        const term = readTerm(stripped.slice(2), number, design);

        if (term !== null) {
          design.terms.push(term);
        }
      }

      return;
    }

    if (line.startsWith("### ")) {
      record = readHeading(section, line.slice(4).trim(), number, design);
      design.records.push(record);
      option = last = null;

      return;
    }

    if (line.startsWith("#### ")) {
      if (record === null || record.kind !== "decision") {
        design.errors.push(`${design.where(number)}: options (####) belong under a decision`);

        return;
      }

      const [letter, , name] = partition(line.slice(5).trim(), " · ");

      option = new Record("option", letter.trim(), name.trim(), number);
      record.options.push(option);
      last = null;

      return;
    }

    const target = option ?? record;

    if (target === null) {
      const basis = /^- (Assumes|Leaves out):\s*(.*)$/.exec(line);

      if (section === "cost" && basis !== null) {
        last = new Field(basis[2].trim(), [], number);
        design.costBasis.set(basis[1], last);

        return;
      }

      if (section === "cost" && last !== null && /^\s{2,}- (.+)$/.test(line)) {
        last.items.push(line.trim().slice(2).trim());

        return;
      }

      if (stripped) {
        design.warnings.push(`${design.where(number)}: text before the first ### item is ignored`);
      }

      return;
    }

    const fieldMatch = /^- ([^:]+?):(?:\s+(.*))?$/.exec(line);

    if (fieldMatch !== null) {
      last = new Field((fieldMatch[2] ?? "").trim(), [], number);
      target.fields.set(fieldMatch[1].trim(), last);

      return;
    }

    const itemMatch = /^\s{2,}- (.+)$/.exec(line);

    if (itemMatch !== null && last !== null) {
      last.items.push(itemMatch[1].trim());

      return;
    }

    if (stripped) {
      target.body.push(stripped);
      last = null;
    }
  });

  const changesPath = join(dirname(path), "changes.md");

  if (existsSync(changesPath)) {
    design.changes = readChanges(changesPath, design);
  }

  return design;
}

export function readFormat(path) {
  const json = join(dirname(path), "design.json");

  if (extname(path) === ".json" || existsSync(json)) {
    return Number.parseInt(String(JSON.parse(readFileSync(json, "utf8")).format ?? FORMAT), 10);
  }

  const firstLine = existsSync(path) ? readFileSync(path, "utf8").split("\n", 1)[0] : "";
  const found = FORMAT_LINE.exec(firstLine);

  return found === null ? 1 : Number(found[1]);
}

export function writeFormat(path, number) {
  const json = join(dirname(path), "design.json");

  if (existsSync(json)) {
    const data = JSON.parse(readFileSync(json, "utf8"));

    data.format = number;
    writeFileSync(json, `${JSON.stringify(data, null, 2)}\n`);

    return;
  }

  const text = readFileSync(path, "utf8");
  const [firstLine, , rest] = partition(text, "\n");
  const body = FORMAT_LINE.test(firstLine) ? rest : text;

  writeFileSync(path, `<!-- design-docs format ${number} -->\n${body}`);
}

function readTerm(text, number, design) {
  const match = /^\*\*(.+?)\*\*\s*(?:\[([^\]]*)\])?\s*:\s*(.+)$/.exec(text);

  if (match === null) {
    design.errors.push(`${design.where(number)}: write a term as '- **Term** [page, page]: definition'`);

    return null;
  }

  const pages = (match[2] ?? "")
    .split(",")
    .map((page) => page.trim())
    .filter((page) => page !== "");

  return { name: match[1].trim(), pages, text: match[3].trim(), line: number };
}

function readHeading(kind, text, number, design) {
  if (has(PREFIX, kind)) {
    const [ident, separator, title] = partition(text, " · ");

    if (!separator || !new RegExp(`^${PREFIX[kind]}\\d+$`).test(ident.trim())) {
      design.errors.push(`${design.where(number)}: a ${kind} heading is '### ${PREFIX[kind]}<n> · <text>'; got '${text}'`);
    }

    return new Record(kind, ident.trim(), title.trim(), number);
  }

  if (kind === "flow") {
    const [ident, separator, title] = partition(text, " · ");

    if (!separator || !FLOW_ID.test(ident.trim())) {
      design.errors.push(`${design.where(number)}: a flow heading is '### <view>-F<n> · <from> → <to>', such as 'B-F2 · Syslog server → OPW workers'; got '${text}'`);
    }

    return new Record(kind, ident.trim(), title.trim(), number);
  }

  if (kind === "jira") {
    const [key, separator, title] = partition(text, " · ");

    if (!separator || !/^[A-Z][A-Z0-9_]*-\d+$/.test(key.trim())) {
      design.errors.push(`${design.where(number)}: a Jira item's heading is '### <KEY> · <title>', such as 'OBS-220 · Run the OPW workers'; got '${text}'`);
    }

    return new Record(kind, key.trim(), title.trim(), number);
  }

  if (kind === "meeting") {
    const [date, separator, title] = partition(text, " · ");

    if (!separator || !MEETING_HEAD.test(date.trim())) {
      design.errors.push(`${design.where(number)}: a meeting heading is '### YYYY-MM-DD · <title>'; got '${text}'`);
    }

    return new Record(kind, `meeting-${date.trim()}`, title.trim(), number);
  }

  return new Record(kind, text, text, number);
}

function readChanges(path, design) {
  const changes = [];

  splitLines(readFileSync(path, "utf8")).forEach((line, index) => {
    const number = index + 1;

    if (line.startsWith("## ")) {
      const match = CHANGE_HEAD.exec(line);

      if (match === null) {
        design.errors.push(`${basename(path)}:${number}: a change heading is '## YYYY-MM-DD · <source>'; got '${line}'`);

        return;
      }

      changes.push({ date: match[1], source: match[2], items: [], line: number });
    } else if (line.startsWith("- ") && changes.length > 0) {
      changes.at(-1).items.push(line.slice(2).trim());
    }
  });

  return changes;
}

// Checking

export function checkDesign(design, pages, anchors) {
  const known = design.byId();
  const seen = new Map();
  const identified = new Set([...Object.keys(PREFIX), "meeting", "flow"]);

  for (const record of design.records) {
    if (seen.has(record.id) && identified.has(record.kind)) {
      design.errors.push(`${design.where(record.line)}: duplicate id '${record.id}' (first at line ${seen.get(record.id)})`);
    }

    if (!seen.has(record.id)) {
      seen.set(record.id, record.line);
    }

    for (const key of REQUIRED[record.kind] ?? []) {
      if (record.field(key) === null) {
        design.errors.push(`${design.where(record.line)}: ${record.kind} '${record.id}' has no '${key}'`);
      }
    }

    const status = record.get("Status");

    if (record.kind === "decision" && status && !has(DECISION_STATUS, first(status).toLowerCase())) {
      design.errors.push(`${design.where(record.line)}: decision status '${status}'; use Open, Leaning <option>, Decided, Later or Given`);
    }

    if (record.kind === "question") {
      checkQuestion(record, design);
    }

    if (record.kind === "meeting" && status && !has(MEETING_STATUS, status.toLowerCase())) {
      design.errors.push(`${design.where(record.line)}: meeting status '${status}'; use Awaiting review or Summarised. The doc records meetings that happened, not the next one`);
    }

    if (record.kind === "meeting" && record.field("Agenda")) {
      design.warnings.push(`${design.where(record.field("Agenda").line)}: meeting '${record.id}' has an 'Agenda'; the doc records meetings that happened, and an agenda is drafted when someone asks`);
    }

    if (record.kind === "deliverable") {
      checkDeliverable(record, design);
    }

    if (record.kind === "link") {
      checkLink(record, design);
    }

    if (record.kind === "jira") {
      checkJira(record, design);
    }

    if (record.kind === "requirement" && !has(PRIORITY, record.get("Priority").toLowerCase())) {
      design.errors.push(`${design.where(record.line)}: priority '${record.get("Priority")}'; use Must or Should`);
    }

    if (record.kind === "decision") {
      checkDecision(record, design);
    }

    if (record.kind === "decision" || record.kind === "question") {
      checkRecommendation(record, design);
    }

    if (record.kind === "cost") {
      checkCost(record, design);
    }

    if (record.kind === "flow") {
      for (const key of ["Crosses", "Assessment"]) {
        const found = record.field(key);

        if (found && parseMet(found.value) === null) {
          design.errors.push(`${design.where(found.line)}: write a flow's '${key}' as 'Yes|Partly|No · words [E1, Q2]'`);
        }
      }
    }

    if (record.kind === "requirement") {
      checkRequirement(record, design);
    }

    if (record.field("Explanation") !== null) {
      explanationParts(record, design);
    }

    for (const [text, line] of recordTexts(record)) {
      for (const [pattern, label] of LOCAL_PATH_PATTERNS) {
        const found = pattern.exec(text);

        if (found !== null) {
          design.errors.push(`${design.where(line)}: ${label} would be published: '${found[0]}'. Keep it in 'Recorded from'`);
        }
      }

      for (const ident of all(MENTION, text)) {
        if (!known.has(ident)) {
          design.errors.push(`${design.where(line)}: '${ident}' is mentioned, but no record has that id`);
        }
      }
    }

    if (pages !== null) {
      for (const key of ["Page", "Applies to", "Designed on"]) {
        const found = record.field(key);

        for (const page of found ? splitList(found.value) : []) {
          if (!has(pages, page)) {
            design.errors.push(`${design.where(found.line)}: '${key}' names page '${page}', which isn't in the doc`);
          }
        }
      }

      for (const [name, value] of record.fields) {
        const on = /^(?:met|design|still to show) on (.+)$/i.exec(name);

        if (on !== null) {
          const page = on[1].trim();

          if (!has(pages, page)) {
            design.errors.push(`${design.where(value.line)}: '${name}' names page '${page}', which isn't in the doc`);
          }
        }
      }

      for (const key of ["Worked out in", "Decided in"]) {
        const worked = record.field(key);

        if (!worked || anchors === null) {
          continue;
        }

        const target = worked.value;

        if (target.startsWith("meeting-")) {
          if (!known.has(target)) {
            design.errors.push(`${design.where(worked.line)}: '${key}' names '${target}', which isn't a meeting in the records`);
          }
        } else if (/^[a-z0-9][a-z0-9-]*$/.test(target) && !has(pages, target) && !has(anchors, target)) {
          design.errors.push(`${design.where(worked.line)}: '${key}' names '${target}', which isn't a page or a section on one`);
        }
      }
    }
  }

  if (pages !== null) {
    for (const term of design.terms) {
      for (const page of term.pages) {
        if (!has(pages, page)) {
          design.errors.push(`${design.where(term.line)}: term '${term.name}' names page '${page}', which isn't in the doc`);
        }
      }
    }
  }

  checkWaiting(design);
  checkFacts(design);
  checkProposals(design);
  checkOutcomes(design);
  checkPlanOrder(design);

  const costs = design.of("cost");
  const categorised = costs.filter((cost) => cost.get("Category"));

  if (categorised.length > 0 && categorised.length < costs.length) {
    const missing = costs.filter((cost) => !cost.get("Category")).map((cost) => cost.title);

    design.warnings.push(`${basename(design.path)}: cost lines without a 'Category' (${missing.slice(0, 4).join("; ")}); give every line one so totals compare`);
  }

  if (costs.length > 0 && design.costBasis.size === 0) {
    design.warnings.push(`${basename(design.path)}: '## Costs' has no '- Assumes:' or '- Leaves out:' before its lines; say what the figures assume and what they leave out`);
  }

  const meetings = new Set(design.of("meeting").map((meeting) => meeting.id));

  for (const change of design.changes) {
    if (change.source.startsWith("meeting ") && !meetings.has(`meeting-${change.source.slice(8).trim()}`)) {
      design.warnings.push(`changes.md:${change.line}: change source '${change.source}' has no meeting in design.md`);
    }

    if (change.source.startsWith("email") && !/^email \d{4}-\d{2}-\d{2} · \S/.test(change.source)) {
      design.warnings.push(`changes.md:${change.line}: write an email source as 'email YYYY-MM-DD · <sender>'; got '${change.source}'`);
    }
  }
}

// Every {fact:key} in a record names a defined fact.
function checkFacts(design) {
  for (const record of design.records) {
    for (const [text, line] of recordTexts(record)) {
      for (const key of all(FACT_REF, text)) {
        if (!design.facts.has(key)) {
          design.errors.push(`${design.where(line)}: '{fact:${key}}' names no fact under '## Facts'`);
        }
      }
    }
  }
}

// A meeting's proposals, each an object (see records.md).
export function proposalsOf(meeting) {
  const out = [];

  for (const item of meeting.items("Proposals")) {
    let value;

    try {
      value = JSON.parse(item);
    } catch {
      continue;
    }

    if (jsonKind(value) === "object") {
      out.push(value);
    }
  }

  return out;
}

// JSON values as the records write them in text: a missing one is empty.
const str = (value) => (value === undefined || value === null ? "" : String(value));

// Whether a JSON value counts as given: not missing, empty, zero or false.
const given = (value) => {
  if (value === undefined || value === null || value === "" || value === 0 || value === false) {
    return false;
  }

  return !["array", "object"].includes(jsonKind(value)) || Object.keys(value).length > 0;
};

// Each proposal names what it changes and how it was settled; the meeting's status and Outcomes agree with them.
function checkProposals(design) {
  const known = design.byId();

  for (const meeting of design.of("meeting")) {
    const found = meeting.field("Proposals");

    if (found === null) {
      continue;
    }

    const where = design.where(found.line);
    const items = proposalsOf(meeting);

    if (items.length !== found.items.length) {
      design.errors.push(`${where}: every proposal is an object with n, kind, proposal, recommend and status`);
    }

    const numbers = items.map((proposal) => JSON.stringify(proposal.n ?? null));

    if (new Set(numbers).size !== numbers.length) {
      design.errors.push(`${where}: proposal numbers repeat; number them 1, 2, 3 …`);
    }

    let pending = 0;
    const outcomes = meeting.items("Outcomes").join(" ");

    for (const proposal of items) {
      const label = `${where} › proposal ${has(proposal, "n") ? str(proposal.n) : "?"}`;

      for (const key of ["n", "kind", "proposal", "recommend", "status"]) {
        if (!given(proposal[key])) {
          design.errors.push(`${label}: no '${key}'`);
        }
      }

      const status = str(proposal.status).toLowerCase();

      if (status && !has(PROPOSAL_STATUS, status)) {
        design.errors.push(`${label}: status '${str(proposal.status)}'; use Proposed, Accepted, Changed, Rejected or Deferred`);
      }

      const recommend = str(proposal.recommend).toLowerCase();

      if (recommend && !has(RECOMMEND, recommend)) {
        design.errors.push(`${label}: recommend '${str(proposal.recommend)}'; use Accept, Accept as leaning, Ask, Defer or Reject, and say why in 'why'`);
      }

      if (given(proposal.recommend) && !given(proposal.why)) {
        design.errors.push(`${label}: give the recommendation's reason in 'why'`);
      }

      for (const target of splitList(str(proposal.target))) {
        if (ID_TOKEN.test(target) && !known.has(target) && !given(proposal.new)) {
          design.errors.push(`${label}: target '${target}' is no record; for a record the proposal would create, set "new": true`);
        }
      }

      for (const [key, limit] of [
        ["proposal", 30],
        ["before", 14],
        ["after", 14]
      ]) {
        const count = words(str(proposal[key])).length;

        if (count > limit) {
          design.warnings.push(`${label}: '${key}' is ${count} words; keep it under ${limit} so it reads at a glance`);
        }
      }

      for (const key of ["proposal", "before", "after"]) {
        const talk = FIELD_TALK.exec(str(proposal[key]));

        if (talk !== null) {
          design.warnings.push(`${label}: '${key}' uses field names ('${talk[0]}'); say it in plain words`);
        }
      }

      if (status === "proposed") {
        pending += 1;
      }

      if (status === "accepted" || status === "changed") {
        const targets = splitList(str(proposal.target));

        if (targets.length > 0 && !targets.some((target) => outcomes.includes(target))) {
          design.errors.push(`${label} is ${str(proposal.status)}, but no Outcome points at ${targets.join(", ")}; apply it and list it in Outcomes`);
        }
      }

      if ((status === "changed" || status === "rejected" || status === "deferred") && !given(proposal.note)) {
        design.warnings.push(`${label} is ${str(proposal.status)}; say what the user decided in 'note'`);
      }
    }

    if (meeting.items("Worth a look").length > 3) {
      design.warnings.push(`${design.where(meeting.line)}: meeting '${meeting.id}' has ${meeting.items("Worth a look").length} 'Worth a look' notes; keep the three that matter most`);
    }

    const status = meeting.get("Status").toLowerCase();

    if (pending && status !== "awaiting review") {
      design.errors.push(`${design.where(meeting.line)}: meeting '${meeting.id}' has ${pending} proposal(s) still to review; its status is Awaiting review until they're all settled`);
    }

    if (!pending && items.length > 0 && status === "awaiting review") {
      design.warnings.push(`${design.where(meeting.line)}: every proposal of '${meeting.id}' is settled; set its status to Summarised`);
    }
  }
}

// Each meeting outcome points at what it changed; the latest meeting's statuses must still hold.
function checkOutcomes(design) {
  const known = design.byId();
  const phases = new Map(design.of("deliverable").map((phase) => [phase.title.toLowerCase(), phase]));
  const meetings = design.of("meeting");
  const latest = meetings.length === 0 ? null : meetings.map((meeting) => meeting.id).reduce((top, id) => (id > top ? id : top));

  for (const meeting of meetings) {
    const found = meeting.field("Outcomes");

    if (found === null && meeting.get("Status").toLowerCase() === "awaiting review") {
      continue;
    }

    if (found === null) {
      design.warnings.push(`${design.where(meeting.line)}: meeting '${meeting.id}' has no 'Outcomes'; list each thing it settled and the record it changed`);
      continue;
    }

    for (const item of found.items) {
      const match = OUTCOME.exec(item);

      if (match === null || !OUTCOME_KINDS.has(match.groups.kind.trim().toLowerCase())) {
        design.errors.push(
          `${design.where(found.line)}: outcome '${item.slice(0, 60)}'; write '<Kind> · <what> → <IDs, fact:key or deliverable title>' with Kind one of ${[...OUTCOME_KINDS].sort().join(", ")}`
        );
        continue;
      }

      const kind = match.groups.kind.trim().toLowerCase();

      const targets = match.groups.to
        .split(/,\s*/)
        .map((target) => target.trim())
        .filter((target) => target !== "");

      const resolved = [];

      for (const target of targets) {
        if (known.has(target)) {
          resolved.push(known.get(target));
        } else if (target.startsWith("fact:") && design.facts.has(target.slice(5))) {
          resolved.push(null);
        } else if (phases.has(target.toLowerCase())) {
          resolved.push(phases.get(target.toLowerCase()));
        } else {
          design.errors.push(`${design.where(found.line)}: outcome '${item.slice(0, 60)}' points at '${target}', which is no record ID, fact:key or deliverable title`);
        }
      }

      if (meeting.id !== latest) {
        continue;
      }

      for (const r of resolved) {
        if (r === null) {
          continue;
        }

        if ((kind === "decided" || kind === "leaning" || kind === "later") && r.kind === "decision") {
          const status = r.get("Status") ? first(r.get("Status")).toLowerCase() : "";

          if (status !== kind) {
            design.errors.push(`${design.where(found.line)}: the latest meeting records '${kind}' for ${r.id}, but ${r.id}'s status is '${r.get("Status")}'`);
          }
        }

        if (kind === "answer" && r.kind === "question" && !r.get("Answer")) {
          design.errors.push(`${design.where(found.line)}: the latest meeting answered ${r.id}, but ${r.id} has no 'Answer'`);
        }

        if (kind === "so far" && r.kind === "question" && (!r.get("So far") || r.get("Answer"))) {
          design.errors.push(`${design.where(found.line)}: the latest meeting partly answered ${r.id}; give it 'So far' and no 'Answer'`);
        }
      }
    }
  }
}

// Put each fact's value where a page, component or record writes {fact:key}.
export function fillFacts(text, design) {
  const missing = [];

  const filled = text.replace(FACT_REF, (whole, key) => {
    if (!design.facts.has(key)) {
      missing.push(key);

      return whole;
    }

    return design.facts.get(key)[0];
  });

  return { text: filled, missing };
}

// '$36' -> [36, 36]; '$3 → $39' -> [3, 39], for a cost that grows; anything else is unknown.
function parseMoney(text) {
  const match = MONEY.exec(text.trim());

  if (match === null) {
    return null;
  }

  const low = Number.parseFloat(match[1].replaceAll(",", ""));

  return [low, match[2] === undefined ? low : Number.parseFloat(match[2].replaceAll(",", ""))];
}

// A cost's monthly figure under '', or one per option ('A $0 · B $36') when it varies with a decision.
function costAmounts(record) {
  const monthly = record.get("Monthly");

  if (!record.get("Varies with")) {
    return { "": parseMoney(monthly) };
  }

  const amounts = {};

  for (const part of monthly.split("·")) {
    const [letter, , amount] = partition(part.trim(), " ");

    amounts[letter] = parseMoney(amount);
  }

  return amounts;
}

function checkCost(record, design) {
  const where = design.where(record.line);
  const monthly = record.get("Monthly");
  const varies = record.get("Varies with");

  if (!varies) {
    if (parseMoney(monthly) === null && !new RegExp(MENTION.source, "u").test(monthly) && !monthly.toLowerCase().includes("per use")) {
      design.errors.push(`${where}: cost '${record.title}': write Monthly as '$36', '$3 → $39' for one that grows, or 'unknown (Q8)'`);
    }

    return;
  }

  const decision = design.byId().get(varies);

  if (decision === undefined || decision.kind !== "decision") {
    design.errors.push(`${where}: cost '${record.title}' varies with '${varies}', which isn't a decision`);

    return;
  }

  const amounts = costAmounts(record);
  const letters = decision.options.filter((option) => optionState(option) !== "set aside").map((option) => option.id);

  if (JSON.stringify(Object.keys(amounts).sort()) !== JSON.stringify([...letters].sort())) {
    design.errors.push(`${where}: cost '${record.title}' varies with ${varies}; give Monthly for each of its options as '${letters.map((letter) => `${letter} $0`).join(" · ")}'`);
  }
}

// The option's status without its date: 'set aside Sep 22' -> 'set aside'.
export function optionState(option) {
  const status = option.get("Status").toLowerCase();

  return Object.keys(OPTION_STATUS).find((state) => status.startsWith(state)) ?? status;
}

// A field's published value: its list, or its text.
const published = (field) => (field.items.length > 0 ? field.items : field.value);

function publicFields(record) {
  const fields = {};

  for (const [name, field] of record.fields) {
    if (name.toLowerCase() !== PRIVATE) {
      fields[name] = published(field);
    }
  }

  return fields;
}

// The records as data for components and bindings: fields, plus the state each is in. Only E, Q, D, R and P records,
// and never the private Recorded from field or notes, since the model is published inside the built doc.
export function designModel(design) {
  const records = {};

  for (const r of design.records) {
    if (!ID_TOKEN.test(r.id)) {
      continue;
    }

    const entry = { kind: r.kind, title: r.title, fields: publicFields(r), options: [], leaning: null, chosen: null, answer: "" };

    if (r.kind === "decision") {
      const status = words(r.get("Status") || "Open");

      entry.state = DECISION_STATE[status[0].toLowerCase()] ?? "open";
      entry.states = ["open", "leaning", "later", "decided"];
      entry.options = r.options.map((o) => ({ id: o.id, title: o.title, status: optionState(o), statusText: o.get("Status"), fields: publicFields(o) }));
      entry.follows = splitList(r.get("Follows"));

      const leaning = entry.options.filter((o) => o.status === "current leaning").map((o) => o.id);

      entry.leaning = status.length > 1 && status[0].toLowerCase() === "leaning" ? status[1] : (leaning[0] ?? null);
      entry.chosen = entry.options.find((o) => o.status === "chosen")?.id ?? null;

      const option = recommendedOption(r);

      entry.recommended = option !== null && UNSETTLED.includes(entry.state) ? option.id : null;
      entry.recommendedBy = entry.recommended ? (recommendation(r)?.get("model") ?? "") : "";
      entry.answer = ANSWER_LABELS.map((label) => r.get(label)).find((value) => value) ?? "";
    } else if (r.kind === "question") {
      const state = questionState(r);

      entry.state = state === "answered" ? "answered" : state === "deferred" ? "deferred" : "open";
      entry.states = ["open", "deferred", "answered"];
      entry.answer = r.get("Answer") || r.get("So far");
    } else if (r.kind === "requirement") {
      // The state bindings follow is how the design covers it: yes, partly or no, as it always was.
      const views = requirementViews(r);
      const covered = views.design;

      entry.state = covered ? DESIGN[covered[0]] : "unknown";
      entry.states = [...VERDICT, "unknown"];
      entry.answer = covered ? covered[1] : "";
      entry.today = views.today ? views.today[0] : null;
      entry.still = views.still ? views.still[0] : null;
    } else if (r.kind === "deliverable") {
      const status = (r.get("Status") || "Planned").toLowerCase();
      const jira = new Map(design.of("jira").map((item) => [item.id, item]));

      entry.state = { "in progress": "progress", done: "done", proposed: "proposed" }[status] ?? "planned";
      entry.states = ["proposed", "planned", "progress", "done"];
      entry.follows = splitList(r.get("Follows"));
      entry.group = r.get("Group");
      entry.serves = splitList(r.get("Serves"));
      entry.jira = deliverableJira(r).map((url) => {
        const item = jira.get(jiraKey(url));

        return { key: jiraKey(url), url, state: item ? jiraCategory(item) : null, type: item ? item.get("Type").toLowerCase() : "" };
      });
    } else {
      entry.state = "found";
      entry.states = ["found"];
    }

    records[r.id] = entry;
  }

  const costs = design.of("cost").map((r) => ({
    title: r.title,
    page: r.get("Page"),
    drives: r.get("Drives"),
    monthly: r.get("Monthly"),
    amounts: costAmounts(r),
    varies: r.get("Varies with"),
    affected: splitList(r.get("Affected by")),
    evidence: splitList(r.get("Evidence")),
    category: r.get("Category"),
    when: r.get("Applies when")
  }));

  const basis = {};

  for (const [key, value] of design.costBasis) {
    basis[key] = value.value;
  }

  const flows = design.of("flow").map((r) => ({ id: r.id, title: r.title, fields: publicFields(r) }));

  for (const r of design.of("decision")) {
    records[r.id].shapes = settlesLine(r, design);
  }

  for (const entry of Object.values(records)) {
    entry.unblocks = Object.entries(records)
      .filter(([, other]) => entry !== other && (other.follows ?? []).some((follows) => records[follows] === entry))
      .map(([id]) => id)
      .sort(byNumber);
  }

  const prose = {};

  for (const [name, lines] of design.prose) {
    prose[name] = lines.join("\n").trim();
  }

  const groups = unique(design.of("deliverable").map((d) => d.get("Group")).filter((group) => group));

  return { title: design.title, records, costs, costBasis: basis, flows, prose, groups };
}

// How prose names a record: its Rail or Short, lower-cased to sit mid-sentence, else its title.
function named(record) {
  const name = record.get("Rail") || record.get("Short");

  if (name) {
    return /^[A-Z]{2,}/.test(name) ? name : name.slice(0, 1).toLowerCase() + name.slice(1);
  }

  return `“${record.title}”`;
}

// The line under a decision's question: "Needs where the workers run (D1) first." while it's put off until a decision
// it follows is settled, else its Shapes. The name leads, so the line reads without knowing what D1 is.
function settlesLine(record, design) {
  const known = design.byId();
  const later = (record.get("Status") || "").toLowerCase().startsWith("later");
  const pending = splitList(record.get("Follows")).filter((d) => known.has(d) && UNSETTLED.includes(first(known.get(d).get("Status") || "Open").toLowerCase()));

  if (later && pending.length > 0) {
    return `Needs ${pending.map((d) => `${named(known.get(d))} (${d})`).join(" and ")} first.`;
  }

  return record.get("Shapes");
}

function isAnswered(question) {
  return Boolean(question.get("Answered by")) || question.get("Status").toLowerCase() === "answered";
}

// Put off on someone's word: it still bears on what it blocks, but nothing waits on it now.
function isDeferred(question) {
  return Boolean(question.get("Deferred")) && !isAnswered(question);
}

function questionState(question) {
  if (isAnswered(question)) {
    return "answered";
  }

  if (isDeferred(question)) {
    return "deferred";
  }

  return question.get("So far") ? "partly" : "open";
}

const QUESTION_PILL = { answered: ["Answered", ""], deferred: ["Deferred", "outline"], partly: ["Partly answered", "leaning"], open: ["Open", "open"] };

// Who to ask, only when someone named them. An older design's 'Who' still shows, without its kind, except the reader
// themselves ('(me)'), which means nothing to anyone else reading the doc.
function askName(question) {
  if (question.get("Ask")) {
    return question.get("Ask");
  }

  const match = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(question.get("Who"));

  if (match !== null) {
    return match[2].trim().toLowerCase() === "me" ? "" : match[1].trim();
  }

  return question.get("Who").trim().toLowerCase() === "me" ? "" : question.get("Who").trim();
}

// How the answer can be got, as a key of ANSWER_FROM (or the word as written when it isn't one), and where to look.
function answerFrom(question) {
  const [kind, , where] = partition(question.get("Answer from"), "·");

  return [kind.trim().toLowerCase(), where.trim()];
}

// The goals, one per bullet of the Goals prose, numbered from 1 in the order written.
function goalLines(design) {
  return (design.prose.get("goals") ?? []).filter((line) => line.trim().startsWith("- ")).map((line) => line.trim().slice(2).trim());
}

// A Jira item's key from its URL ('…/browse/OBS-220'), or the URL itself when it has none.
function jiraKey(url) {
  return JIRA_KEY.exec(url)?.[1] ?? url.trim();
}

// Where a Jira item stands as Jira's three categories: todo, progress or done.
function jiraCategory(item) {
  const category = item.get("Category").toLowerCase();

  if (category) {
    return category.includes("done") ? "done" : category.includes("do") ? "todo" : "progress";
  }

  const status = item.get("Status");

  return JIRA_DONE.test(status) ? "done" : JIRA_TODO.test(status) ? "todo" : "progress";
}

// What a link points at, from its URL, as Cairn's pointer types name them.
function linkKind(url) {
  let path = "";
  let host = "";

  try {
    const parsed = new URL(url);

    path = parsed.pathname;
    host = parsed.host.toLowerCase();
  } catch {
    path = url;
  }

  if (/\/(pull|pulls|merge_requests|pull-requests)\/\d+/.test(path)) {
    return "pull_request";
  }

  if (JIRA_KEY.test(url)) {
    return "jira_issue";
  }

  if ((host.endsWith("atlassian.net") && path.startsWith("/wiki/")) || /\/(confluence|display)\//.test(path)) {
    return "confluence_page";
  }

  return "url";
}

function deliverableJira(record) {
  const items = record.items("Jira");

  return items.length > 0 ? items : splitList(record.get("Jira"));
}

// A deliverable says what it delivers and how everyone knows it's done, what must come first, and which goals and Jira
// items it ties to. It never names an effort: the doc is published, and efforts are local to whoever keeps them.
function checkDeliverable(record, design) {
  const where = design.where(record.line);
  const status = record.get("Status");

  if (status && !has(DELIVERABLE_STATUS, status.toLowerCase())) {
    design.errors.push(`${where}: deliverable '${record.id}' status '${status}'; use Proposed, Planned, In progress or Done`);
  }

  const known = new Set(design.of("deliverable").map((d) => d.id));

  for (const follows of splitList(record.get("Follows"))) {
    if (follows === record.id || !known.has(follows)) {
      design.errors.push(`${where}: '${record.id}' follows '${follows}', which isn't another deliverable`);
    }
  }

  const goals = goalLines(design).length;

  for (const serves of splitList(record.get("Serves"))) {
    if (!/^\d+$/.test(serves) || Number(serves) < 1 || Number(serves) > goals) {
      design.warnings.push(`${where}: '${record.id}' serves goal '${serves}'; name goals by their number in the Goals list (1 to ${goals})`);
    }
  }

  for (const url of deliverableJira(record)) {
    if (!url.startsWith("http")) {
      design.warnings.push(`${where}: '${record.id}' Jira '${url}'; give the item's URL, so the doc can link to it`);
    }
  }

  if (record.field("Effort")) {
    design.warnings.push(
      `${design.where(record.field("Effort").line)}: '${record.id}' names an effort; a published doc names no effort. Record in the effort which deliverables it works on, and drop it here`
    );
  }
}

// Deliverables follow one another without going round in a circle.
function checkPlanOrder(design) {
  const follows = new Map(design.of("deliverable").map((d) => [d.id, splitList(d.get("Follows"))]));
  const state = new Map();

  const visit = (ident, trail) => {
    if (state.get(ident) === 2) {
      return;
    }

    if (state.get(ident) === 1) {
      const loop = [...trail.slice(trail.indexOf(ident)), ident];

      design.errors.push(`the plan goes round in a circle: ${loop.join(" → ")}`);

      return;
    }

    state.set(ident, 1);

    for (const parent of follows.get(ident) ?? []) {
      if (follows.has(parent)) {
        visit(parent, [...trail, ident]);
      }
    }

    state.set(ident, 2);
  };

  for (const ident of follows.keys()) {
    visit(ident, []);
  }
}

function checkLink(record, design) {
  const where = design.where(record.line);
  const url = record.get("URL");

  if (url && !url.startsWith("http")) {
    design.errors.push(`${where}: link '${record.title}' URL '${url}'; give the full address`);
  }

  const role = record.get("Role");

  if (role && !has(LINK_ROLES, role.toLowerCase())) {
    design.warnings.push(`${where}: link '${record.title}' role '${role}'; use Published or Referenced`);
  }

  if (!record.get("Why")) {
    design.warnings.push(`${where}: link '${record.title}' doesn't say why it's here; add 'Why', one sentence`);
  }
}

function checkJira(record, design) {
  const where = design.where(record.line);
  const keys = new Set(design.of("jira").map((item) => item.id));

  if (record.get("URL") && jiraKey(record.get("URL")) !== record.id) {
    design.warnings.push(`${where}: Jira item '${record.id}' has the URL of '${jiraKey(record.get("URL"))}'`);
  }

  const parent = record.get("Parent");

  if (parent && !keys.has(parent)) {
    design.warnings.push(`${where}: Jira item '${record.id}' has parent '${parent}', which isn't in the design's Jira items`);
  }

  if (!record.get("Read")) {
    design.warnings.push(`${where}: Jira item '${record.id}' doesn't say when it was read from Jira; add 'Read: YYYY-MM-DD HH:MM'`);
  }
}

// A question says what it holds up and, when it matters, when its answer is needed; what to ask next isn't recorded.
function checkQuestion(record, design) {
  const where = design.where(record.line);

  if (!isAnswered(record) && !isDeferred(record) && record.field("Explanation") === null) {
    design.warnings.push(`${where}: open question '${record.id}' has no 'Explanation': ${EXPLANATION_HINT}`);
  }

  if (!record.get("Blocks")) {
    design.warnings.push(`${where}: question '${record.id}' blocks nothing; a question that holds up no decision, requirement or flow belongs in the effort's open questions`);
  }

  const needed = record.field("Needed by");
  const planned = new Set([...design.of("deliverable").map((p) => p.title.toLowerCase()), ...design.of("deliverable").map((p) => p.id.toLowerCase())]);

  if (needed && !has(NEEDED_BY, needed.value.toLowerCase()) && !planned.has(needed.value.toLowerCase())) {
    design.warnings.push(
      `${design.where(needed.line)}: question '${record.id}' is needed by '${needed.value}'; use Choosing the design, Before building, Later phase, or a deliverable (P3, or its title)`
    );
  }

  const source = record.field("Answer from");

  if (source) {
    const [kind, whereToLook] = answerFrom(record);

    if (!has(ANSWER_FROM, kind)) {
      design.warnings.push(`${design.where(source.line)}: question '${record.id}' is answered from '${source.value}'; use Research · where to look, Person, or Approval`);
    } else if (kind === "research" && !whereToLook) {
      design.warnings.push(`${design.where(source.line)}: question '${record.id}' is answered from research but doesn't say where to look: 'Research · Datadog OPW docs'`);
    }
  } else if (!isAnswered(record) && !isDeferred(record)) {
    design.warnings.push(
      `${where}: open question '${record.id}' has no 'Answer from': Research · where to look, when an agent could find the answer; Person, when someone has to tell us; Approval, when someone has to sign it off`
    );
  }

  const reopen = record.field("Could reopen");

  if (reopen && !record.get("Deferred")) {
    design.warnings.push(`${design.where(reopen.line)}: question '${record.id}' has 'Could reopen' but isn't deferred; it's for what a deferred question could still change`);
  }

  const deferred = record.field("Deferred");

  if (deferred && !deferred.value) {
    design.errors.push(`${design.where(deferred.line)}: question '${record.id}' is deferred with no reason; say why it can wait`);
  }

  const status = record.field("Status");

  if (status && status.value.toLowerCase() !== "answered") {
    design.warnings.push(
      `${design.where(status.line)}: question '${record.id}' has 'Status: ${status.value}'; the doc records whether it's answered, partly answered ('So far') or deferred ('Deferred'), and when its answer is needed ('Needed by')`
    );
  }

  for (const key of ["Latest", "Page"]) {
    const found = record.field(key);

    if (found) {
      const reason = key === "Latest" ? "record a partial answer in 'So far'" : "a question lives on the page of what it blocks";

      design.warnings.push(`${design.where(found.line)}: question '${record.id}' has '${key}'; ${reason}`);
    }
  }

  if (isAnswered(record) && !record.get("Answer")) {
    design.warnings.push(`${where}: question '${record.id}' is answered but has no 'Answer': the answer in a few words`);
  }

  if (record.get("Answer") && !record.get("Answered by")) {
    design.warnings.push(`${where}: question '${record.id}' has an 'Answer' but no 'Answered by': the evidence it became`);
  }
}

// A decision's 'Waiting on' and its questions' 'Blocks' tell the same story.
function checkWaiting(design) {
  const known = design.byId();

  for (const decision of design.of("decision")) {
    const state = first(decision.get("Status") || "Open").toLowerCase();
    const waiting = decision.field("Waiting on");

    if (!UNSETTLED.includes(state)) {
      for (const question of design.of("question")) {
        if (splitList(question.get("Blocks")).includes(decision.id) && !isAnswered(question) && !isDeferred(question)) {
          design.warnings.push(
            `${design.where(question.line)}: ${question.id} blocks ${decision.id}, which is settled: take ${decision.id} off its 'Blocks', ` +
              `or reopen ${decision.id} if the answer could still change it`
          );
        }
      }

      continue;
    }

    if (waiting === null) {
      continue;
    }

    const listed = new Set(splitList(waiting.value));

    for (const ident of listed) {
      const question = known.get(ident);

      if (question && question.kind === "question" && isDeferred(question)) {
        design.warnings.push(`${design.where(waiting.line)}: ${decision.id} is waiting on ${ident}, which is deferred; take it off 'Waiting on'`);
      } else if (question && question.kind === "question" && !isAnswered(question) && !splitList(question.get("Blocks")).includes(decision.id)) {
        design.warnings.push(`${design.where(waiting.line)}: ${decision.id} is waiting on ${ident}, but ${ident}'s 'Blocks' doesn't list ${decision.id}`);
      }
    }

    for (const question of design.of("question")) {
      if (splitList(question.get("Blocks")).includes(decision.id) && !isAnswered(question) && !isDeferred(question) && !listed.has(question.id)) {
        design.warnings.push(`${design.where(waiting.line)}: ${question.id} blocks ${decision.id}, but ${decision.id}'s 'Waiting on' doesn't list it`);
      }
    }
  }
}

// A settled decision says why; its options say which won and why the others didn't.
function checkDecision(record, design) {
  const status = record.get("Status") || "Open";
  const state = first(status).toLowerCase();
  const where = design.where(record.line);
  const known = design.byId();

  if (UNSETTLED.includes(state) && !record.get("Explanation")) {
    design.warnings.push(`${where}: decision '${record.id}' is ${status} but has no 'Explanation': ${EXPLANATION_HINT}`);
  }

  if ((state === "decided" || state === "leaning") && !record.get("Why")) {
    design.errors.push(`${where}: decision '${record.id}' is ${status} but has no 'Why': one sentence on what tipped it, citing the evidence`);
  }

  const decidedIn = record.field("Decided in");

  if (decidedIn && state !== "decided") {
    design.warnings.push(`${design.where(decidedIn.line)}: '${record.id}' has 'Decided in' but is ${status}`);
  }

  if (state === "given" && !record.get("Source")) {
    design.errors.push(`${where}: decision '${record.id}' is Given but has no 'Source': who or what set it`);
  }

  const settles = record.field("Shapes");

  if (settles && /^(needs|after|waits? (on|for)|blocked by)\b.*\bD\d+/i.test(settles.value)) {
    design.warnings.push(
      `${design.where(settles.line)}: '${record.id}' Shapes says what it waits on; put that in Follows (the build writes "Needs where the workers run (D1) first." for a Later decision) and say what it settles here`
    );
  }

  const why = record.field("Why");

  if (why && why.value.length > WHY_LIMIT) {
    design.warnings.push(`${design.where(why.line)}: '${record.id}' Why runs ${why.value.length} characters; keep it to a sentence and move the rest to 'Reasoning'`);
  }

  const also = record.field("Also considered");

  for (const item of also ? also.items : []) {
    if (!item.includes(": ")) {
      design.errors.push(`${design.where(also.line)}: write each 'Also considered' item as 'Name: why not'; got '${item}'`);
    }
  }

  for (const option of record.options) {
    const optionStatus = option.get("Status");
    const kind = optionState(option);

    if (optionStatus && !has(OPTION_STATUS, kind)) {
      design.warnings.push(
        `${design.where(option.line)}: option status '${optionStatus}'; use Current leaning, Chosen, Not chosen <date>, Set aside <date>, Found in research or Not designed yet`
      );
    }

    if ((kind === "not chosen" || kind === "set aside") && !option.get("Why not")) {
      design.warnings.push(`${design.where(option.line)}: ${record.id} option ${option.id} is ${optionStatus} with no 'Why not'`);
    }

    if (kind === "chosen" && state !== "decided") {
      design.warnings.push(`${design.where(option.line)}: ${record.id} option ${option.id} is Chosen, but the decision is ${status}`);
    }

    for (const [name, value] of option.fields) {
      if (name.toLowerCase().startsWith("meets ")) {
        const target = name.slice(6).trim();

        if (!known.has(target) || known.get(target).kind !== "requirement") {
          design.errors.push(`${design.where(value.line)}: '${name}' names '${target}', which isn't a requirement`);
        }

        if (parseMet(value.value) === null) {
          design.errors.push(`${design.where(value.line)}: write '${name}' as 'Yes|Partly|No · how [E1, D2]'`);
        }
      }
    }
  }

  for (const follows of splitList(record.get("Follows"))) {
    if (!known.has(follows) || known.get(follows).kind !== "decision") {
      design.errors.push(`${where}: '${record.id}' follows '${follows}', which isn't a decision`);
    }
  }

  if (record.options.length > 0 && state === "decided") {
    const chosen = record.options.filter((o) => optionState(o) === "chosen").map((o) => o.id);
    const unsettled = record.options.filter((o) => !["chosen", "not chosen", "set aside"].includes(optionState(o))).map((o) => o.id);

    if (chosen.length !== 1 || unsettled.length > 0) {
      design.warnings.push(
        `${where}: '${record.id}' is Decided; mark the option that won 'Chosen' and each other one 'Not chosen <date>' or 'Set aside <date>'` +
          (unsettled.length > 0 ? ` (still unmarked: ${unsettled.join(", ")})` : "")
      );
    }
  }

  if (record.options.length > 0 && state === "leaning") {
    const name = status.includes(" ") ? status.slice(status.search(/\s/)).trim() : "";
    const ids = new Set(record.options.map((o) => o.id));

    if (name && !ids.has(name)) {
      design.warnings.push(`${where}: '${record.id}' is leaning '${name}', which isn't one of its options (${[...ids].sort().join(", ")})`);
    } else if (name && optionState(record.options.find((o) => o.id === name)) !== "current leaning") {
      design.warnings.push(`${where}: '${record.id}' is leaning ${name}; mark option ${name} 'Current leaning'`);
    }
  }
}

// A record's AI recommendation: what it recommends, under "value", and each of its parts by lowercase name.
function recommendation(record) {
  const found = record.field("Recommendation");

  if (found === null) {
    return null;
  }

  const parts = new Map([["value", found.value.trim()]]);

  for (const item of found.items) {
    const [key, , text] = partition(item, ":");

    parts.set(key.trim().toLowerCase(), text.trim());
  }

  return parts;
}

// The option a decision's recommendation names, when it names one of its options.
function recommendedOption(record) {
  const rec = recommendation(record);

  return record.options.find((o) => rec !== null && o.id === rec.get("value")) ?? null;
}

// A recommendation names what it recommends and why, what would change it, how sure it is, the model that made it,
// when, and the newest evidence it saw. Evidence the record has come to rest on since then makes it out of date.
function checkRecommendation(record, design) {
  const rec = recommendation(record);

  if (rec === null) {
    return;
  }

  const found = record.field("Recommendation");
  const where = design.where(found.line);
  const part = (key) => rec.get(key) ?? "";

  if (!rec.get("value")) {
    design.errors.push(`${where}: '${record.id}' Recommendation says nothing; its value is the option's ID, or the answer in a few words`);
  }

  const unknown = [...rec.keys()].filter((key) => key !== "value" && !RECOMMEND_PARTS.includes(key));

  if (unknown.length > 0) {
    design.warnings.push(`${where}: '${record.id}' Recommendation has '${unknown[0]}'; its parts are Because, Would change if, Confidence, Model, Made and Seen`);
  }

  const missing = RECOMMEND_PARTS.flatMap((key) => (part(key) ? [] : [capitalize(key)]));

  if (missing.length > 0) {
    design.warnings.push(`${where}: '${record.id}' Recommendation has no ${missing.join(", ")}`);
  }

  const model = part("model");

  if (model.length > MODEL_LIMIT || /[()]|\bon\b|\bvia\b|\//.test(model)) {
    design.warnings.push(
      `${where}: '${record.id}' Recommendation model '${model}'; give the model's short name, as people say it (Opus 5.5, Sonnet, GPT Sol 6.1), without provider, platform or model ID`
    );
  }

  if (part("confidence") && !CONFIDENCE.includes(part("confidence").toLowerCase())) {
    design.warnings.push(`${where}: '${record.id}' Recommendation confidence '${part("confidence")}'; use High, Medium or Low`);
  }

  if (part("made") && !/^\d{4}-\d{2}-\d{2}$/.test(part("made"))) {
    design.warnings.push(`${where}: '${record.id}' Recommendation made '${part("made")}'; write the date as YYYY-MM-DD`);
  }

  if (record.options.length > 0 && rec.get("value")) {
    const option = recommendedOption(record);

    if (option === null) {
      design.warnings.push(
        `${where}: '${record.id}' recommends '${rec.get("value")}', which isn't one of its options (${record.options.map((o) => o.id).join(", ")}); name the option by its ID`
      );
    } else if (["set aside", "not chosen"].includes(optionState(option))) {
      design.warnings.push(`${where}: '${record.id}' recommends option ${option.id}, which is ${option.get("Status")}`);
    }
  }

  const seen = /^E(\d+)$/.exec(part("seen"));

  if (part("seen") && seen === null) {
    design.warnings.push(`${where}: '${record.id}' Recommendation seen '${part("seen")}'; name the newest evidence it was made from (E9)`);
  }

  if (seen === null) {
    return;
  }

  // What the record rests on now: its own text and options, and what the questions it waits on have found.
  const known = design.byId();
  const related = [record, ...splitList(record.get("Waiting on")).filter((id) => known.has(id)).map((id) => known.get(id))];
  const texts = related.flatMap((r) => recordTexts(r).filter(([text]) => !(r === record && found.items.includes(text))).map(([text]) => text));
  const newer = unique(texts.flatMap((text) => all(MENTION, text)).filter((id) => id.startsWith("E") && Number(id.slice(1)) > Number(seen[1]))).sort(byNumber);

  if (newer.length > 0) {
    design.warnings.push(`${where}: '${record.id}' rests on ${newer.join(", ")}, which came after its recommendation (made from evidence through ${part("seen")}); refresh it`);
  }
}

// Every public text in a record, with its line, for mention checks. Recorded from is private.
function recordTexts(record) {
  const texts = [[record.title, record.line]];

  for (const [name, value] of record.fields) {
    if (name.toLowerCase() === PRIVATE) {
      continue;
    }

    texts.push([value.value, value.line]);

    for (const item of value.items) {
      texts.push([item, value.line]);
    }
  }

  for (const option of record.options) {
    texts.push(...recordTexts(option));
  }

  return texts;
}

// The IDs a field cites: 'E1, E2', or list items that each start with one ('E1: what it shows').
function citedIds(record, key) {
  const found = record.field(key);

  if (found === null) {
    return [];
  }

  if (found.items.length > 0) {
    return found.items.map((item) => /^([EQDR]\d+)\b/.exec(item)?.[1]).filter((id) => id !== undefined);
  }

  return splitList(found.value);
}

export function splitList(text) {
  return text
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");
}

// 'Partly covers · words [E1, D2]' -> ['partly covers', 'words', ['E1', 'D2']]; the words and the IDs are optional.
function parseVerdict(text, verdicts) {
  const match = /^(.+?)\s*(?:·\s*(.*?))?\s*(?:\[([^\]]*)\])?$/.exec(text.trim());

  if (match === null || !has(verdicts, match[1].trim().toLowerCase())) {
    return null;
  }

  return [match[1].trim().toLowerCase(), (match[2] ?? "").trim(), splitList(match[3] ?? "")];
}

// How a requirement measures up on a page: today (the same everywhere), the design's cover and what's still to show,
// each the page's own when it has one. An older 'Met' stands in for the design's cover.
function requirementViews(record, page = null) {
  const pick = (key) => (page ? record.field(`${key} on ${page}`) : null) ?? record.field(key);
  const design = pick("Design");
  let parsedDesign = design ? parseVerdict(design.value, DESIGN) : null;

  if (design === null) {
    const met = pick("Met");
    const legacy = met ? parseMet(met.value) : null;

    parsedDesign = legacy ? [LEGACY_MET[legacy[0].toLowerCase()], legacy[1], legacy[2]] : null;
  }

  const today = record.field("Today");
  const still = pick("Still to show");

  return {
    today: today ? parseVerdict(today.value, TODAY) : null,
    design: parsedDesign,
    still: still ? parseVerdict(still.value, STILL) : null
  };
}

// Today, Design and Still to show each hold a verdict from their own set; the older Met stays readable.
function checkRequirement(record, design) {
  const forms = {
    today: [TODAY, "Meets|Doesn't meet|Unknown|Nothing today · what the system does now [E1]"],
    design: [DESIGN, "Covers|Partly covers|Not covered · how the design meets it [E1, D2]"],
    "still to show": [STILL, "Demonstrated|Intended|Unconfirmed|Nothing left · what shows it holds [E1]"]
  };

  for (const [name, value] of record.fields) {
    const lower = name.toLowerCase();
    const base = lower.replace(/ on .+$/, "");

    if (base === "today" && lower !== "today") {
      design.errors.push(`${design.where(value.line)}: '${name}': Today describes the system as it is, for the whole requirement; it has no per-page form`);
    } else if (has(forms, base) && value.value && parseVerdict(value.value, forms[base][0]) === null) {
      design.errors.push(`${design.where(value.line)}: write '${name}' as '${forms[base][1]}'`);
    } else if (base === "met" && value.value && parseMet(value.value) === null) {
      design.errors.push(`${design.where(value.line)}: write '${name}' as 'Yes|Partly|No · how [E1, D2]', or split it into Today, Design and Still to show`);
    }

    if ((base === "design" || base === "met") && NOT_BUILT.test(value.value)) {
      design.warnings.push(
        `${design.where(value.line)}: '${record.id}' ${name} says it isn't built; say how the design meets it, and put what remains to be shown in 'Still to show'`
      );
    }

    if (base === "still to show") {
      const parsed = parseVerdict(value.value, STILL);

      if (parsed && parsed[0] === "demonstrated" && ![...parsed[2], ...all(MENTION, parsed[1])].some((id) => id.startsWith("E"))) {
        design.warnings.push(`${design.where(value.line)}: '${record.id}' is Demonstrated without the evidence that shows it; cite it [E1], or call it Intended`);
      }
    }
  }

  if (record.field("Met") && record.field("Design")) {
    design.warnings.push(`${design.where(record.field("Met").line)}: '${record.id}' has both Met and Design; Design replaces Met, so drop Met`);
  }
}

// An Explanation as labelled parts: a plain one is a single part with no label; a list names each part.
function explanationParts(record, design = null) {
  const found = record.field("Explanation");

  if (found === null) {
    return [];
  }

  if (found.items.length === 0) {
    return found.value ? [["", found.value]] : [];
  }

  const parts = [];

  for (const item of found.items) {
    const [key, , text] = partition(item, ":");
    const label = EXPLAIN_PARTS.find(([prefix]) => key.trim().toLowerCase().startsWith(prefix))?.[1];

    if (label === undefined || !text.trim()) {
      design?.errors.push(
        `${design.where(found.line)}: '${record.id}' Explanation item '${item.slice(0, 40)}'; write each part as 'Means here: …', 'Matters because: …', 'Answer changes: …' or 'Settled by: …'`
      );
      continue;
    }

    parts.push([label, text.trim()]);
  }

  const order = EXPLAIN_PARTS.map(([, label]) => label);

  return parts.sort((left, right) => order.indexOf(left[0]) - order.indexOf(right[0]));
}

function parseMet(text) {
  const match = /^(Yes|Partly|No)\s*·\s*(.*?)\s*(?:\[([^\]]*)\])?$/i.exec(text);

  if (match === null) {
    return null;
  }

  return [capitalize(match[1]), match[2], splitList(match[3] ?? "")];
}


// Rendering

export class Renderer {
  constructor(design, pages, anchors) {
    this.design = design;
    this.pages = pages;
    this.anchors = anchors;
    this.known = design.byId();
    // The page that defines every record: the overview, or the first page when a doc has none.
    this.home = has(pages, "overview") ? "overview" : (Object.keys(pages)[0] ?? "overview");
    this.opts = {};
    // The records whose modal detail is already written, so a record shown in two tables gets one.
    this.written = new Set();
  }

  inline(text) {
    const kept = [];

    const keep = (html) => {
      kept.push(html);

      return `\x00${kept.length - 1}\x00`;
    };

    // Code spans first, so an ID or a tag-like <slug> inside one stays text; render.mjs does the same.
    let out = text.replace(/`([^`]+)`/g, (_whole, code) => keep(`<code>${esc(code)}</code>`));

    out = esc(out.replace(LINK, (_whole, label, href) => keep(`<a href="${esc(href)}">${esc(label)}</a>`)));
    out = out.replace(MENTION, (_whole, id) => (this.known.has(id) ? `<a class="mention" href="#${id}">${id}</a>` : id));
    out = out.replace(ESCAPED, (_whole, id) => id);

    while (/\x00\d+\x00/.test(out)) {
      out = out.replace(/\x00(\d+)\x00/g, (_whole, index) => kept[Number(index)]);
    }

    return out;
  }

  ref(ident) {
    return `<a class="ref ref-${ident[0].toLowerCase()}" href="#${ident}">${ident}</a>`;
  }

  marks(idents, detail = "") {
    if (idents.length === 0) {
      return "";
    }

    const attrs = detail ? ` data-ref-detail="${esc(detail)}" data-ref-value="${esc(idents.join(", "))}"` : "";

    return `<div class="marks"${attrs}>${idents.map((ident) => this.ref(ident)).join("")}</div>`;
  }

  marksOrText(text) {
    const tokens = splitList(text);

    if (tokens.length > 0 && tokens.every((token) => ID_TOKEN.test(token))) {
      return `<td>${this.marks(tokens)}</td>`;
    }

    return text ? `<td class="soft">${this.inline(text)}</td>` : "<td></td>";
  }

  table(head, rows, headClasses = null) {
    const cells = head.map((title, index) => `<th${headClasses && has(headClasses, index) ? ` class="${headClasses[index]}"` : ""}>${esc(title)}</th>`).join("");

    return `<div class="table-wrap"><table class="table"><thead><tr>${cells}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
  }

  pageTitle(page) {
    return has(this.pages, page) ? (this.pages[page].title ?? page) : page;
  }

  pageIcon(page) {
    return (has(this.pages, page) && this.pages[page].icon) || "i-box";
  }

  // Where records live

  areas() {
    return Object.entries(this.pages)
      .filter(([, info]) => info.group === "area")
      .map(([page]) => page);
  }

  // The page a record lives on. A question lives with what it blocks, or on the overview when that spans pages.
  homeOf(record) {
    if (record.kind === "question") {
      const homes = new Set(
        splitList(record.get("Blocks"))
          .filter((id) => this.known.has(id) && ["decision", "requirement"].includes(this.known.get(id).kind))
          .map((id) => this.homeOf(this.known.get(id)))
      );

      return homes.size === 1 ? [...homes][0] : this.home;
    }

    return record.get("Page") || this.home;
  }

  // Whether a record that lives elsewhere applies to, shapes or affects a page.
  reaches(record, page) {
    if (record.kind === "question") {
      const blocked = splitList(record.get("Blocks"))
        .filter((id) => this.known.has(id))
        .map((id) => this.known.get(id));

      // Through what lives here, or a requirement that applies here; a decision's own questions stay with it.
      return blocked.some((b) => this.homeOf(b) === page || (b.kind === "requirement" && this.reaches(b, page)));
    }

    return splitList(record.get("Applies to")).includes(page);
  }

  areaChip(page) {
    return `<a class="area-chip" href="#${esc(page)}"><svg><use href="#${esc(this.pageIcon(page))}"/></svg>${esc(this.pageTitle(page))}</a>`;
  }

  lives(label, pages) {
    if (pages.length === 0) {
      return "";
    }

    const key = label ? `<span class="k">${esc(label)}</span>` : "";

    return `<span class="lives">${key}${pages.map((page) => this.areaChip(page)).join("")}</span>`;
  }

  // A group heading: an area with a link to its page, or a plain label; extra follows the name.
  groupRow(page, cols, label = "", extra = "") {
    if (page === null || page === this.home) {
      if (extra) {
        return `<tr class="group"><td colspan="${cols}"><span class="group-name">${esc(label || "Across all areas")}${extra}</span></td></tr>`;
      }

      return `<tr class="group"><td colspan="${cols}">${esc(label || "Across all areas")}</td></tr>`;
    }

    return (
      `<tr class="group"><td colspan="${cols}"><span class="group-name"><svg><use href="#${esc(this.pageIcon(page))}"/></svg>${esc(this.pageTitle(page))}${extra}</span>` +
      `<a class="open-area" href="#${esc(page)}">Open area<svg><use href="#i-arrow-right"/></svg></a></td></tr>`
    );
  }

  // Records grouped by the page they live on: the overview's first, then each area in page order.
  byHome(records) {
    const order = [this.home, ...this.areas().filter((area) => area !== this.home)];

    order.push(...unique(records.map((r) => this.homeOf(r))).filter((page) => !order.includes(page)));

    return order.flatMap((page) => {
      const members = records.filter((r) => this.homeOf(r) === page);

      return members.length > 0 ? [[page, members]] : [];
    });
  }

  // Every record, grouped by where it lives when the doc has areas.
  gathered(records, cols, row) {
    if (this.areas().length === 0) {
      return records.map(row);
    }

    const rows = [];

    for (const [page, members] of this.byHome(records)) {
      rows.push(this.groupRow(page, cols), ...members.map(row));
    }

    return rows;
  }

  // An area's own records, then those from elsewhere that reach it.
  local(page, records, cols, row, elsewhereLabel) {
    const own = records.filter((r) => this.homeOf(r) === page);
    const other = records.filter((r) => this.homeOf(r) !== page && this.reaches(r, page));
    const rows = [];

    if (own.length > 0) {
      rows.push(this.groupRow(null, cols, "This area"), ...own.map((r) => row(r, null)));
    }

    if (other.length > 0) {
      rows.push(this.groupRow(null, cols, elsewhereLabel), ...other.map((r) => row(r, this.homeOf(r))));
    }

    return rows;
  }

  // Requirements

  requirementRow(r, define, livesOn = null) {
    const priority = capitalize(r.get("Priority"));
    const badge = `<span class="${PRIORITY[priority.toLowerCase()] ?? "badge"}"${define ? " data-ref-status" : ""}>${esc(priority)}</span>`;

    if (define) {
      return (
        `<tr id="${r.id}" data-ref="requirement"><td class="id">${r.id}</td><td data-ref-text>${this.inline(r.title)}</td>` +
        `<td class="soft" data-ref-detail="Why">${this.inline(r.get("Why"))}</td>` +
        `<td class="soft" data-ref-detail="Source">${this.inline(r.get("Source"))}</td><td>${badge}</td></tr>`
      );
    }

    const lives = livesOn ? this.lives("Lives on", [livesOn]) : "";

    return `<tr><td class="id">${this.ref(r.id)}</td><td>${this.inline(r.title)}${lives}</td><td class="soft">${this.inline(r.get("Why"))}</td><td>${badge}</td></tr>`;
  }

  requirements(page, ids) {
    const records = this.design.of("requirement");

    if (page === this.home) {
      const chosen = records.filter((r) => ids === null || ids.includes(r.id));
      const rows = ids !== null ? chosen.map((r) => this.requirementRow(r, true)) : this.gathered(chosen, 5, (r) => this.requirementRow(r, true));

      return this.table(["ID", "Requirement", "Why it matters", "Source", "Priority"], rows);
    }

    const rows =
      ids !== null
        ? records.filter((r) => ids.includes(r.id)).map((r) => this.requirementRow(r, false))
        : this.local(page, records, 4, (r, livesOn) => this.requirementRow(r, false, livesOn), "Applies here, lives elsewhere");

    return this.table(["ID", "Requirement", "Why it matters", "Priority"], rows);
  }

  verdictCell(view, classes, labels) {
    if (view === null) {
      return '<td><span class="not-assessed">Not assessed</span></td>';
    }

    const [key, said] = view;
    const note = said ? `<span class="sub">${this.inline(said)}</span>` : "";

    return `<td><span class="verdict ${classes[key]}">${esc(labels[key])}</span>${note}</td>`;
  }

  stillCell(view) {
    if (view === null) {
      return '<td><span class="not-assessed">Not assessed</span></td>';
    }

    const [label, cls] = STILL[view[0]];
    const note = view[1] ? `<span class="sub">${this.inline(view[1])}</span>` : "";

    return `<td><span class="state${cls ? ` ${cls}` : ""}">${esc(label)}</span>${note}</td>`;
  }

  // Three views of a requirement: the system today, what this design covers, and what still has to be shown.
  measureRow(r, page) {
    const views = requirementViews(r, page);

    if (!views.today && !views.design && !views.still) {
      return "";
    }

    const rests = unique([views.today, views.design, views.still].filter((view) => view).flatMap((view) => view[2]));
    const label = r.get("Short") || r.title;

    return (
      `<tr><td>${this.ref(r.id)} ${this.inline(label)}</td>${this.verdictCell(views.today, TODAY, TODAY_LABEL)}` +
      `${this.verdictCell(views.design, DESIGN, DESIGN_LABEL)}${this.stillCell(views.still)}<td>${this.marks(rests)}</td></tr>`
    );
  }

  measure(page, ids) {
    const records = this.design.of("requirement").filter((r) => ids === null || ids.includes(r.id));
    let rows;

    if (page === this.home && ids === null) {
      rows = this.gathered(records, 5, (r) => this.measureRow(r, page));
    } else if (ids !== null) {
      rows = records.map((r) => this.measureRow(r, page));
    } else {
      const own = records.filter((r) => this.homeOf(r) === page);

      rows = [...own, ...records.filter((r) => !own.includes(r) && this.reaches(r, page))].map((r) => this.measureRow(r, page));
    }

    return this.table(
      ["Requirement", "Today", "This design", "Still to show", "Rests on"],
      rows.filter((row) => row)
    );
  }

  // Decisions

  status(record) {
    const text = record.get("Status") || "Open";

    return [text, DECISION_STATUS[first(text).toLowerCase()] ?? ""];
  }

  workedOut(record) {
    // A Given decision was set elsewhere; it shows who set it rather than an empty "Not started".
    if (!record.get("Worked out in") && (record.get("Status") || "").toLowerCase().startsWith("given")) {
      return `<span class="page-link none"><svg><use href="#i-file-check"/></svg>Given · ${this.inline(record.get("Source"))}</span>`;
    }

    let where = this.place(record.get("Worked out in"));
    const decided = record.get("Decided in");

    if (decided && decided !== record.get("Worked out in")) {
      where += `<span class="decided-in">Decided in ${this.place(decided, false)}</span>`;
    }

    return where;
  }

  // A link to the page, section or meeting where a decision was worked out or settled.
  place(target, onward = true) {
    if (target.startsWith("meeting-") && this.known.has(target)) {
      const meeting = this.known.get(target);

      return `<a class="page-link" href="#${esc(target)}"><svg><use href="#i-calendar"/></svg>${esc(shortDate(target.slice(8)))} · ${esc(meeting.title)}</a>`;
    }

    const page = has(this.pages, target) ? target : has(this.anchors, target) ? this.anchors[target] : null;

    if (page) {
      const info = this.pages[page];
      const kind = info.group === "brief" ? "Brief" : "Page";
      const link = info.group === "brief" ? "Open the brief" : `Open ${info.title}`;
      const onwardAttr = onward ? ` data-ref-link="${esc(link)}"` : "";

      return `<a class="page-link" href="#${esc(target)}"${onwardAttr}><svg><use href="#${esc(info.icon)}"/></svg>${kind} · ${esc(info.title)}</a>`;
    }

    return `<span class="page-link none"><svg><use href="#i-circle-dashed"/></svg>${esc(target || "Not started")}</span>`;
  }

  // Why, Reasoning and Revisit if, as blocks. The Why can feed the decision's card.
  reasoningParts(r, whyDetail) {
    const parts = [];

    if (r.get("Why")) {
      const detail = whyDetail ? ' data-ref-detail="Why"' : "";

      parts.push(`<div class="why"><h4>Why</h4><p${detail}>${this.inline(r.get("Why"))}</p></div>`);
    }

    const points = r.items("Reasoning");

    if (points.length > 0) {
      parts.push(`<div><h4>Reasoning</h4><ul>${points.map((point) => `<li>${this.inline(point)}</li>`).join("")}</ul></div>`);
    } else if (r.get("Reasoning")) {
      parts.push(`<div><h4>Reasoning</h4><p>${this.inline(r.get("Reasoning"))}</p></div>`);
    }

    if (r.get("Revisit if")) {
      parts.push(`<div><h4>Revisit if</h4><p>${this.inline(r.get("Revisit if"))}</p></div>`);
    }

    return parts;
  }

  // The options, winner or leaning first, then the lighter 'Also considered' ones, each with its reason.
  alternatives(r) {
    const order = { chosen: 0, "current leaning": 0, "not chosen": 2, "set aside": 3 };
    const rank = (o) => order[optionState(o)] ?? 1;
    const rows = [];

    for (const o of [...r.options].sort((left, right) => rank(left) - rank(right))) {
      const state = optionState(o);
      const status = o.get("Status");
      const pillClass = OPTION_PILL[state] ?? "";
      const pill = status ? `<span class="status${pillClass ? ` ${pillClass}` : ""}">${esc(status)}</span>` : "";
      const reason = state === "not chosen" || state === "set aside" ? o.get("Why not") : o.get("Summary");
      const colour = /^[A-D]$/.test(o.id) && state !== "set aside" && state !== "not chosen" ? `opt-${o.id.toLowerCase()}` : "";
      const chip = /^\d+$/.test(o.id) ? `<span class="numeral">${esc(o.id)}</span>` : `<span class="letter sm${colour ? "" : " plain"}">${esc(o.id)}</span>`;

      rows.push(
        `<li class="${colour}">${chip}<div><div class="name">${this.inline(o.title)}${pill}</div>` +
          `<p class="reason">${this.inline(reason)}${this.marks(citedIds(o, "Evidence"))}</p></div></li>`
      );
    }

    for (const item of r.items("Also considered")) {
      const [name, , rest] = partition(item, ": ");
      const whyNot = rest.slice(0, 1).toUpperCase() + rest.slice(1);

      rows.push(
        `<li><span class="letter sm plain">–</span><div><div class="name">${this.inline(name)}<span class="status outline">Also considered</span></div>` +
          `<p class="reason">${this.inline(whyNot)}</p></div></li>`
      );
    }

    if (rows.length === 0) {
      return "";
    }

    return `<div><h4>${r.options.length > 0 ? "Options" : "Alternatives"}</h4><ul class="alts">${rows.join("")}</ul></div>`;
  }

  detailHead(r, pill, sub) {
    const close = '<button type="button" class="dm-close" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button>';
    const line = sub ? `<p class="dm-shapes">${this.inline(sub)}</p>` : "";

    if (r.kind === "question") {
      // A question runs long, so it takes its own line under the ID and status.
      return `<div class="dm-head"><div class="dm-top"><div class="dm-title">${this.ref(r.id)}${pill}</div>${close}</div><h2>${this.inline(r.title)}</h2>${line}</div>`;
    }

    return `<div class="dm-head"><div class="dm-top"><div class="dm-title">${this.ref(r.id)}<h2>${this.inline(r.title)}</h2>${pill}</div>${close}</div>${line}</div>`;
  }

  // What a record means in the design: one paragraph, or its labelled parts side by side with their labels.
  explanation(r) {
    const parts = explanationParts(r);

    if (parts.length === 0) {
      return [];
    }

    if (parts.length === 1 && !parts[0][0]) {
      return [`<div class="dm-explain"><h4>Explanation</h4><p>${this.inline(parts[0][1])}</p></div>`];
    }

    const rows = parts.map(([label, text]) => `<div><dt>${esc(label)}</dt><dd>${this.inline(text)}</dd></div>`).join("");

    return [`<div class="dm-explain"><h4>Explanation</h4><dl class="dm-parts">${rows}</dl></div>`];
  }

  // Records as a list, each ID beside its short title.
  idList(idents, soft = false) {
    const items = idents
      .filter((ident) => this.known.has(ident))
      .map((ident) => {
        const record = this.known.get(ident);

        return `<li>${this.ref(ident)}<span>${this.inline(record.get("Short") || record.get("Rail") || record.title)}</span></li>`;
      })
      .join("");

    return items ? `<ul class="dm-list${soft ? " soft" : ""}">${items}</ul>` : "";
  }

  // The modal details of records not written yet, hidden after the table that defines them.
  details(records) {
    const fresh = records.filter((r) => !this.written.has(this.detailId(r)));

    for (const r of fresh) {
      this.written.add(this.detailId(r));
    }

    const render = { decision: (r) => this.decisionDetail(r), question: (r) => this.questionDetail(r), risk: (r) => this.riskDetail(r), deliverable: (r) => this.deliverableDetail(r) };
    const written = fresh.map((r) => render[r.kind](r)).join("");

    return written ? `<div class="record-details">${written}</div>` : "";
  }

  // The id of a record's modal. A risk has no ID of its own, so it takes its place among the risks.
  detailId(r) {
    if (r.kind === "risk") {
      return `risk-${this.design.of("risk").indexOf(r) + 1}-detail`;
    }

    return `${r.id}-detail`;
  }

  stage(q) {
    const value = q.get("Needed by");

    if (!value) {
      return "";
    }

    return `<span class="stage ${esc(NEEDED_BY[value.toLowerCase()] ?? "phase")}">${esc(value)}</span>`;
  }

  // A record's AI recommendation while there's still something to decide: none once it's settled or deferred.
  openRecommendation(r) {
    const settled = r.kind === "decision" ? !UNSETTLED.includes(this.state(r)) : !["open", "partly"].includes(questionState(r));

    return settled ? null : recommendation(r);
  }

  // What a recommendation picks: the option by its ID and title, or the answer it suggests.
  recommended(r, rec) {
    const option = recommendedOption(r);

    return option ? `${esc(option.id)} · ${this.inline(option.title)}` : this.inline(rec.get("value"));
  }

  // The AI recommendation in full, for a record's modal and its section in a brief: kept apart from the team's leaning
  // and answer, and labelled as advice.
  aiBlock(r) {
    const rec = this.openRecommendation(r);

    if (rec === null) {
      return "";
    }

    const part = (key) => rec.get(key) ?? "";
    const meta = [part("model"), part("confidence") ? `${capitalize(part("confidence"))} confidence` : "", shortDate(part("made"))].filter((item) => item).join(" · ");
    const change = part("would change if") ? `<p class="ai-change"><b>Would change if</b> ${this.inline(part("would change if"))}</p>` : "";
    const because = part("because") ? `<p>${this.inline(part("because"))}</p>` : "";

    return (
      `<div class="ai-rec"><div class="ai-head"><span class="ai-tag">AI recommendation</span><span class="ai-meta">${esc(meta)}</span></div>` +
      `<p class="ai-pick">${this.recommended(r, rec)}</p>${because}${change}</div>`
    );
  }

  // The AI recommendation in a table row, one line; on the record's definition it's also a line of its card.
  aiLine(r, define) {
    const rec = this.openRecommendation(r);

    if (rec === null) {
      return "";
    }

    const detail = define ? ' data-ref-detail="AI recommends"' : "";
    const model = rec.get("model") ? `&nbsp;·&nbsp;<span${define ? ' data-ref-detail="AI model"' : ""}>${esc(rec.get("model"))}</span>` : "";

    // The tag comes after the pick so a card lists what's recommended before the model; CSS shows the tag first.
    return `<span class="ai-line"><span${detail}>${this.recommended(r, rec)}</span><span class="ai-tag sm"><span>AI${model}</span></span></span>`;
  }

  // How a question's answer can be got, as a chip, with where to look for research or who to ask otherwise. On the
  // question's definition each part is also a line of its reference card.
  answerSource(q, define) {
    const part = (label, html, cls = "") => {
      const attrs = (cls ? ` class="${cls}"` : "") + (define ? ` data-ref-detail="${label}"` : "");

      return `<span${attrs}>${html}</span>`;
    };

    const ask = askName(q) ? part("Ask", this.inline(askName(q))) : "";

    if (!q.get("Answer from")) {
      return ask;
    }

    const [kind, where] = answerFrom(q);
    const chip = part("Answer from", esc(ANSWER_FROM[kind] ?? q.get("Answer from")), `route ${esc(kind)}`);

    if (kind === "research") {
      return chip + (where ? part("Where to look", this.inline(where), "sub") : "");
    }

    return chip + (ask ? `<span class="who">${ask}</span>` : "");
  }

  // What a question opens to: what it asks and where it fits, and what's known so far, its answer, or why it can wait;
  // beside them when its answer is needed, who to ask when someone was named, what it blocks, its evidence and where it
  // lives.
  questionDetail(q) {
    const state = questionState(q);
    const answered = state === "answered";
    const [text, cls] = QUESTION_PILL[state];
    const pill = `<span class="status${cls ? ` ${cls}` : ""}">${text}</span>`;
    const main = [this.aiBlock(q), ...this.explanation(q)];
    const label = answered ? "Answer" : "So far";

    if (q.get(label)) {
      main.push(`<div class="dm-answer"><h4>${label}</h4><p>${this.inline(q.get(label))}</p></div>`);
    }

    if (state === "deferred") {
      const reopen = q.get("Could reopen") ? `<p class="note">Could reopen ${this.inline(q.get("Could reopen"))}</p>` : "";

      main.push(`<div class="dm-deferred"><h4>Deferred</h4><p>${this.inline(q.get("Deferred"))}</p>${reopen}</div>`);
    }

    const side = [];

    if (q.get("Needed by") && !answered) {
      side.push(`<div><h4>Needed by</h4>${this.stage(q)}</div>`);
    }

    if (q.get("Answer from") && !answered) {
      const [kind, where] = answerFrom(q);
      const look = kind === "research" && where ? `<p>${this.inline(where)}</p>` : "";

      side.push(`<div><h4>Answer from</h4><span class="route ${esc(kind)}">${esc(ANSWER_FROM[kind] ?? q.get("Answer from"))}</span>${look}</div>`);
    }

    if (askName(q) && !answered) {
      side.push(`<div><h4>Ask</h4><p>${this.inline(askName(q))}</p></div>`);
    }

    const blocks = splitList(q.get("Blocks"));

    if (blocks.length > 0) {
      const others = blocks.filter((b) => !this.known.has(b));
      const rest = others.length > 0 ? `<p>${esc(others.join(", "))}</p>` : "";

      side.push(`<div><h4>${answered ? "Blocked" : "Blocks"}</h4>${this.idList(blocks)}${rest}</div>`);
    }

    if (answered) {
      side.push(`<div><h4>Answered by</h4>${this.idList(splitList(q.get("Answered by")), true)}</div>`);
    }

    const cited = unique([...all(MENTION, q.get("So far")), ...all(MENTION, q.get("Explanation"))]).filter((id) => id.startsWith("E") && this.known.has(id));

    if (cited.length > 0 && !answered) {
      side.push(`<div><h4>Evidence</h4>${this.idList(cited, true)}</div>`);
    }

    if (this.homeOf(q) !== this.home) {
      side.push(`<div><h4>Lives on</h4><div class="dm-chips">${this.areaChip(this.homeOf(q))}</div></div>`);
    }

    const body = `<div class="dm-body"><div class="dm-main">${main.join("")}</div><div class="dm-side">${side.join("")}</div></div>`;

    return `<div class="record-detail" id="${q.id}-detail" aria-label="${esc(q.id)} · ${esc(q.title)}">${this.detailHead(q, pill, "")}${body}</div>`;
  }

  // What a risk opens to, when it has an Explanation: what it means and why it matters, what happens and what we'd do;
  // beside them what it's linked to and where it lives.
  riskDetail(r) {
    const likelihood = capitalize(r.get("Likelihood"));
    const cls = LIKELIHOOD[likelihood.toLowerCase()] ?? "";
    const pill = `<span class="status${cls ? ` ${cls}` : ""}">${esc(likelihood)}</span>`;
    const close = '<button type="button" class="dm-close" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button>';
    const head = `<div class="dm-head"><div class="dm-top"><div class="dm-title"><span class="kind">Risk</span>${pill}</div>${close}</div><h2>${this.inline(r.title)}</h2></div>`;
    const main = this.explanation(r);

    for (const key of ["If it happens", "What we'd do"]) {
      if (r.get(key)) {
        main.push(`<div><h4>${esc(key)}</h4><p>${this.inline(r.get(key))}</p></div>`);
      }
    }

    const side = [];
    const linked = splitList(r.get("Linked")).filter((id) => this.known.has(id));

    if (linked.length > 0) {
      side.push(`<div><h4>Linked</h4>${this.idList(linked)}</div>`);
    }

    if (this.homeOf(r) !== this.home) {
      side.push(`<div><h4>Lives on</h4><div class="dm-chips">${this.areaChip(this.homeOf(r))}</div></div>`);
    }

    const affects = splitList(r.get("Applies to")).filter((page) => page !== this.homeOf(r));

    if (affects.length > 0) {
      side.push(`<div><h4>Also affects</h4><div class="dm-chips">${affects.map((page) => this.areaChip(page)).join("")}</div></div>`);
    }

    const body = `<div class="dm-body"><div class="dm-main">${main.join("")}</div><div class="dm-side">${side.join("")}</div></div>`;

    return `<div class="record-detail" id="${this.detailId(r)}" aria-label="Risk · ${esc(r.title)}">${head}${body}</div>`;
  }

  // What a decision opens to: what it asks and where it fits, its answer and reasoning, its options or alternatives,
  // and beside them what it waits on, where it's worked out, the other areas it shapes and the evidence behind it.
  decisionDetail(r) {
    const [text, cls] = this.status(r);
    const pill = `<span class="status${cls ? ` ${cls}` : ""}">${esc(text)}</span>`;
    const head = this.detailHead(r, pill, settlesLine(r, this.design));
    // The AI's recommendation leads, so a reader deciding sees it before the detail it weighs.
    const main = [this.aiBlock(r), ...this.explanation(r)];
    const label = ANSWER_LABELS.find((key) => r.get(key));

    if (label) {
      const note = r.get("Note") ? `<p class="note">${this.inline(r.get("Note"))}</p>` : "";

      main.push(`<div class="dm-answer"><h4>${esc(label)}</h4><p>${this.inline(r.get(label))}</p>${note}</div>`);
    }

    main.push(...this.reasoningParts(r, true));

    if ((r.get("Status") || "").toLowerCase() === "given" && r.get("Source")) {
      main.push(`<div><h4>Source</h4><p>${this.inline(r.get("Source"))}</p></div>`);
    }

    main.push(this.alternatives(r));

    const side = [];
    const waiting = splitList(r.get("Waiting on")).filter((id) => this.known.has(id));

    if (waiting.length > 0 && this.state(r) !== "decided") {
      side.push(`<div><h4>Waiting on</h4>${this.idList(waiting)}</div>`);
    }

    side.push(`<div><h4>Worked out in</h4>${this.workedOut(r)}</div>`);

    const alsoAreas = splitList(r.get("Applies to")).filter((page) => page !== this.homeOf(r));

    if (alsoAreas.length > 0) {
      side.push(`<div><h4>Also shapes</h4><div class="dm-chips">${alsoAreas.map((page) => this.areaChip(page)).join("")}</div></div>`);
    }

    const cited = [...citedIds(r, "Evidence"), ...all(MENTION, r.get("Why")), ...all(MENTION, r.get("Revisit if"))];

    for (const point of r.items("Reasoning")) {
      cited.push(...all(MENTION, point));
    }

    const evidence = unique(cited).filter((id) => id.startsWith("E") && this.known.has(id));

    if (evidence.length > 0) {
      side.push(`<div><h4>Evidence</h4>${this.idList(evidence, true)}</div>`);
    }

    let foot = "";
    const target = r.get("Worked out in");
    const page = has(this.pages, target) ? target : has(this.anchors, target) ? this.anchors[target] : null;

    if (r.options.length > 0 && page && this.pages[page].group === "brief") {
      foot = `<div class="dm-foot"><a class="dm-compare" href="#${esc(target)}">Compare the options in the brief</a></div>`;
    }

    const body = `<div class="dm-body"><div class="dm-main">${main.join("")}</div><div class="dm-side">${side.join("")}</div></div>`;

    return `<div class="record-detail" id="${r.id}-detail" aria-label="${esc(r.id)} · ${esc(r.title)}">${head}${body}${foot}</div>`;
  }

  state(record) {
    return DECISION_STATE[first(record.get("Status") || "Open").toLowerCase()] ?? "open";
  }

  answer(r) {
    for (const label of ANSWER_LABELS) {
      if (r.get(label)) {
        return `<span data-ref-detail="${label}">${this.inline(r.get(label))}</span>`;
      }
    }

    return "";
  }

  // A decision as the questions table shows a question: what it asks, and under it where it stands with the answer or
  // leaning (or, with neither, what it shapes) and the AI's recommendation; then what it waits on and where it's worked
  // out. The row opens the decision's detail, which the defining table writes after itself.
  decisionRow(r, define = true, chips = "") {
    const [text, cls] = this.status(r);
    const status = `<span class="status${cls ? ` ${cls}` : ""}"${define ? " data-ref-status" : ""}>${esc(text)}</span>`;
    const note = r.get("Note") ? ` ${this.inline(r.get("Note"))}` : "";
    const said = this.answer(r) || this.inline(settlesLine(r, this.design));
    const stands = `<span class="d-stands">${status}<span class="t">${said}${note}</span></span>`;
    const title = `<span class="q"${define ? " data-ref-text" : ""}>${this.inline(r.title)}</span>`;
    const waiting = this.marks(splitList(r.get("Waiting on")), define ? "Waiting on" : "");
    const opens = ` class="opens" data-detail="${r.id}-detail" tabindex="0"`;
    const ident = `<td class="id">${this.ref(r.id)}</td>`;
    const head = define ? `<tr id="${r.id}" data-ref="decision"${opens}>` : `<tr${opens}>`;

    return `${head}${ident}<td>${title}${stands}${this.aiLine(r, define)}</td><td>${waiting}</td><td>${this.workedOut(r) + chips}</td></tr>`;
  }

  // The other areas a decision shapes, besides the one it lives on and the page showing it.
  also(r, page = "") {
    return this.lives(
      "Also shapes",
      splitList(r.get("Applies to")).filter((p) => p !== this.homeOf(r) && p !== page)
    );
  }

  settledLast(records) {
    const rank = { open: 0, leaning: 0, later: 1, decided: 2 };
    const key = (r) => [rank[this.state(r)], (r.get("Status") || "").toLowerCase() === "given" ? 1 : 0];

    return [...records].sort((left, right) => {
      const [a, b] = [key(left), key(right)];

      return a[0] - b[0] || a[1] - b[1];
    });
  }

  decisions(page, ids) {
    const records = this.design.of("decision").filter((r) => ids === null || ids.includes(r.id));

    if (page === this.home) {
      let rows = [];

      if (ids !== null || this.areas().length === 0) {
        rows = this.settledLast(records).map((r) => this.decisionRow(r, true, this.also(r)));
      } else {
        for (const [home, members] of this.byHome(records)) {
          rows.push(this.groupRow(home, DECISION_HEAD.length), ...this.settledLast(members).map((r) => this.decisionRow(r, true, this.also(r))));
        }
      }

      return this.table(DECISION_HEAD, rows) + this.details(records);
    }

    const row = (r, livesOn) => this.decisionRow(r, false, livesOn ? this.lives("Lives on", [livesOn]) : this.also(r, page));

    const rows =
      ids !== null
        ? records.map((r) => row(r, this.homeOf(r) === page ? null : this.homeOf(r)))
        : this.local(page, this.settledLast(records), DECISION_HEAD.length, row, "Decided elsewhere, shapes this area");

    return this.table(DECISION_HEAD, rows);
  }

  // A decision's Why, Reasoning and Revisit if, for its section in a brief, and the AI recommendation while it's still
  // to decide.
  reasoning(_page, ids) {
    const blocks = [];

    for (const ident of ids ?? []) {
      const record = this.known.get(ident);
      const parts = record && record.kind === "decision" ? [...this.reasoningParts(record, false), this.aiBlock(record)].filter((part) => part) : [];

      if (parts.length > 0) {
        blocks.push(`<div class="reasoning">${parts.join("")}</div>`);
      }
    }

    return blocks.join("");
  }

  // Parts and risks

  parts(page) {
    const rows = [];

    for (const r of this.design.of("part")) {
      if ((r.get("Page") || this.home) !== page) {
        continue;
      }

      let does = this.inline(r.get("Does"));
      const designed = r.get("Designed on");

      if (designed) {
        does += ` Designed on <a class="page-link" href="#${esc(designed)}">${esc(this.pageTitle(designed))}</a>.`;
      }

      rows.push(`<tr><td class="q">${esc(r.title)}</td><td class="soft">${does}</td>${this.marksOrText(r.get("Decided by"))}${this.marksOrText(r.get("Evidence"))}</tr>`);
    }

    return this.table(["Part", "What it does", "Decided by", "Evidence"], rows);
  }

  // The plan

  // The page that defines the deliverables: the plan page when the doc has one, otherwise the home page.
  planHome() {
    return Object.entries(this.pages).find(([, info]) => info.group === "plan")?.[0] ?? this.home;
  }

  // A colour for the deliverable's group, the same on every page: groups in the order they first appear.
  groupClass(r) {
    const groups = unique(this.design.of("deliverable").map((d) => d.get("Group")).filter((group) => group));

    return groups.includes(r.get("Group")) ? `grp-${(groups.indexOf(r.get("Group")) % 6) + 1}` : "";
  }

  jiraItems() {
    return new Map(this.design.of("jira").map((item) => [item.id, item]));
  }

  // A Jira item as its key, linking to Jira, with the item's status as last read when the design holds it.
  jiraChip(url) {
    const key = jiraKey(url);
    const item = this.jiraItems().get(key);
    const kind = item && item.get("Type").toLowerCase() === "epic" ? "epic" : "item";
    const state = item ? ` data-state="${jiraCategory(item)}"` : "";
    const title = item ? ` title="${esc(item.title)} · ${esc(item.get("Status"))}"` : "";

    return `<a class="jira-key ${kind}" href="${esc(url)}"${state}${title}>${esc(key)}</a>`;
  }

  deliverableStatus(r) {
    const status = r.get("Status");
    const cls = DELIVERABLE_STATUS[status.toLowerCase()] ?? "";

    return `<span class="status${cls ? ` ${cls}` : ""}" data-ref-status>${esc(status)}</span>`;
  }

  // The deliverables, each opening in its modal: what it delivers, what comes first, its status and Jira items.
  plan(page, ids) {
    const records = this.design.of("deliverable").filter((r) => ids === null || ids.includes(r.id));
    const define = page === this.planHome();

    const rows = records.map((r) => {
      const attrs = (define ? ` id="${r.id}" data-ref="deliverable"` : "") + ` class="opens" data-detail="${r.id}-detail" tabindex="0"`;
      const group = this.groupClass(r) ? `<span class="grp-dot ${this.groupClass(r)}"></span>` : "";
      const ident = `<td class="id">${group}${define ? r.id : this.ref(r.id)}</td>`;
      const scope = `<span class="sub"${define ? ' data-ref-detail="Scope"' : ""}>${this.inline(r.get("Scope"))}</span>`;
      const jira = deliverableJira(r).map((url) => this.jiraChip(url)).join("") || '<span class="soft">–</span>';

      return (
        `<tr${attrs}>${ident}<td><span class="q"${define ? " data-ref-text" : ""}>${this.inline(r.title)}</span>${scope}</td>` +
        `<td>${this.marks(splitList(r.get("Follows")))}</td><td>${this.deliverableStatus(r)}</td><td><div class="jira-keys">${jira}</div></td></tr>`
      );
    });

    if (rows.length === 0) {
      return "";
    }

    return this.table(["ID", "Deliverable", "Follows", "Status", "Jira"], rows) + (define ? this.details(records) : "");
  }

  // What a deliverable opens to: what it delivers and how everyone knows it's done, the goals it serves and its Jira
  // items as last read; beside them what comes first and what it unblocks.
  deliverableDetail(r) {
    const head = this.detailHead(r, this.deliverableStatus(r), r.get("Group"));
    const goals = goalLines(this.design);

    const served = splitList(r.get("Serves"))
      .filter((n) => /^\d+$/.test(n) && Number(n) >= 1 && Number(n) <= goals.length)
      .map((n) => goals[Number(n) - 1]);

    const main = [
      `<div><h4>Scope</h4><p>${this.inline(r.get("Scope"))}</p></div>`,
      `<div><h4>Exit criteria</h4><p data-ref-detail="Exit criteria">${this.inline(r.get("Exit criteria"))}</p></div>`
    ];

    if (served.length > 0) {
      main.push(`<div><h4>Serves</h4><ul class="served">${served.map((goal) => `<li>${this.inline(goal)}</li>`).join("")}</ul></div>`);
    }

    const jira = this.jiraTree(deliverableJira(r));

    if (jira) {
      main.push(`<div><h4>Jira items <span class="soft">${esc(this.jiraRead())}</span></h4>${jira}</div>`);
    }

    const side = [];
    const follows = splitList(r.get("Follows")).filter((id) => this.known.has(id));

    if (follows.length > 0) {
      side.push(`<div><h4>Follows</h4>${this.idList(follows)}</div>`);
    }

    const unblocks = this.design
      .of("deliverable")
      .filter((d) => splitList(d.get("Follows")).includes(r.id))
      .map((d) => d.id);

    if (unblocks.length > 0) {
      side.push(`<div><h4>Unblocks</h4>${this.idList(unblocks)}</div>`);
    }

    const body = `<div class="dm-body"><div class="dm-main">${main.join("")}</div><div class="dm-side">${side.join("")}</div></div>`;

    return `<div class="record-detail" id="${r.id}-detail" aria-label="${esc(r.id)} · ${esc(r.title)}">${head}${body}</div>`;
  }

  jiraRead() {
    const reads = this.design
      .of("jira")
      .map((item) => item.get("Read"))
      .filter((read) => read)
      .sort();

    return reads.length > 0 ? `as read ${shortDate(reads.at(-1).slice(0, 10))}${reads.at(-1).slice(10)}` : "";
  }

  // Jira items with the stories under each, as last read, each linking to Jira.
  jiraTree(urls) {
    const items = this.jiraItems();
    const rows = [];

    for (const url of urls) {
      const key = jiraKey(url);

      rows.push(this.jiraRow(items.get(key) ?? null, url, false));

      for (const child of items.values()) {
        if (child.get("Parent") === key) {
          rows.push(this.jiraRow(child, child.get("URL"), true));
        }
      }
    }

    return rows.length > 0 ? `<ul class="jira-tree">${rows.join("")}</ul>` : "";
  }

  jiraRow(item, url, nested) {
    const key = item ? item.id : jiraKey(url);
    const epic = item !== null && item.get("Type").toLowerCase() === "epic";
    const title = item ? this.inline(item.title) : '<span class="soft">Not read from Jira yet</span>';
    const state = item ? `<span class="jira-state js-${jiraCategory(item)}">${esc(item.get("Status"))}</span>` : "";

    return (
      `<li class="${epic ? "ji-epic" : "ji-item"}${nested ? " nested" : ""}"><a class="jira-key${epic ? " epic" : ""}" href="${esc(url)}">${esc(key)}</a>` +
      `<span class="t">${title}</span>${state}</li>`
    );
  }

  // Links

  linksOf(kinds) {
    return this.design.of("link").filter((r) => kinds.includes(linkKind(r.get("URL"))));
  }

  // Confluence pages: the ones published from this design, then the ones it relies on.
  confluence() {
    const order = { published: 0, referenced: 1 };
    const rank = (r) => order[r.get("Role").toLowerCase()] ?? 2;
    const records = [...this.linksOf(["confluence_page"])].sort((left, right) => rank(left) - rank(right));

    const rows = records.map((r) => {
      const role = r.get("Role").toLowerCase();
      const pill = role ? `<span class="status${role === "published" ? " new" : " outline"}">${esc(LINK_ROLES[role] ?? r.get("Role"))}</span>` : "";
      const meta = [r.get("Space"), r.get("Updated")].filter((item) => item).join(" · ");

      return (
        `<tr><td><a class="link-title" href="${esc(r.get("URL"))}">${this.inline(r.title)}</a><span class="sub">${this.inline(r.get("Why"))}</span></td>` +
        `<td>${pill}</td><td class="soft mono">${esc(meta)}</td></tr>`
      );
    });

    return rows.length > 0 ? this.table(["Page", "Role", "Space · updated"], rows) : '<p class="soft">No Confluence pages yet.</p>';
  }

  otherLinks() {
    const labels = { pull_request: "Pull request", url: "Link", jira_issue: "Jira item" };

    const rows = this.linksOf(["pull_request", "url", "jira_issue"]).map(
      (r) =>
        `<tr><td><a class="link-title" href="${esc(r.get("URL"))}">${this.inline(r.title)}</a><span class="sub">${this.inline(r.get("Why"))}</span></td>` +
        `<td class="soft">${labels[linkKind(r.get("URL"))] ?? "Link"}</td></tr>`
    );

    return rows.length > 0 ? this.table(["Link", "Kind"], rows) : '<p class="soft">No other links yet.</p>';
  }

  // Every Jira item the design holds, under the deliverable that links it, then those no deliverable links.
  jira() {
    const items = this.jiraItems();
    const placed = new Set();
    const blocks = [];

    for (const d of this.design.of("deliverable")) {
      const urls = deliverableJira(d);

      if (urls.length === 0) {
        continue;
      }

      const keys = urls.map(jiraKey);

      for (const key of keys) {
        placed.add(key);
      }

      for (const child of items.values()) {
        if (keys.includes(child.get("Parent"))) {
          placed.add(child.id);
        }
      }

      blocks.push(`<div class="jira-group"><h3>${this.ref(d.id)} ${this.inline(d.title)}</h3>${this.jiraTree(urls)}</div>`);
    }

    const rest = [...items.values()].filter((item) => !placed.has(item.id) && !placed.has(item.get("Parent")));
    const tops = rest.filter((item) => !item.get("Parent") || !items.has(item.get("Parent")));

    if (tops.length > 0) {
      blocks.push(`<div class="jira-group"><h3>Not in the plan</h3>${this.jiraTree(tops.map((item) => item.get("URL")))}</div>`);
    }

    if (blocks.length === 0) {
      return '<p class="soft">No Jira items yet.</p>';
    }

    const read = this.jiraRead();

    return (read ? `<p class="soft jira-read">${esc(read[0].toUpperCase() + read.slice(1))}.</p>` : "") + blocks.join("");
  }

  riskRow(r, livesOn = null) {
    const likelihood = capitalize(r.get("Likelihood"));
    const cls = LIKELIHOOD[likelihood.toLowerCase()] ?? "";
    const happens = r.get("If it happens") ? `<span class="sub">If it happens: ${this.inline(r.get("If it happens"))}</span>` : "";
    const lives = livesOn ? this.lives("Lives on", [livesOn]) : "";
    // A risk with an Explanation opens in the modal, as decisions and questions do; the rest stay one line.
    const opens = explanationParts(r).length > 0 ? ` class="opens" data-detail="${this.detailId(r)}" tabindex="0"` : "";

    return (
      `<tr${opens}><td><span class="q">${this.inline(r.title)}</span>${happens}${lives}</td><td><span class="status${cls ? ` ${cls}` : ""}">${esc(likelihood)}</span></td>` +
      `<td class="soft">${this.inline(r.get("What we'd do"))}</td><td>${this.marks(splitList(r.get("Linked")))}</td></tr>`
    );
  }

  risks(page) {
    const records = this.design.of("risk");
    const rows = page === this.home ? this.gathered(records, 4, (r) => this.riskRow(r)) : this.local(page, records, 4, (r, livesOn) => this.riskRow(r, livesOn), "Owned elsewhere, affects this area");
    // Each explained risk's modal is written once, after the first table that shows it.
    const explained = records.filter((r) => explanationParts(r).length > 0 && (page === this.home || this.homeOf(r) === page || this.reaches(r, page)));

    return this.table(["Risk", "Likelihood", "What we'd do", "Linked"], rows) + this.details(explained);
  }

  // Cost

  // A line's monthly figure: its own, or the chosen or leaning option's when it varies with a decision.
  costAmount(r) {
    const amounts = costAmounts(r);
    const varies = r.get("Varies with");

    if (!varies) {
      return amounts[""];
    }

    const decision = this.known.get(varies);
    let option = decision ? (decision.options.find((o) => optionState(o) === "chosen")?.id ?? null) : null;

    if (option === null && decision !== undefined && this.state(decision) === "leaning") {
      option = [...words(decision.get("Status")), ""][1];
    }

    return option ? (amounts[option] ?? null) : null;
  }

  money(amount) {
    const [low, high] = amount.map((value) => `$${thousands(roundHalfEven(value))}`);

    return low === high ? low : `${low} → ${high}`;
  }

  // A line's category, and when it applies: its own words, or the decision it varies with.
  costTags(r) {
    const tags = [];

    if (r.get("Category")) {
      tags.push(`<span class="cost-tag">${esc(r.get("Category"))}</span>`);
    }

    const varies = this.known.get(r.get("Varies with"));
    const when = r.get("Applies when") || (varies ? `Varies with ${named(varies)} (${varies.id})` : "");

    if (when) {
      tags.push(`<span class="cost-tag when">${this.inline(when)}</span>`);
    }

    return tags.length > 0 ? `<span class="cost-tags">${tags.join("")}</span>` : "";
  }

  costRow(r) {
    const amount = this.costAmount(r);
    let shown;

    if (amount !== null && amount !== undefined) {
      shown = this.money(amount);
    } else if (r.get("Varies with")) {
      shown = esc(r.get("Monthly"));
    } else {
      // Unknown is never $0: it says so, and stays out of the total.
      const label = r.get("Monthly").toLowerCase().includes("per use") ? "Per use" : "Unknown";

      shown = `<span class="unknown">${label}</span><span class="sub">Not in the total</span>`;
    }

    const linked = [...splitList(r.get("Evidence")), ...splitList(r.get("Varies with")), ...splitList(r.get("Affected by"))];

    for (const id of all(MENTION, r.get("Monthly"))) {
      if (!linked.includes(id)) {
        linked.push(id);
      }
    }

    return (
      `<tr><td><span class="q">${esc(r.title)}</span>${this.costTags(r)}</td><td class="soft">${this.inline(r.get("Drives"))}</td>` +
      `<td class="num">${shown}</td><td>${this.marks(linked)}</td></tr>`
    );
  }

  // The sum of the lines that have a figure, and the lines left out of it.
  costTotal(records) {
    const amounts = records.map((r) => [r, this.costAmount(r) ?? null]);
    const known = amounts.filter(([, amount]) => amount !== null).map(([, amount]) => amount);
    const missing = amounts.filter(([, amount]) => amount === null).map(([r]) => r);

    if (known.length === 0) {
      return ["Not known", missing];
    }

    return [this.money([known.reduce((sum, amount) => sum + amount[0], 0), known.reduce((sum, amount) => sum + amount[1], 0)]), missing];
  }

  costBasis() {
    const basis = this.design.costBasis;

    if (basis.size === 0) {
      return "";
    }

    const rows = ["Assumes", "Leaves out"].flatMap((key) => (basis.has(key) ? [`<div><dt>${esc(key)}</dt><dd>${this.inline(basis.get(key).value)}</dd></div>`] : [])).join("");

    return `<dl class="cost-basis">${rows}</dl>`;
  }

  // What the figures assume and leave out, then every cost line grouped by area with each area's subtotal, the total per
  // month (only what's known, and labelled so), and the totals by category.
  cost(page) {
    const records = this.design.of("cost").filter((r) => page === this.home || this.homeOf(r) === page);
    const rows = [];

    if (page === this.home && this.areas().length > 0) {
      for (const [home, members] of this.byHome(records)) {
        const [subtotal, missing] = this.costTotal(members);
        let shown = subtotal === "Not known" ? subtotal : `${subtotal} a month`;

        if (missing.length > 0 && subtotal !== "Not known") {
          shown += `, plus ${missing.length === 1 ? "one" : missing.length} unknown`;
        }

        rows.push(this.groupRow(home, 4, "", `<span class="soft">${shown}</span>`), ...members.map((r) => this.costRow(r)));
      }
    } else {
      rows.push(...records.map((r) => this.costRow(r)));
    }

    const [total, missing] = this.costTotal(records);
    const label = missing.length > 0 && total !== "Not known" ? "Known total per month" : "Total per month";

    const note =
      missing.length > 0 && total !== "Not known" ? `Leaves out ${missing.map((r) => r.title.slice(0, 1).toLowerCase() + r.title.slice(1)).join(", ")}, not known yet.` : "";

    rows.push(`<tr class="total"><td>${label}</td><td class="soft">${esc(note)}</td><td class="num">${total}</td><td></td></tr>`);

    const categories = unique(records.map((r) => r.get("Category")).filter((category) => category));

    if (categories.length > 0) {
      const parts = categories.map((category) => {
        const [amount, unknown] = this.costTotal(records.filter((r) => r.get("Category") === category));
        const shown = unknown.length === 0 || amount === "Not known" ? amount : `${amount} + unknown`;

        return `<span class="cat"><b>${esc(category)}</b> <span class="num">${shown}</span></span>`;
      });

      rows.push(`<tr class="by-category"><td colspan="4"><span class="k">By category</span>${parts.join("")}</td></tr>`);
    }

    return this.costBasis() + this.table(["Line item", "What drives it", "Monthly", "Evidence"], rows, { 2: "num" });
  }

  terms(page) {
    const chosen = this.design.terms.filter((term) => term.pages.length === 0 || term.pages.includes(page));

    return `<dl>${chosen.map((term) => `<div><dt>${esc(term.name)}</dt><dd>${this.inline(term.text)}</dd></div>`).join("")}</dl>`;
  }

  // Shared pages

  evidence() {
    const rows = this.design.of("evidence").map((r) => {
      const sources = r.items("Gathered from").map((item) => {
        const [kind, , value] = partition(item, ": ");

        return `<div class="source"><span class="k">${esc(kind)}</span><span class="v">${this.inline(value)}</span></div>`;
      });

      return (
        `<tr id="${r.id}" data-ref="evidence"><td class="id">${r.id}</td>` +
        `<td class="has-details"><details><summary data-ref-text>${this.inline(r.title)}</summary><div class="how">` +
        `<div><h4>How we know</h4><p data-ref-detail="How we know">${this.inline(r.get("How we know"))}</p></div>` +
        `<div><h4>Gathered from</h4><div class="sources">${sources.join("")}</div></div></div></details></td>` +
        `<td data-cited-on></td><td class="soft date" data-ref-status="Found">${esc(r.get("Found"))}</td></tr>`
      );
    });

    return this.table(["ID", "Finding", "Cited on", "Found"], rows);
  }

  // An open question: what it asks and how far it has got (open, partly answered, or deferred and why), when its answer
  // is needed, who to ask when someone was named, and what it blocks.
  questionRow(q, define, livesOn = null) {
    const state = questionState(q);
    const detail = define ? ' data-ref-detail="So far"' : "";
    let status;

    if (state === "partly") {
      status = `<span class="q-state partly">Partly answered</span><span class="sub"${detail}>${this.inline(q.get("So far"))}</span>`;
    } else if (state === "deferred") {
      const reopen = q.get("Could reopen") ? ` Could reopen ${this.inline(q.get("Could reopen"))}` : "";

      status = `<span class="q-state deferred">Deferred</span><span class="sub"${define ? ' data-ref-detail="Deferred"' : ""}>${this.inline(q.get("Deferred"))}${reopen}</span>`;
    } else {
      status = '<span class="q-state">Open</span>';
    }

    const lives = livesOn ? this.lives("Lives on", [livesOn]) : "";
    const ident = define ? `<td class="id">${q.id}</td>` : `<td class="id">${this.ref(q.id)}</td>`;
    const attrs = (define ? ` id="${q.id}" data-ref="question"` : "") + ` class="opens${state === "deferred" ? " deferred" : ""}" data-detail="${q.id}-detail" tabindex="0"`;
    const text = `<span${define ? " data-ref-text" : ""}>${this.inline(q.title)}</span>`;
    const stage = `<td${define && q.get("Needed by") ? ' data-ref-detail="Needed by"' : ""}>${this.stage(q)}</td>`;
    const ask = `<td class="ask">${this.answerSource(q, define)}</td>`;

    return (
      `<tr${attrs}>${ident}<td>${text}<span class="q-status">${status}</span>${this.aiLine(q, define)}${lives}</td>${stage}${ask}` +
      `<td>${this.marks(splitList(q.get("Blocks")), define ? "Blocks" : "")}</td></tr>`
    );
  }

  answeredRow(q, define) {
    const evidence = splitList(q.get("Answered by"));
    const found = evidence.map((e) => (this.known.has(e) ? this.known.get(e).get("Found") : "")).find((date) => date) ?? "";
    const when = found ? `<span class="sub">Answered ${esc(found)}</span>` : "";
    const attrs = (define ? ` id="${q.id}" data-ref="question" data-answered` : "") + ` class="opens" data-detail="${q.id}-detail" tabindex="0"`;
    const ident = define ? q.id : this.ref(q.id);
    const answer = this.inline(q.get("Answer"));

    return (
      `<tr${attrs}><td class="id">${ident}</td><td><span class="asked"${define ? " data-ref-text" : ""}>${this.inline(q.title)}</span>` +
      `<span class="answer"${define ? ' data-ref-detail="Answer"' : ""}>${answer}</span></td>` +
      `<td>${this.marks(evidence, define ? "Answered by" : "")}${when}</td></tr>`
    );
  }

  answeredGroup(questions, define) {
    if (questions.length === 0) {
      return "";
    }

    const rows = questions.map((q) => this.answeredRow(q, define)).join("");

    return (
      `<details class="answered"><summary>Answered <span class="n">${questions.length}</span></summary>` +
      `<div class="table-wrap"><table class="table"><tbody>${rows}</tbody></table></div></details>` +
      (define ? this.details(questions) : "")
    );
  }

  // Open questions, then the answered ones collapsed. Each is defined on the overview, or on its home page once answered.
  questions(page, ids) {
    let records = this.design.of("question").filter((q) => ids === null || ids.includes(q.id));
    const blocks = splitList(this.opts.blocks ?? "");

    if (blocks.length > 0) {
      records = records.filter((q) => splitList(q.get("Blocks")).some((id) => blocks.includes(id)));
    }

    const open = records.filter((q) => !isAnswered(q));
    const answered = records.filter((q) => isAnswered(q));
    const head = ["ID", "Question", "Needed by", "Answer from", "Blocks"];

    if (page === this.home && blocks.length === 0) {
      const rows = ids !== null ? open.map((q) => this.questionRow(q, true)) : this.gathered(open, 5, (q) => this.questionRow(q, true));
      const here = answered.filter((q) => this.homeOf(q) === page);

      return (rows.length > 0 ? this.table(head, rows) + this.details(open) : "") + this.answeredGroup(here, true);
    }

    if (blocks.length > 0) {
      const define = page === this.home;
      const rows = open.map((q) => this.questionRow(q, define, define ? null : this.homeOf(q)));

      return (rows.length > 0 ? this.table(head, rows) + (define ? this.details(open) : "") : "") + this.answeredGroup(answered, define);
    }

    const rows = this.local(page, open, 5, (q, livesOn) => this.questionRow(q, false, livesOn), "Owned elsewhere, affects this area");
    const here = answered.filter((q) => this.homeOf(q) === page);

    return (rows.length > 0 ? this.table(head, rows) : "") + this.answeredGroup(here, true);
  }

  // Progress

  counts(decisions, questions) {
    const states = { decided: 0, leaning: 0, open: 0, later: 0 };

    // A Given decision was never the design's to make, so it doesn't count toward what's settled.
    for (const d of decisions) {
      if (!(d.get("Status") || "").toLowerCase().startsWith("given")) {
        states[this.state(d)] += 1;
      }
    }

    const answered = questions.filter((q) => isAnswered(q)).length;
    const deferred = questions.filter((q) => isDeferred(q)).length;

    return [states, questions.length - answered - deferred, answered, deferred];
  }

  bar(parts) {
    return `<span class="progress-bar">${parts
      .filter(([, n]) => n)
      .map(([kind, n]) => `<i class="${kind}" style="flex-grow:${n}"></i>`)
      .join("")}</span>`;
  }

  // How much is settled: tiles per area on an overview with areas, a single line anywhere else.
  progress(page) {
    const decisions = this.design.of("decision");
    const questions = this.design.of("question");
    const total = (states) => Object.values(states).reduce((sum, n) => sum + n, 0);

    if (page === this.home && this.areas().length > 0) {
      const tiles = [this.home, ...this.areas().filter((area) => area !== this.home)].map((home) => {
        const ds = decisions.filter((d) => this.homeOf(d) === home);
        const qs = questions.filter((q) => this.homeOf(q) === home);
        const [states, open, answered, deferred] = this.counts(ds, qs);
        const title = home !== this.home ? esc(this.pageTitle(home)) : "Across all areas";
        const name = home !== this.home ? `<a href="#${esc(home)}">${title}</a>` : `<span>${title}</span>`;

        const answeredNote = [
          [deferred, "deferred"],
          [answered, "answered"]
        ]
          .flatMap(([n, word]) => (n ? [`<span class="soft"> · ${n} ${word}</span>`] : []))
          .join("");

        return (
          `<div class="tile"><div class="tile-head"><svg><use href="#${esc(this.pageIcon(home))}"/></svg>${name}</div>` +
          `${this.marks(ds.map((d) => d.id).sort(byNumber))}` +
          `<span class="sub">${states.decided} of ${total(states)} decided</span>` +
          `<div class="tile-q"><svg><use href="#i-circle-help"/></svg><b>${open} open</b>${answeredNote}</div></div>`
        );
      });

      return `<div class="progress"><div class="progress-tiles">${tiles.join("")}</div></div>`;
    }

    let ds;
    let qs;
    let alsoD = [];
    let alsoQ = [];

    if (page === this.home) {
      ds = decisions;
      qs = questions;
    } else {
      ds = decisions.filter((d) => this.homeOf(d) === page);
      qs = questions.filter((q) => this.homeOf(q) === page);
      alsoD = decisions.filter((d) => this.homeOf(d) !== page && this.reaches(d, page) && UNSETTLED.includes(this.state(d))).map((d) => d.id);
      alsoQ = questions.filter((q) => this.homeOf(q) !== page && this.reaches(q, page) && !isAnswered(q) && !isDeferred(q)).map((q) => q.id);
    }

    const [states, open, answered, deferred] = this.counts(ds, qs);

    const dNote =
      alsoD.length > 0
        ? `also shaped by ${alsoD.join(", ")}`
        : Object.entries(states)
            .filter(([kind, n]) => n && kind !== "decided")
            .map(([kind, n]) => `${n} ${kind}`)
            .join(", ");

    const qNote = [deferred ? `${deferred} deferred` : "", answered ? `${answered} answered` : "", alsoQ.length > 0 ? `${alsoQ.join(", ")} ${alsoQ.length === 1 ? "lives" : "live"} elsewhere` : ""]
      .filter((part) => part)
      .join(" · ");

    return (
      '<div class="progress-line">' +
      `<div class="metric"><span class="label">Decisions</span><span class="n"><b>${states.decided}</b> of ${total(states)} decided</span>` +
      `${this.bar(Object.entries(states))}<span class="note">${this.inline(dNote)}</span></div>` +
      '<span class="divider"></span>' +
      `<div class="metric"><span class="label">Open questions</span><span class="n"><b>${open}</b> open</span>` +
      `${this.bar([
        ["decided", answered],
        ["open", open]
      ])}<span class="note">${this.inline(qNote)}</span></div></div>`
    );
  }

  meetings() {
    const blocks = this.design.of("meeting").map((r) => {
      const date = r.id.slice(8);
      const status = r.get("Status");
      const cls = MEETING_STATUS[status.toLowerCase()] ?? "";
      const body = [];

      if (r.get("Who")) {
        body.push(`<div class="who">${this.inline(r.get("Who"))}</div>`);
      }

      if (r.items("Summary").length > 0) {
        body.push(`<ul>${r.items("Summary").map((item) => `<li>${this.inline(item)}</li>`).join("")}</ul>`);
      } else if (r.get("Summary")) {
        body.push(`<p>${this.inline(r.get("Summary"))}</p>`);
      }

      const proposals = proposalsOf(r);

      if (proposals.length > 0) {
        body.push(this.proposalsLine(r, proposals));
      }

      const chips = this.design.changes.filter((change) => change.source === `meeting ${date}`).flatMap((change) => change.items);

      if (chips.length > 0) {
        body.push(`<div class="changes"><span>Changed in this doc</span>${chips.map((chip) => `<span class="change">${esc(chip)}</span>`).join("")}</div>`);
      }

      return (
        `<div class="meeting" id="${r.id}">` +
        `<div class="date"><b>${esc(shortDate(date))}</b><small>${esc(weekday(date))}</small></div><div class="track"></div>` +
        `<div class="body"><div class="title"><h3>${esc(r.title)}</h3><span class="status${cls ? ` ${cls}` : ""}">${esc(status)}</span></div>` +
        `${body.join("")}</div></div>`
      );
    });

    const modals = this.design
      .of("meeting")
      .filter((r) => proposalsOf(r).length > 0)
      .map((r) => this.proposalsDetail(r, proposalsOf(r)))
      .join("");

    return `<div class="meetings">${blocks.join("")}</div>` + (modals ? `<div class="record-details">${modals}</div>` : "");
  }

  proposalCounts(proposals) {
    const statuses = proposals.map((p) => str(p.status).toLowerCase());
    const pending = statuses.filter((status) => status === "proposed").length;
    const accepted = statuses.filter((status) => status === "accepted" || status === "changed").length;

    return [pending, accepted, proposals.length - pending - accepted];
  }

  proposalsLine(r, proposals) {
    const [pending, accepted, other] = this.proposalCounts(proposals);
    const text = pending ? `${pending} of ${proposals.length} proposals to review` : `${proposals.length} proposals reviewed: ${accepted} accepted` + (other ? `, ${other} not` : "");

    return (
      `<div class="proposals-line" role="button" tabindex="0" data-detail="${r.id}-proposals">` +
      `<span class="status${pending ? " open" : ""}">${esc(text)}</span><span class="open-link">Open the proposals →</span></div>`
    );
  }

  // The other records an accepted proposal would write, so one proposal covers everything an outcome touches.
  proposalAlso(p) {
    let items = given(p.also) ? p.also : [];

    if (jsonKind(items) === "string") {
      items = [items];
    }

    return items.length > 0 ? `<p class="pr-also"><span>Also records</span> ${items.map((item) => this.inline(str(item))).join("; ")}</p>` : "";
  }

  // The modal a meeting opens to: every change it could make to the design, in plain words, with what it would change,
  // the meeting's words behind it, the recommendation and why, and how the user settled it.
  proposalsDetail(r, proposals) {
    const close = '<button type="button" class="dm-close" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button>';
    const [pending, accepted, other] = this.proposalCounts(proposals);
    const summary = [pending ? `${pending} to review` : "", accepted ? `${accepted} accepted` : "", other ? `${other} not accepted` : ""].filter((part) => part).join(" · ");

    const head =
      `<div class="dm-head"><div class="dm-top"><div class="dm-title"><span class="kind">Proposals</span>` +
      `<span class="status${pending ? " open" : ""}">${esc(summary)}</span></div>${close}</div>` +
      `<h2>What the ${esc(shortDate(r.id.slice(8)))} meeting could change</h2>` +
      `<p class="dm-shapes">${esc(r.title)}. What would change, the meeting's words behind it, and what I recommend. Settle them by number.</p></div>`;

    const rank = (p) => {
      const kind = str(p.kind).toLowerCase();

      return [PROPOSAL_ORDER.includes(kind) ? PROPOSAL_ORDER.indexOf(kind) : PROPOSAL_ORDER.length, p.n ?? 0];
    };

    const byRank = (left, right) => {
      const [a, b] = [rank(left), rank(right)];

      return a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0);
    };

    const routine = (p) => {
      const tier = str(p.tier).toLowerCase();

      return tier ? tier === "routine" : ROUTINE_KINDS.has(str(p.kind).toLowerCase());
    };

    const key = proposals.filter((p) => !routine(p)).sort(byRank);
    const rest = proposals.filter((p) => routine(p)).sort(byRank);

    const cards = key.map((p) => {
      const status = str(p.status ?? "proposed").toLowerCase();
      const recommend = str(p.recommend).toLowerCase();
      const targets = splitList(str(p.target));
      const chips = targets.map((t) => (this.known.has(t) ? this.ref(t) : `<span class="change">${esc(t)}${given(p.new) ? " (new)" : ""}</span>`)).join("");
      let change = "";

      if (given(p.before) || given(p.after)) {
        change =
          `<div class="pr-change"><div><span class="pr-label">Now</span>${this.inline(given(p.before) ? str(p.before) : "Nothing recorded")}</div>` +
          `<span class="pr-arrow">→</span><div><span class="pr-label">If accepted</span>${this.inline(str(p.after))}</div></div>`;
      }

      const quote = given(p.from) ? `<blockquote class="pr-quote"><span class="pr-label">From the meeting</span>${this.inline(str(p.from))}</blockquote>` : "";

      const advice =
        `<div class="pr-rec ${RECOMMEND[recommend] ?? ""}"><span class="pr-label">I recommend</span>` + `<b>${esc(str(p.recommend))}</b><p>${this.inline(str(p.why))}</p></div>`;

      const note = given(p.note) ? `<div class="pr-note"><span class="pr-label">What we decided</span>${this.inline(str(p.note))}</div>` : "";

      return (
        `<li class="proposal ${status}"><div class="pr-top"><span class="pr-n">${esc(str(p.n))}</span>` +
        `<span class="pr-kind">${esc(str(p.kind))}</span>${chips}` +
        `<span class="status ${PROPOSAL_STATUS[status] ?? ""}">${esc(PROPOSAL_LABEL[status] ?? str(p.status))}</span></div>` +
        `<p class="pr-text">${this.inline(str(p.proposal))}</p>${this.proposalAlso(p)}${change}${quote}${advice}${note}</li>`
      );
    });

    let group = "";

    if (rest.length > 0) {
      const rows = rest.map((p) => {
        const status = str(p.status ?? "proposed").toLowerCase();
        const recommend = str(p.recommend).toLowerCase();

        const chips = splitList(str(p.target))
          .map((t) => (this.known.has(t) ? this.ref(t) : `<span class="change">${esc(t)}</span>`))
          .join("");

        const note = given(p.note) ? `<span class="pr-row-note">${this.inline(str(p.note))}</span>` : "";

        return (
          `<li class="pr-row ${status}"><span class="pr-n">${esc(str(p.n))}</span><span class="pr-kind">${esc(str(p.kind))}</span>${chips}` +
          `<span class="pr-row-text">${this.inline(str(p.proposal))}${this.proposalAlso(p)}${note}</span>` +
          `<span class="pr-rec-pill ${RECOMMEND[recommend] ?? ""}">${esc(str(p.recommend))}</span>` +
          `<span class="status ${PROPOSAL_STATUS[status] ?? ""}">${esc(PROPOSAL_LABEL[status] ?? str(p.status))}</span></li>`
        );
      });

      const openAttr = rest.some((p) => str(p.status).toLowerCase() === "proposed") && key.length === 0 ? " open" : "";

      group =
        `<details class="pr-routine"${openAttr}><summary><b>Record keeping</b> · ${rest.length} proposal${rest.length !== 1 ? "s" : ""}: evidence, risk updates and follow-ons that keep the design consistent. ` +
        `Say "accept the rest" to take my recommendation on all of them.</summary><ol class="pr-rows">${rows.join("")}</ol></details>`;
    }

    let look = "";

    if (r.items("Worth a look").length > 0) {
      look =
        '<div class="pr-look"><span class="pr-label">Worth a look (not discussed in the meeting)</span><ul>' +
        r
          .items("Worth a look")
          .map((item) => `<li>${this.inline(item)}</li>`)
          .join("") +
        "</ul></div>";
    }

    const heading = key.length > 0 && rest.length > 0 ? '<h3 class="pr-group">Changes to what the design says</h3>' : "";

    return (
      `<div class="record-detail" id="${r.id}-proposals" aria-label="Proposals from ${esc(r.title)}">${head}` +
      `<div class="pr-body">${heading}<ol class="proposals">${cards.join("")}</ol>${group}${look}</div></div>`
    );
  }

  render(kind, page, ids, opts = {}) {
    const methods = {
      requirements: () => this.requirements(page, ids),
      measure: () => this.measure(page, ids),
      decisions: () => this.decisions(page, ids),
      reasoning: () => this.reasoning(page, ids),
      parts: () => this.parts(page, ids),
      risks: () => this.risks(page, ids),
      plan: () => this.plan(page, ids),
      confluence: () => this.confluence(page, ids),
      "other-links": () => this.otherLinks(page, ids),
      jira: () => this.jira(page, ids),
      cost: () => this.cost(page, ids),
      terms: () => this.terms(page, ids),
      evidence: () => this.evidence(page, ids),
      questions: () => this.questions(page, ids),
      meetings: () => this.meetings(page, ids),
      progress: () => this.progress(page, ids)
    };

    this.opts = opts;

    return has(methods, kind) ? methods[kind]() : null;
  }
}

// Replace each records placeholder with rendered HTML on a single line, so line numbers stay put.
export function fillPlaceholders(text, renderer, pageAt) {
  const problems = [];

  const filled = text.replace(PLACEHOLDER, (whole, kind, optionText, offset) => {
    const options = {};

    for (const option of words(optionText)) {
      const [key, , value] = partition(option, "=");

      options[key] = value;
    }

    const line = text.slice(0, offset).split("\n").length;
    const page = options.page || pageAt(offset) || "overview";
    const ids = has(options, "ids") ? splitList(options.ids) : null;

    if (kind === "reasoning") {
      const unknown = (ids ?? []).filter((id) => !renderer.known.has(id));

      if (!ids || ids.length === 0 || unknown.length > 0) {
        problems.push([line, `'records reasoning' needs ids=<decision>${unknown.length > 0 ? `; unknown: ${unknown.join(", ")}` : ""}`]);
      }
    }

    const html = renderer.render(kind, page, ids, options);

    if (html === null) {
      problems.push([line, `unknown records placeholder '${kind}'`]);

      return whole;
    }

    return html;
  });

  return { text: filled, problems };
}
