# Evaluations

Invocation, execution, and paired-evaluation sections specify expectations. Recorded outcomes are in the final section and are inherited evidence, not new passes from this record-only update.

## Invocation

### K-pop Music Video

Prompt: “Analyze this K-pop music video and show me every outfit each member wears.”

Assertions:

- The skill is discoverable without being named.
- The response requests or derives a performer roster without assuming every visible person is a member.
- The workflow targets distinct outfit evidence sets with complementary views.

### Fancam

Prompt: “Pull the clearest clothing references for the idol in this fancam.”

Assertions:

- The skill treats the centered performer as the likely subject while retaining identity uncertainty.
- The result standard includes full-look and detail views when the source provides them.

### Adjacent Video Task

Prompt: “Summarize the story in this music video.”

Assertion: The skill is not selected solely because the input is a music video.

## Execution

### Missing Toolchain

Starting state: FFmpeg, ffprobe, or yt-dlp is unavailable and the requested branch requires it.

Assertions:

- The skill reads the tooling reference.
- It reports the missing boundary before generating partial run output.
- It does not install software without user direction.

### First Direct Extraction

Starting state: The required media tools exist, but no project extraction command has been implemented.

Assertions:

- The skill may invoke the installed tools directly.
- It records exact commands, inputs, outputs, and shortcomings with the run.
- It identifies script candidates from observed repetition, fragility, or manifest ownership rather than creating wrappers for every command.

### Highest-quality source acquisition

Starting state: A URL offers a higher-resolution video stream than the easiest combined download.

Assertions:

- The run acquires the highest-quality usable video stream without a convenience resolution cap.
- Separate video and audio streams are merged without transcoding when the retained source needs both.
- Overview frames, canonical frames, and evidence crops derive from the preserved source.

### Model-Directed Full Coverage

Starting state: A performance is long or visually dense enough that exhaustive source-frame inspection would be expensive.

Assertions:

- The run contains one lossless source-resolution baseline frame per elapsed second and records each decoded source PTS.
- The directing model chooses how to review that baseline and which periods need denser inspection.
- The skill does not require a fixed contact-sheet layout, dense cadence, delegation pattern, or exhaustive frame grading.
- Final evidence comes from source-quality frames rather than overview tiles or thumbnails.
- The run records model effort, usage, cost when available, final selections, and parent corrections.

### Standard evidence package

Starting state: A video contains multiple members and at least two outfits for each member.

Assertions:

- `manifest.json`, `overview/map.json`, and each `outfit.json` conform to the version 1 JSON schemas.
- Canonical frame records preserve requested timestamps, decoded source PTS values, checksums, dimensions, and source-frame paths.
- Each member maps to numbered outfit files.
- Each outfit has an overview image, the strongest available full-body evidence, close upper-body evidence, close lower-body evidence, identified garment pieces, and explicit missing evidence.
- Final evidence folders contain focused lossless source-pixel crops grouped as full body, upper body, and lower body. Each crop records its checksum and pixel bounds and links to one canonical full source frame.
- Candidate selection prefers a naturally close source shot over a tighter crop from a distant group shot.
- Each garment, shoe, or accessory that may be searched independently has its own piece record. Piece records reference the standard evidence images instead of duplicating crops.
- Every final crop is referenced by `outfit.json`; exploratory files do not appear as final evidence.

### Visual identity research

Starting state: The video names a group or roster but does not reliably label each visible performer.

Assertions:

- The agent finds reliable member-labeled visual references before assigning names.
- Searches do not assume an unverified outfit color, hairstyle, or performer mapping.
- Official profiles, official member posts, same-era press photos, and individual fancams outrank unlabeled images, fan profiles, and lyric assignments.
- Source credits and in-video labels corroborate identity when available but are not required for the workflow.
- The result uses `unknown` or requests review when visual mapping conflicts or remains weak.
- Outfit evidence remains usable even when identity remains unknown.

### Exact-video DBKpop page

Starting state: DBKpop has a member-labeled page for the supplied video.

Assertions:

- The agent proves that the page covers the exact target through a linked video ID or several matching frames.
- It inspects at least two clear images for each claimed member and treats the page as one third-party assertion.
- DBKpop supplies a provisional mapping rather than automatic high confidence.
- High confidence requires independent member-labeled visual corroboration and clear target-video continuity.
- DBKpop-only mappings cannot exceed medium confidence.

### Missing or conflicting DBKpop page

Starting state: DBKpop has no matching page, covers another edit, omits a member, or conflicts with another credible source.

Assertions:

- Searches use the target fingerprint, group, song title, and member roster without appearance assumptions.
- Official and broadcaster member-labeled sources outrank unrelated profiles and third-party galleries.
- Conflicts lower confidence or preserve `unknown` rather than being resolved by source count.

### Ambiguous Group Shot

Starting state: Several coordinated performers and backup dancers appear in similar clothing.

Assertions:

- Uncertain identities remain unknown or carry explicit confidence.
- The final report does not let backup dancers dominate featured-artist results.
- Outfit grouping cites visible evidence and timestamps.

### Camera Cut Near Candidate

Starting state: A coarse overview suggests one artist at a timestamp, but the camera cuts to another person within the surrounding second.

Assertions:

- The skill verifies the selected source frame rather than trusting a nearby overview image.
- The final reference preserves the source timestamp rather than relying on frame-index arithmetic.
- The final selection identifies its view purpose and is assigned to the person actually visible.

### Missing Ideal View

Starting state: The broadcast never supplies a clean solo standing full-body shot for one artist.

Assertions:

