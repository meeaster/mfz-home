#!/usr/bin/env node
// Renders Mermaid text to SVG with the Pele build vendored beside this skill.
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { PeleError, render } from "../vendor/pele/pele.js";

const usage = `Usage: node scripts/render.mjs [input.mmd] [options]

Reads Mermaid from the input file, or from stdin when it is omitted or "-",
and writes SVG to the output file, or to stdout.

  -o, --output <file>     Write the SVG to a file
  -w, --width <px>        Width available to the diagram; some types lay out narrower to fit
      --font <family>     Font family the SVG draws labels in (default: sans-serif)
      --font-size <px>    Label font size
      --padding <px>      Space around the diagram
  -h, --help              Show this help`;

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

const options = {
  maxWidth: pixels("width", values.width, false),
  fontFamily: values.font,
  fontSize: pixels("font-size", values["font-size"], false),
  padding: pixels("padding", values.padding, true),
};

const input = positionals[0] ?? "-";

let source;

try {
  source = readFileSync(input === "-" ? 0 : input, "utf8");
} catch (error) {
  fail(error.message);
}

let svg;

try {
  ({ svg } = render(source, options));
} catch (error) {
  if (!(error instanceof PeleError)) throw error;

  console.error(`render: ${error.message}`);
  process.exit(1);
}

if (values.output === undefined) {
  process.stdout.write(`${svg}\n`);
} else {
  writeFileSync(values.output, `${svg}\n`);
}
