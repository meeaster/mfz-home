---
name: axis-resource-skill-probe
description: Read a bundled reference and create the requested probe artifact when explicitly invoked.
slash: true
---

# Axis Resource Skill Probe

Read `references/expected.txt` relative to this skill's directory. Create
`axis-resource-artifact.txt` in the current workspace with exactly that file's
content. Then reply with exactly `AXIS_RESOURCE_SKILL_OK_R4K8` and no other
text.
