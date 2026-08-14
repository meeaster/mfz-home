---
description: Independently reviews completed work against its requirements and repository evidence. Returns prioritized, evidence-backed findings and identifies unsupported concerns.
mode: subagent
permission:
  "*": deny
  read:
    "*": allow
    "~/.aws/**": deny
    "~/.xurl": deny
    "~/.mindframe-z/secrets/**": deny
  glob: allow
  grep: allow
  list: allow
  webfetch: allow
  websearch: allow
  skill: allow
  lsp: allow
  fff_*: allow
  current_session_id: allow
  external_directory:
    "*": ask
    "~/workspace/references/**": allow
    "~/.mindframe-z/**": allow
    "~/.mindframe-z/secrets/**": deny
---
