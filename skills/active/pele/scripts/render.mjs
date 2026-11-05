#!/usr/bin/env node
// Renders Mermaid text to SVG with the Pele build vendored beside this skill, and to PNG through an installed
// SVG converter. A Markdown input renders each of its mermaid blocks.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { PeleError, render } from "../vendor/pele/pele.js";

const usage = `Usage: node scripts/render.mjs [input] [options]

Reads Mermaid from the input file, or from stdin when it is omitted or "-",
and writes SVG to the output file, or to stdout. A .md input renders every
\`\`\`mermaid block; with several, the output name gets -1, -2, ... before
its extension.

  -o, --output <file>     Write to a file; a .png name renders a PNG
  -w, --width <px>        Width available to the diagram; some types lay out narrower to fit
      --font <family>     Font family the SVG draws labels in (default: sans-serif; for
                          PNG and --flat, Arial or a font with its widths when installed)
      --font-size <px>    Label font size
      --padding <px>      Space around the diagram
      --flat              Replace CSS variables with their values, so converters
                          without CSS-variable support draw the right colors
      --scale <n>         PNG pixels per SVG pixel (default: 2)
  -h, --help              Show this help

PNG needs rsvg-convert or ImageMagick (magick) on PATH.`;

function fail(message) {
  console.error(`render: ${message}`);
  process.exit(2);
}

let parsed;

