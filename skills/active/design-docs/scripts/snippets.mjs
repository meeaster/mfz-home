// Fenced snippets, coloured at build time with the vendored Shiki bundle. Colours are CSS variables (--code-*) that
// doc.css sets from the doc's palette, so a snippet follows the theme. A fence names its language (```hcl); a terminal
// session (```console) colours each "$ " line as a command and dims what it printed; no language stays plain.

import * as Shiki from "./vendor/shiki.bundle.mjs";
import { esc } from "./text.mjs";

// Fence names, the grammar each uses, and the label over the snippet.
const LANGUAGES = {
  bash: ["shellscript", "Shell"],
  sh: ["shellscript", "Shell"],
  shell: ["shellscript", "Shell"],
  zsh: ["shellscript", "Shell"],
  hcl: ["hcl", "Terraform"],
  terraform: ["hcl", "Terraform"],
  tf: ["hcl", "Terraform"],
  json: ["json", "JSON"],
  yaml: ["yaml", "YAML"],
  yml: ["yaml", "YAML"],
  powershell: ["powershell", "PowerShell"],
  ps1: ["powershell", "PowerShell"],
  pwsh: ["powershell", "PowerShell"],
  sql: ["sql", "SQL"],
  docker: ["docker", "Dockerfile"],
  dockerfile: ["docker", "Dockerfile"],
  python: ["python", "Python"],
  py: ["python", "Python"],
  typescript: ["typescript", "TypeScript"],
  ts: ["typescript", "TypeScript"],
  javascript: ["javascript", "JavaScript"],
  js: ["javascript", "JavaScript"],
  ini: ["ini", "INI"],
  toml: ["toml", "TOML"],
  xml: ["xml", "XML"],
  html: ["xml", "HTML"],
  diff: ["diff", "Diff"],
};

const SESSIONS = new Set(["console", "terminal", "shell-session"]);

export const SNIPPET_LANGUAGES = [...Object.keys(LANGUAGES), ...SESSIONS].sort();

// TextMate scopes to the doc's code colours; the most specific selector that matches wins.
const SCOPES = [
  ["comment", "comment"],
  ["string", "string"],
  ["constant.numeric", "number"],
  ["constant.language", "number"],
  ["keyword", "keyword"],
  ["storage", "keyword"],
  ["variable", "variable"],
  ["variable.other.enummember", "string"],
  ["entity.name.type", "type"],
  ["support.type", "type"],
  ["entity.name.function", "command"],
  ["support.function", "command"],
  ["entity.name.command", "command"],
  ["constant.other.option", "flag"],
  ["support.type.property-name", "property"],
  ["entity.name.tag", "property"],
  ["variable.other.readwrite.hcl", "property"],
  ["punctuation", "punctuation"],
  ["keyword.operator", "punctuation"],
  ["markup.inserted", "inserted"],
  ["markup.deleted", "deleted"],
];

const THEME = {
  name: "design-doc",
  type: "light",
  colors: { "editor.foreground": "var(--code-text)", "editor.background": "transparent" },
  tokenColors: SCOPES.map(([scope, colour]) => ({ scope, settings: { foreground: `var(--code-${colour})` } })),
};

let highlighter = null;

const highlighterFor = () => {
  highlighter ??= Shiki.createHighlighterCoreSync({
    themes: [THEME],
    langs: [...new Set(Object.values(LANGUAGES).map(([grammar]) => grammar))].map((grammar) => Shiki[grammar]),
    engine: Shiki.createJavaScriptRegexEngine(),
  });

  return highlighter;
};

const COMMAND = "var(--code-command)";

const STRING = "var(--code-string)";

// A command's own words, up to its first option, are its subcommands: "aws s3api get-bucket-policy", "terraform plan".
const markSubcommands = (line) => {
  let inCall = false;

  return line.map((token) => {
    if (token.color === COMMAND) {
      inCall = true;

      return token;
    }

    if (token.content.trim() === "") return token;

    if (inCall && token.color === STRING && /^[a-z][\w-]*$/.test(token.content)) return { ...token, color: "var(--code-subcommand)" };

    inCall = false;

    return token;
  });
};

const tokensHtml = (code, grammar) => {
  const { tokens } = highlighterFor().codeToTokens(code, { lang: grammar, theme: "design-doc" });

  return tokens
    .map((line) => (grammar === "shellscript" ? markSubcommands(line) : line).map((token) => `<span style="color:${token.color}">${esc(token.content)}</span>`).join(""))
    .join("\n");
};

// A terminal session: "$ " lines are commands, everything else is what they printed.
const sessionHtml = (code) =>
  code
    .split("\n")
    .map((line) => {
      const prompt = /^(\$|#) (.*)$/.exec(line);

      return prompt === null ? `<span class="output">${esc(line)}</span>` : `<span class="prompt">${prompt[1]}</span> ${tokensHtml(prompt[2], "shellscript")}`;
    })
    .join("\n");

export function snippetHtml(info, code) {
  const fence = info.trim().toLowerCase();

  if (SESSIONS.has(fence)) return `<figure class="snippet session"><figcaption>Terminal</figcaption><pre><code>${sessionHtml(code)}</code></pre></figure>`;

  const known = LANGUAGES[fence];

  if (known === undefined) return `<figure class="snippet plain"><pre><code>${esc(code)}</code></pre></figure>`;

  return `<figure class="snippet" data-lang="${fence}"><figcaption>${known[1]}</figcaption><pre><code>${tokensHtml(code, known[0])}</code></pre></figure>`;
}