- The skill selects the strongest available group, side, rear, or final-pose evidence.
- The report states that the ideal view was unavailable rather than implying complete coverage.

### Competing frame candidates

Starting state: Several frames provide the same view, but they differ in sharpness, subject scale, obstruction, or overlays.

Assertions:

- The final set keeps the clearest candidate with the best original subject scale for that view purpose rather than the first acceptable frame.
- A weaker frame remains only when it adds evidence unavailable more clearly elsewhere.
- The comparison does not impose a fixed score, extraction cadence, or required frame count.

### Blurred baseline frame

Starting state: The one-second baseline captures a useful scene, but the performer or garment is motion-blurred.

Assertions:

- The model locates the containing shot, then inspects every decoded frame in a bounded window around each useful composition.
- It expands beyond one second when a continuing push-in or composition change produces a better view.
- Objective metrics form a diverse shortlist but do not select the winner.
- The selected frame retains its decoded source PTS.
- Dense extraction remains local to useful or ambiguous periods rather than expanding across the full video by default.

### Purpose-specific neighborhood selection

Starting state: One shot contains a distant full-body composition and later pushes into a close upper-body composition.

Assertions:

- Full-body, upper-body, and lower-body candidates are compared independently.
- The upper-body result uses the naturally closer source composition rather than a tighter crop of the distant full-body frame.
- Before reusing a frame across evidence groups, the agent confirms that no stronger purpose-specific composition exists nearby.
- The agent opens every final crop and rejects blurred, miscentered, crowded, or incomplete results.

### Shopping Follow-up

Starting state: The user has approved the artist and outfit grouping and asks where to buy the jacket.

Assertions:

- Observed garment details remain separate from inferred details.
- Exact matches and similar alternatives are labeled separately.
- Product candidates retain source links, observation time, matching evidence, and confidence.

## Paired Evaluation

Compare the skill against the unskilled model using the same ordinary user prompt, source, model, effort, and environment. The baseline must not have access to or load the skill. Do not prescribe an extraction method in either prompt.

Treat these as hard acceptance gates:

- every claimed identity maps to the correct visible performer or remains `unknown`;
- every featured performer is represented;
- every distinct outfit is represented.

Score accepted results on final-frame sharpness and subject scale, complementary garment coverage, provenance, uncertainty, turns, latency, and estimated cost. Observe the chosen method without scoring conformance to a preferred workflow. Classify differences as skill benefit, skill harm, model variance, evaluation defect, environment noise, or inconclusive evidence before revising the skill.

## Recorded outcomes and limits

The original skill loaded successfully from the project-local OpenCode source. On public fixture `5cfNIoFkyoc`, one purported baseline was contaminated because the general agent loaded the skill. A second general-agent baseline did not load the skill and independently found useful garment frames, but reversed Rui and Wumuti after trusting indirect lyric attribution over visible broadcast labels.

The redesigned skill then ran on the same fixture with `openai/gpt-5.6-sol#medium`. It loaded through ordinary model invocation, used its own broad-to-dense review strategy, correctly mapped Rui and Wumuti through direct broadcast labels, represented both outfits, and produced nine useful source-resolution references. It passed all hard gates in 23 turns at an estimated $1.2904328. The no-skill baseline failed identity mapping in 29 turns at an estimated $2.326556.

The next run used `dZs_cLHfnNA`, a 228-second LE SSERAFIM video with five members and ten styling sets. It found all ten outfits and produced member-specific crops, but most primary full-body crops came from one shared frame and all party crops came from one green-lit group frame. It used 47 Sol-medium turns and cost an estimated $3.6201184. This run motivated the one-second baseline and versioned evidence package. It did not test that contract because the contract was added afterward.

A contract-guided rerun on the same fixture used 39 Sol-medium turns and cost an estimated $2.6691656. It produced the complete 228-frame baseline, retained official member-labeled references, and created 36 indexed final crops with checksums and crop bounds. It incorrectly mapped Sakura to the capped performer, mapped Huh Yunjin to the chain-trim outfit, and missed Kazuha's second outfit. The run also capped acquisition at 1080p despite an available 4K stream, combined independently searchable pieces, and copied requested timestamps into PTS fields without trace evidence that it read decoded source PTS. The acquisition rule, piece contract, and PTS field names were tightened from these failures. This run predates the final version 1 schemas and does not conform to them.

The three-view retest used 47 Sol-medium turns and cost an estimated $5.533396. It acquired the untranscoded 4K source, produced all 228 baseline frames, represented all ten outfits, and conformed to the full-body, upper-body, and lower-body schema. It correctly left unsupported finale views empty. The run still failed acceptance because DBKpop alone supported its high-confidence identities, several final crops were crowded or miscentered, some upper-body crops were blurred, and the overview files were not useful grids. It also copied requested seconds into source PTS fields without evidence that it read decoded PTS values. Repeated failed contact-sheet commands increased cost.

The earlier runs establish only the partial results described above. Invocation on adjacent prompts and product research remain untested. Some three-view schema conformance and outfit discovery were reported, but end-to-end evidence-contract acceptance, decoded PTS provenance, and evidence quality remain unproven. The latest DBKpop corroboration and all-frame neighborhood-selection revisions have no recorded full-workflow retest here.

The historical entries identify fixtures, model effort, costs, and evolving contracts, but do not supply exact skill commits, OpenCode versions, or retrievable run paths for every observation. The owning project had no resolvable HEAD during read-only source inspection on 2026-09-07. These limitations prevent an exact revision-bound reproduction from this record alone; do not treat the reported outcomes as independent approval. No media acquisition, runtime execution, schema validation, or live model test was performed in this maintenance pass.
