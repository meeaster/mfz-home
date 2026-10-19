// Text helpers the records and the checker share: splitting lines, escaping HTML, dates and money as the doc shows them.

// A character Unicode counts as part of a word, for patterns that must treat é or 中 the way they treat e.
export const WORD = "[\\p{L}\\p{N}_]";

// Lines without their endings. A final line ending adds no empty line, as with Python's str.splitlines.
export function splitLines(text) {
  const lines = text.split(/\r\n|[\n\r\v\f\x1c\x1d\x1e\x85\u2028\u2029]/);

  if (lines.at(-1) === "") {
    lines.pop();
  }

  return lines;
}

// Whitespace-separated words, with no empty ones.
export function words(text) {
  return text.split(/\s+/).filter((word) => word !== "");
}

export function capitalize(text) {
  return text.slice(0, 1).toUpperCase() + text.slice(1).toLowerCase();
}

// Before a colon, and after it: "a: b: c" splits at the first one. Without the separator, the rest is empty.
export function partition(text, separator) {
  const at = text.indexOf(separator);

  return at === -1 ? [text, "", ""] : [text.slice(0, at), separator, text.slice(at + separator.length)];
}

// Text for an element's content or a double-quoted attribute.
export function esc(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

// Text for any attribute, single quotes too.
export function escAll(text) {
  return esc(text).replaceAll("'", "&#x27;");
}

const NAMED = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  middot: "·",
  rarr: "→",
  larr: "←",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  times: "×",
  copy: "©",
  sect: "§",
  bull: "•"
};

// Character references back to the characters they stand for.
export function unescape(text) {
  return text.replace(/&(#[0-9]+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (whole, name) => {
    if (name.startsWith("#")) {
      const code = name[1] === "x" || name[1] === "X" ? Number.parseInt(name.slice(2), 16) : Number.parseInt(name.slice(1), 10);

      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "�";
    }

    return Object.hasOwn(NAMED, name) ? NAMED[name] : whole;
  });
}

// Rounds half to even, so $2.50 shows as $2 and $3.50 as $4.
export function roundHalfEven(value) {
  const floor = Math.floor(value);
  const diff = value - floor;

  if (diff > 0.5) {
    return floor + 1;
  }

  if (diff < 0.5) {
    return floor;
  }

  return floor % 2 === 0 ? floor : floor + 1;
}

export function thousands(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// A date written YYYY-MM-DD, or null when it isn't one.
function isoDate(text) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);

  if (match === null) {
    return null;
  }

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));

  return date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[3]) ? date : null;
}

// "2026-10-02" as "Oct 2"; anything else as it was written.
export function shortDate(iso) {
  const date = isoDate(iso);

  return date === null ? iso : `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

export function weekday(iso) {
  const date = isoDate(iso);

  return date === null ? "" : DAYS[date.getUTCDay()];
}

// JSON on one line, a space after each comma and colon, the way the records' list items have always been written.
export function spacedJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(spacedJson).join(", ")}]`;
  }

  if (jsonKind(value) === "object") {
    return `{${Object.entries(value)
      .map(([key, item]) => `${JSON.stringify(key)}: ${spacedJson(item)}`)
      .join(", ")}}`;
  }

  return JSON.stringify(value);
}

// What a value read from JSON is: null, array, object, string, number or boolean, told apart by value.
export function jsonKind(value) {
  if (value === null || value === undefined) {
    return "null";
  }

  if (Array.isArray(value)) {
    return "array";
  }

  if (value === true || value === false) {
    return "boolean";
  }

  if (value === String(value)) {
    return "string";
  }

  return value === Number(value) ? "number" : "object";
}

// A string quoted the way Python shows one: single quotes unless it holds one and no double quote.
function quoted(text) {
  const quote = text.includes("'") && !text.includes('"') ? '"' : "'";

  const body = [...text]
    .map((char) => {
      if (char === "\\" || char === quote) {
        return `\\${char}`;
      }

      const escapes = { "\n": "\\n", "\r": "\\r", "\t": "\\t" };

      if (Object.hasOwn(escapes, char)) {
        return escapes[char];
      }

      const code = char.codePointAt(0);

      return code < 0x20 || code === 0x7f ? `\\x${code.toString(16).padStart(2, "0")}` : char;
    })
    .join("");

  return `${quote}${body}${quote}`;
}

// A JSON value as Python writes it inside a list or object: strings quoted, True, False and None.
function shown(value) {
  if (jsonKind(value) === "string") {
    return quoted(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(shown).join(", ")}]`;
  }

  if (jsonKind(value) === "object") {
    return `{${Object.entries(value)
      .map(([key, item]) => `${quoted(key)}: ${shown(item)}`)
      .join(", ")}}`;
  }

  return plain(value);
}

// A JSON value written into a record's Markdown line.
export function plain(value) {
  if (jsonKind(value) === "object") {
    return shown(value);
  }

  if (value === true) {
    return "True";
  }

  if (value === false) {
    return "False";
  }

  if (value === null || value === undefined) {
    return "None";
  }

  return String(value);
}

// A list without repeats, in the order each first appears.
export function unique(items) {
  return [...new Set(items)];
}
