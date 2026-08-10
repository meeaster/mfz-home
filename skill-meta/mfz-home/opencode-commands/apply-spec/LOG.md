# Log

## 2026-08-08 - Conditional Research Routing

- Added the first authoring record for the existing command while preserving Apply authority and pre-implementation quality guidance.
- Kept Explore as the standard local-evidence route and made Research conditional on a concrete external documentation or upstream-source question.
- Required the coordinator to extract exact external questions and versions instead of asking Research to read the OpenSpec change.
- Grounded the change in Research audit session `ses_01f9df6d2ffetdjIcTSSjnvbO2`, which found repeated local and implementation-shaped Research assignments caused by the previous unconditional routing.
- Applied the rendered command and verified it through `mfz smoke-opencode`; live Research probes confirmed that a concrete React question uses the documentation route while a local-only implementation request stops without tools. Full command execution was not used because `/apply-spec` would require a real change and implementation workspace.
