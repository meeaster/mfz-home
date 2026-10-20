// Versions of a design. When its direction changes so far that the design is rewritten, the version before is frozen
// in versions/v<N>/ (its records, pages and published doc) and the design folder becomes the next version, written as
// the current state. The published doc is always the latest; a menu in its top bar opens the earlier ones, published
// beside it as <slug>.v<N>.html with a note pointing back to the latest.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { esc } from "./text.mjs";

const VERSIONS = "versions";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export class VersionError extends Error {}

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

// The version a design folder holds: the one after its newest frozen version, or design.json's `version` when that's
// higher. The folder decides, so a rewritten design.json that drops the field still reads as the right version.
export function versionOf(folder) {
  const { version } = readJson(join(folder, "design.json"));
  const after = (earlierVersions(folder).at(-1)?.number ?? 0) + 1;

  return Number.isInteger(version) && version > after ? version : after;
}

// The date of a version's last logged change, as people read it ("Oct 20, 2026").
const lastChange = (folder) => {
  const path = join(folder, "changes.md");
  const dates = existsSync(path) ? [...readFileSync(path, "utf8").matchAll(/^## (\d{4})-(\d{2})-(\d{2})/gm)] : [];
  const last = dates.at(-1);

  return last === undefined ? null : `${MONTHS[Number(last[2]) - 1]} ${Number(last[3])}, ${last[1]}`;
};

// The earlier versions kept in a design folder, oldest first.
export function earlierVersions(folder) {
  const root = join(folder, VERSIONS);

  if (!existsSync(root)) return [];

  return readdirSync(root)
    .flatMap((name) => {
      const match = /^v(\d+)$/.exec(name);

      return match === null ? [] : [{ number: Number(match[1]), folder: join(root, name), date: lastChange(join(root, name)) }];
    })
    .sort((left, right) => left.number - right.number);
}

// Freezes the folder's current version in versions/v<N>/ and starts the next one in place. The records, pages and
// components stay for the author to rewrite as the current state; the change log and meetings start empty, since they
// tell how the earlier version got where it was, under its numbering.
export function startVersion(folder, slug, today) {
  const number = versionOf(folder);
  const frozen = join(folder, VERSIONS, `v${number}`);

  if (existsSync(frozen)) throw new VersionError(`${frozen} already exists; this folder's version number is behind its versions/`);

  if (!existsSync(join(folder, "published", `${slug}.html`))) throw new VersionError(`build the doc first: the frozen version keeps its published copy`);

  mkdirSync(frozen, { recursive: true });

  // Everything but the review copies and earlier versions, and of the published files only the doc itself.
  for (const entry of readdirSync(folder)) {
    if (![VERSIONS, ".review", "published"].includes(entry)) cpSync(join(folder, entry), join(frozen, entry), { recursive: true });
  }

  mkdirSync(join(frozen, "published"));
  cpSync(join(folder, "published", `${slug}.html`), join(frozen, "published", `${slug}.html`));

  const { format, ...rest } = readJson(join(folder, "design.json"));

  writeFileSync(join(folder, "design.json"), `${JSON.stringify({ format, ...rest, version: number + 1 }, null, 2)}\n`);
  writeFileSync(join(folder, "meetings.json"), `${JSON.stringify({ meetings: [] }, null, 2)}\n`);
  writeFileSync(
    join(folder, "changes.md"),
    `# Changes\n\nAccepted changes to this design, oldest first. Each entry says where the change came from.\n\n## ${today} · request\n- Started version ${number + 1}\n`,
  );

  return { number: number + 1, frozen };
}

// The note on an earlier version's page: what it is, and the way back. Styled inline, since its stylesheet is frozen.
const banner = (number, slug) =>
  `<div class="version-note" style="position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:1000;display:flex;gap:12px;align-items:center;padding:8px 10px 8px 16px;border-radius:999px;background:#171717;color:#fafafa;box-shadow:0 8px 24px #00000059;font:500 13px/1.4 Inter,ui-sans-serif,system-ui,sans-serif">` +
  `Version ${number}, an earlier version of this design` +
  `<a href="${esc(slug)}.html" style="padding:5px 12px;border-radius:999px;background:#fafafa;color:#171717;text-decoration:none;font-weight:600">Latest version</a></div>`;

// Publishes each earlier version beside the doc, and returns the top bar's menu for the doc, or "" with none.
export function publishVersions(folder, slug, out, notes) {
  const earlier = earlierVersions(folder);

  if (earlier.length === 0) return "";

  const links = [];

  for (const version of earlier) {
    const source = join(version.folder, "published", `${slug}.html`);

    if (!existsSync(source)) {
      notes.push(`version ${version.number} has no published doc in ${source}; it isn't in the version menu`);
      continue;
    }

    const name = `${slug}.v${version.number}.html`;

    writeFileSync(join(out, name), readFileSync(source, "utf8").replace(/<body[^>]*>/, (tag) => `${tag}\n${banner(version.number, slug)}`));
    links.unshift(`<a href="${esc(name)}">Version ${version.number}${version.date === null ? "" : `<span>${esc(version.date)}</span>`}</a>`);
  }

  const current = versionOf(folder);

  return (
    `<details class="versions"><summary>Version ${current}</summary><div class="versions-menu">` +
    `<a href="${esc(slug)}.html" aria-current="page">Version ${current}<span>Latest</span></a>${links.join("")}</div></details><span class="divider"></span>`
  );
}
