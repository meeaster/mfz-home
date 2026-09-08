# Maintenance

## Dependencies

The runtime skill is project-local and depends on the commands and run artifacts owned by the `kpop-outfit-finder` repository. Its tooling reference follows upstream FFmpeg and yt-dlp command-line guidance. The Personal environment provisions Node, FFmpeg, and yt-dlp through `profiles/personal/mise.toml`; the skill itself remains installer-independent.

[Historical experiments and decisions](LOG.md) retain original fixture observations, provisional routing choices, and the reasons older mechanics were replaced. Use that history when a proposed refresh would restore mandatory scouting, per-piece crop folders, or metric-only selection. Do not interpret those earlier choices as current requirements.

## Refresh Conditions

Review the skill and its tooling reference when:

- a project command, run-manifest field, identity-source field, or output directory changes;
- the versioned evidence contract or its member, outfit, full-body, upper-body, lower-body, piece, crop, or timestamp fields change;
- a deterministic command replaces a judgment step or a model must take over a failed deterministic approach;
- FFmpeg or yt-dlp changes an option used by the project;
- live runs reveal recurring artist-assignment, outfit-grouping, or evidence-selection failures;
- DBKpop changes its MV pages, group tables, headings, captions, image metadata, or linked video IDs;
- repeated direct commands reveal a stable operation that should become a tested Node script;
- live runs show that a skill instruction fights a capable model's effective default strategy;
- measured cost per accepted evidence set supports a reusable efficiency improvement;
- product research becomes an implemented workflow rather than a deferred milestone.

## Verification

Run the repository's unit and integration test lanes, validate skill frontmatter and relative links, and parse all bundled JSON schemas. Then evaluate the matching scenarios in `EVALS.md`. Check schema conformance, identity-source provenance, file existence, checksums, crop bounds, baseline completeness, outfit references, canonical frame references, and decoded PTS derivation. Record the OpenCode version, model, skill revision, and run fixture for live evaluations.

For extraction changes, retain whether the fixture contains multiple artists, actual outfit changes, rapid camera cuts, solo full-body coverage, and broadcast identity labels. One fixture cannot validate all of these branches.

Do not evaluate downloading against private or restricted media. Use a permitted fixture and keep generated media outside Git.
