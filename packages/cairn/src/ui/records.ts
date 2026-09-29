// Reads the parts of design and source files the UI summarises. The formats are owned by the design-docs and
// effort-context skills; these readers take only what the lists show and ignore everything else.

export type DesignStats = {
  readonly title: string | null;
  readonly summary: string | null;
  readonly decisions: { readonly total: number; readonly decided: number };
  readonly open_questions: number;
};

type Item = {
  readonly fields: ReadonlyMap<string, string>;
};

// The `###` items of each `##` section, with their `- Field: value` lines.
function sections(markdown: string): Map<string, Item[]> {
  const found = new Map<string, Item[]>();
  let items: Item[] | null = null;
  let fields: Map<string, string> | null = null;

  for (const line of markdown.split("\n")) {
    const section = /^## (.+?)\s*$/.exec(line);

    if (section?.[1] !== undefined) {
      items = [];
      fields = null;
      found.set(section[1], items);
      continue;
    }

    if (line.startsWith("### ") && items !== null) {
      fields = new Map();
      items.push({ fields });
      continue;
    }

    const field = /^- ([A-Za-z][A-Za-z ]*?):\s*(.*)$/.exec(line);

    if (field?.[1] !== undefined && field[2] !== undefined && fields !== null) {
      fields.set(field[1].toLowerCase(), field[2].trim());
    }
  }

  return found;
}

function firstHeading(markdown: string): string | null {
  const match = /^# (.+?)\s*$/m.exec(markdown);

  return match?.[1] ?? null;
}

// The first paragraph after the title, which design-docs uses for the one-sentence summary.
function leadParagraph(markdown: string): string | null {
  const lines = markdown.split("\n");
  const title = lines.findIndex((line) => line.startsWith("# "));
  const paragraph: string[] = [];

  for (const line of lines.slice(title + 1)) {
    const trimmed = line.trim();

    if (trimmed.startsWith("#")) {
      break;
    }

    if (trimmed === "" || trimmed.startsWith("<!--")) {
      if (paragraph.length > 0) {
        break;
      }

      continue;
    }

    paragraph.push(trimmed);
  }

  return paragraph.length === 0 ? null : paragraph.join(" ");
}

// A decision counts as settled when the team decided it or it was given from outside the design.
export function designStats(markdown: string): DesignStats {
  const found = sections(markdown);
  const decisions = found.get("Decisions") ?? [];
  const questions = found.get("Questions") ?? [];
  let decided = 0;

  for (const decision of decisions) {
    const status = decision.fields.get("status") ?? "";

    if (/^(decided|given)\b/i.test(status)) {
      decided += 1;
    }
  }

  return {
    title: firstHeading(markdown),
    summary: leadParagraph(markdown),
    decisions: { total: decisions.length, decided },
    open_questions: questions.filter((question) => !question.fields.has("answer")).length
  };
}

// changes.md entries are `## YYYY-MM-DD · <source>` headings.
export function countChanges(markdown: string): number {
  return markdown.split("\n").filter((line) => /^## \d{4}-\d{2}-\d{2} · /.test(line)).length;
}

// The built doc records how many changes.md entries it includes.
export function publishedMark(html: string): number | null {
  const match = /<meta name="design-changes" content="(\d+)"/.exec(html);

  return match?.[1] === undefined ? null : Number(match[1]);
}

// The slug the built doc is named for: <html data-doc>, or the folder name.
export function docSlug(shellHtml: string | null, folderName: string): string {
  const match = shellHtml === null ? null : /<html\b[^>]*\bdata-doc="([^"]+)"/.exec(shellHtml);

  return match?.[1] ?? folderName;
}

export type MeetingIntake =
  | { readonly state: "not_reviewed" }
  | { readonly state: "outcomes"; readonly accepted: number; readonly deferred: number; readonly rejected: number };

// A summary's Intake section records each candidate as accepted, deferred, or rejected once the human goes through it.
export function meetingIntake(summary: string): MeetingIntake {
  const lines = summary.split("\n");
  const start = lines.findIndex((line) => /^#{2,3} Intake\s*$/i.test(line));

  if (start === -1) {
    return { state: "not_reviewed" };
  }

  const counts = { accepted: 0, deferred: 0, rejected: 0 };

  for (const line of lines.slice(start + 1)) {
    if (/^#{1,3} /.test(line)) {
      break;
    }

    const outcome = /\b(accepted|deferred|rejected)\b/i.exec(line)?.[1]?.toLowerCase();

    if (line.trimStart().startsWith("- ") && (outcome === "accepted" || outcome === "deferred" || outcome === "rejected")) {
      counts[outcome] += 1;
    }
  }

  if (counts.accepted + counts.deferred + counts.rejected === 0) {
    return { state: "not_reviewed" };
  }

  return { state: "outcomes", ...counts };
}

export type ThreadState = {
  readonly title: string | null;
  readonly last_message: string | null;
  readonly intake:
    | { readonly state: "not_reviewed" }
    | { readonly state: "reviewed_through"; readonly through: string; readonly newer: number };
};

// Messages are `## <date> [time] · <sender>` headings, oldest first; `Reviewed through` names the last one taken
// through intake. Timestamps compare as text at the precision `Reviewed through` gives, so a date alone covers
// every message that day.
export function threadState(markdown: string): ThreadState {
  const messages: string[] = [];

  for (const line of markdown.split("\n")) {
    const match = /^## (\d{4}-\d{2}-\d{2})(?: (\d{2}:\d{2}))? · /.exec(line);

    if (match?.[1] !== undefined) {
      messages.push(match[2] === undefined ? match[1] : `${match[1]} ${match[2]}`);
    }
  }

  const reviewed = /^- Reviewed through:\s*(\d{4}-\d{2}-\d{2}(?: \d{2}:\d{2})?)/m.exec(markdown)?.[1];

  return {
    title: firstHeading(markdown),
    last_message: messages.at(-1) ?? null,
    intake:
      reviewed === undefined
        ? { state: "not_reviewed" }
        : { state: "reviewed_through", through: reviewed, newer: messages.filter((message) => message.slice(0, reviewed.length) > reviewed).length }
  };
}