try {
  parsed = parseArgs({
    allowPositionals: true,
    options: {
      output: { type: "string", short: "o" },
      width: { type: "string", short: "w" },
      font: { type: "string" },
      "font-size": { type: "string" },
      padding: { type: "string" },
      flat: { type: "boolean" },
      scale: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });
} catch (error) {
  fail(error.message);
}

const { values, positionals } = parsed;

if (values.help || positionals.length > 1) {
  console.log(usage);
  process.exit(values.help ? 0 : 2);
}

function pixels(name, text, allowZero) {
  if (text === undefined) return undefined;

  const value = Number(text);

  if (!(value > 0 || (allowZero && value === 0))) fail(`--${name} must be a number of pixels, not "${text}"`);

  return value;
}

const scale = pixels("scale", values.scale ?? "2", false);
const input = positionals[0] ?? "-";
const png = values.output !== undefined && extname(values.output).toLowerCase() === ".png";

// Outside a browser Pele sizes labels from an Arial width table, so a converter drawing them in a wider sans-serif
// spills text out of its boxes; these fonts share Arial's widths, and the converter takes the first one installed.
const arialMetric = 'Arial, "Liberation Sans", Arimo, sans-serif';

const options = {
  maxWidth: pixels("width", values.width, false),
  fontFamily: values.font ?? (png || values.flat ? arialMetric : undefined),
  fontSize: pixels("font-size", values["font-size"], false),
  padding: pixels("padding", values.padding, true),
};

let text;

try {
  text = readFileSync(input === "-" ? 0 : input, "utf8");
} catch (error) {
  fail(error.message);
}

const markdown = /\.(md|markdown)$/i.test(input);
const sources = markdown ? [...text.matchAll(/^```mermaid[^\n]*\n([\s\S]*?)^```/gm)].map((match) => match[1]) : [text];

if (sources.length === 0) fail(`${input} has no \`\`\`mermaid block`);

if (sources.length > 1 && values.output === undefined) fail(`${input} has ${sources.length} mermaid blocks; name an output file with -o`);

if (png && values.output === undefined) fail("PNG needs an output file");

// Dracula, the human's theme for every diagram. These replace Pele's defaults as the fallbacks of its --pele-*
// variables, so a page can still restyle an SVG, and flattening bakes them into PNG and --flat output. Muted is
// lighter than Dracula's comment colour for contrast, and borders mix it 60% over the background.
const dracula = {
  bg: "#282a36", fg: "#f8f8f2", muted: "#a3a8c3", line: "#c6c8d8", border: "#72768b",
  surface: "#282a36", "surface-alt": "#282a36", accent: "#ff79c6", critical: "#ff5555", error: "#ff5555",
  "series-1": "#8be9fd", "series-2": "#bd93f9", "series-3": "#f1fa8c", "series-4": "#50fa7b",
  "series-5": "#ffb86c", "series-6": "#ff79c6", "series-7": "#ff5555", "series-8": "#a3a8c3",
};

// The root also paints the background, since Dracula's light text disappears on a white page.
function theme(svg) {
  return svg
    .replace(/var\(--pele-([\w-]+),([^()]*)\)/g, (whole, name) => (name in dracula ? `var(--pele-${name},${dracula[name]})` : whole))
    .replace(/<svg([^>]*?) style="/, '<svg$1 style="background:var(--pele-bg,' + dracula.bg + ');');
}

// Notes are annotations, written by hand like the human's blog: Kalam, pink when the note sits in a highlighted
// band (`rect` in a sequence diagram) to say why it is highlighted, muted elsewhere. A note's box and any message
// label inside a band take the band's colour, so text sits on the highlight with no outline and no dark patch,
// and lifelines stop at the text instead of running through it.
function annotate(svg) {
  const bands = [...svg.matchAll(/<rect class="pele-rect" x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)" style="[^"]*?fill:([^;"]+)/g)]
    .map(([, x, y, width, height, fill]) => ({ x: Number(x), y: Number(y), width: Number(width), height: Number(height), fill }));

  const bandAround = (x, y, width, height) => bands.find((band) => {
    const middleX = Number(x) + Number(width) / 2;
    const middleY = Number(y) + Number(height) / 2;

    return middleX > band.x && middleX < band.x + band.width && middleY > band.y && middleY < band.y + band.height;
  });

  return svg
    .replace(/(<g class="pele-edge-label"[^>]*><rect x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"[^>]*?)fill="[^"]*"/g,
      (whole, start, x, y, width, height) => {
        const band = bandAround(x, y, width, height);

        return band ? `${start}fill="${band.fill}"` : whole;
      })
    .replace(/(<g class="pele-note"[^>]*>)<rect x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"([^>]*)\/>(<text [^>]*?)fill="[^"]*"/g,
      (whole, group, x, y, width, height, rest, text) => {
        const band = bandAround(x, y, width, height);

        return `${group}<rect x="${x}" y="${y}" width="${width}" height="${height}"${rest} fill="${band?.fill ?? "var(--_bg)"}" stroke="none"/>`
          + `${text}font-family="Kalam, cursive" font-size="16" fill="${band ? "var(--_c)" : "var(--_m)"}"`;
      });
}

// Pele colors through two layers of custom properties, public ones with fallbacks (var(--pele-fg,#1f1f1f)) and
// internal ones defined from them (--_fg); librsvg and ImageMagick support neither and draw shapes black.
function flatten(svg) {
  let flat = svg.replace(/var\(--[\w-]+,([^()]*)\)/g, "$1");
  const defined = new Map([...flat.matchAll(/(--[\w-]+)\s*:\s*([^;"}]+)/g)].map(([, name, value]) => [name, value.trim()]));

  for (let pass = 0; pass < 5 && /var\(--/.test(flat); pass++) {
    flat = flat.replace(/var\((--[\w-]+)\)/g, (whole, name) => defined.get(name) ?? whole);
  }

  return flat;
}

function onPath(command) {
  return spawnSync(command, ["--version"], { stdio: "ignore" }).status === 0;
}

const converter = !png ? null : onPath("rsvg-convert") ? "rsvg-convert" : onPath("magick") ? "magick" : null;

if (png && converter === null) fail("PNG needs rsvg-convert or ImageMagick (magick) on PATH; without one, write an SVG with --flat for another converter");

function toPng(svg, file) {
  const args = converter === "rsvg-convert"
    ? ["--zoom", String(scale), "--background-color", dracula.bg, "--output", file]
    : ["-density", String(96 * scale), "-background", dracula.bg, "svg:-", file];

  // The converter finds the bundled Kalam through a fontconfig file that adds this skill's fonts to the system's.
  const fonts = fileURLToPath(new URL("../assets/fonts/", import.meta.url));
  const system = [process.env.FONTCONFIG_FILE, "/etc/fonts/fonts.conf", "/usr/local/etc/fonts/fonts.conf", "/opt/homebrew/etc/fonts/fonts.conf"].filter(Boolean);
  const dir = mkdtempSync(join(tmpdir(), "pele-fonts-"));
  const config = join(dir, "fonts.conf");

  writeFileSync(config, `<?xml version="1.0"?>\n<fontconfig>${system.map((file) => `<include ignore_missing="yes">${file}</include>`).join("")}<dir>${fonts}</dir><cachedir>${dir}</cachedir></fontconfig>\n`);

  try {
    const result = spawnSync(converter, args, { input: svg, env: { ...process.env, FONTCONFIG_FILE: config } });

    if (result.status !== 0) fail(`${converter} failed: ${result.stderr.toString().trim()}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function outputName(index) {
  if (sources.length === 1) return values.output;

  const extension = extname(values.output);

  return `${values.output.slice(0, values.output.length - extension.length)}-${index + 1}${extension}`;
}

for (const [index, source] of sources.entries()) {
  let svg;

  try {
    svg = annotate(theme(render(source, options).svg));
  } catch (error) {
    if (!(error instanceof PeleError)) throw error;

    console.error(`render: ${markdown ? `mermaid block ${index + 1}: ` : ""}${error.message}`);
    process.exit(1);
  }

  if (png) {
    toPng(flatten(svg), outputName(index));
  } else if (values.output === undefined) {
    process.stdout.write(`${values.flat ? flatten(svg) : svg}\n`);
  } else {
    writeFileSync(outputName(index), `${values.flat ? flatten(svg) : svg}\n`);
  }

  if (values.output !== undefined) console.error(`render: wrote ${outputName(index)}`);
}
