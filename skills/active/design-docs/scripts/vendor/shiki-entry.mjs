// Entry for the vendored Shiki bundle (shiki.bundle.mjs): the core, the JavaScript regex engine (no WebAssembly),
// a theme of CSS variables, and the languages design docs use. Rebuild with build-shiki.mjs when upgrading.
export { createCssVariablesTheme, createHighlighterCoreSync } from "@shikijs/core";

export { createJavaScriptRegexEngine } from "@shikijs/engine-javascript";

export { default as diff } from "@shikijs/langs/diff";

export { default as docker } from "@shikijs/langs/docker";

export { default as hcl } from "@shikijs/langs/hcl";

export { default as ini } from "@shikijs/langs/ini";

export { default as javascript } from "@shikijs/langs/javascript";

export { default as json } from "@shikijs/langs/json";

export { default as powershell } from "@shikijs/langs/powershell";

export { default as python } from "@shikijs/langs/python";

export { default as shellscript } from "@shikijs/langs/shellscript";

export { default as sql } from "@shikijs/langs/sql";

export { default as toml } from "@shikijs/langs/toml";

export { default as typescript } from "@shikijs/langs/typescript";

export { default as xml } from "@shikijs/langs/xml";

export { default as yaml } from "@shikijs/langs/yaml";
