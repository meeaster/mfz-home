# Historical experiments and decisions

This untracked user-owned history is retained in full. Consult it when revisiting identity research, evidence packaging, frame selection, tool boundaries, or model-cost tradeoffs. Entries record their dated state; mandatory scouting, piece-specific crop folders, and other superseded mechanics are not current requirements. [VISION.md](VISION.md) preserves current priorities and [EVALS.md](EVALS.md) separates expectations from recorded outcomes. Future edits need not append a log entry.

## 2026-09-05: Project-local, model-invoked skill

The runtime skill lives under the project's `.opencode/skills/` directory so OpenCode discovers it only while working in the project. Model invocation is appropriate because users may request outfit analysis without remembering the skill name.

## 2026-09-05: Deterministic media boundary

Early skill runs may invoke media tools directly and must record those commands and outcomes. Repeated, fragile, or invariant-owning operations then move into tested Node project commands. The skill retains visual judgment, ambiguity, user review, and later shopping research.

## 2026-09-05: Minimal initial toolchain

The first slice requires Node, FFmpeg, and ffprobe. yt-dlp is required only for URL intake, preserving a local-file path that can be developed and tested independently. Additional image and vision dependencies remain deferred until observed evidence supports them.

The Personal Mindframe-Z profile pins FFmpeg 8.0.1 and yt-dlp 2026.08.19 through Mise. Project instructions depend on command behavior rather than making this Personal provisioning method part of the portable skill contract.

## 2026-09-05: First exploratory video run

Public fixture `5cfNIoFkyoc` showed that a coarse two-second overview efficiently maps a short performance, but nearby camera cuts and motion make dense one-second neighborhoods necessary before canonical extraction. Dense strips need absolute timestamps. Identity evidence must remain separate from outfit evidence, and reports must state when the edit lacks an ideal clean view. The repeated overview and neighborhood FFmpeg operations are the strongest first Node-script candidates.

## 2026-09-05: Cost-aware shard scouting

Broad coverage takes priority over minimizing candidate images. Deterministic sampling will represent the complete timeline, and dedicated Luna `outfit-scout` children will classify bounded contact-sheet shards. The parent retains cross-shard identity, garment interpretation, final evidence acceptance, and escalation. One confirmed Luna-medium 16-tile shard cost an estimated $0.00647132 under current models.dev prices; this supports continued evaluation but does not establish the optimal shard size or effort.

A subsequent frozen comparison on the same shard selected Luna high for `outfit-scout`: high was more conservative and internally consistent than xhigh and max, while max cost more and introduced visible classification regressions. This remains a one-fixture routing decision.

## 2026-09-05: Separate timeline images from scouting sheets

The enhanced 1080p YouTube stream for `5cfNIoFkyoc` measured about 3.87 Mbps, compared with 2.43 Mbps for the first 1080p stream. The run now keeps 192 lossless source-resolution PNGs at a one-second cadence and 12 derived contact sheets. A sampled one-second frame still contained motion blur, so the workflow uses dense 4 to 8 fps neighborhoods around promising timestamps. Contact sheets remain scouting inputs and cannot serve as final garment evidence.

## 2026-09-06: Model-directed workflow replaces mandatory scouting

Two general-agent runs showed that a capable model naturally uses broad timeline review followed by denser inspection around promising moments. The first run was invalid as an independent baseline because it loaded the skill. The second avoided the skill and still discovered a workable extraction strategy, but reversed Rui and Wumuti after trusting indirect lyric attribution over visible broadcast labels.

The skill now constrains the fragile boundaries rather than the investigation method: identity-to-person evidence, complete-video consideration, source-quality final frames, complementary garment coverage, provenance, uncertainty, and review before shopping research. Fixed cadences, mandatory shard delegation, exhaustive frame grading, and the coverage ledger are removed. The dedicated `outfit-scout` agent is retired. Future mechanics should enter the skill or project commands only after repeated use demonstrates an efficiency or quality gain.

## 2026-09-06: Redesigned skill passes first matched run

A fresh general-agent run loaded the redesigned skill through ordinary model invocation and analyzed the same `5cfNIoFkyoc` fixture as the no-skill baseline. It correctly mapped Rui to black and Wumuti to white using direct broadcast labels, found one continuous outfit per performer, and selected nine source-resolution references. The run passed the identity, featured-performer, and outfit-coverage gates.

The redesigned-skill run used 23 Sol-medium turns and cost an estimated $1.2904328. The no-skill baseline used 29 turns, cost $2.326556, and reversed both identities. Treat the improvement as one-fixture evidence. The next meaningful test needs real outfit changes or a larger cast. The run also repeated direct frame extraction without independently recording actual source PTS or checksums, which strengthens the case for a deterministic `extract` command while leaving the model-directed workflow unchanged.

## 2026-09-07: Web-first visual identity research

The first fixture contained unusually useful broadcast name captions. Those captions fixed the baseline's reversed mapping, but most videos cannot supply that evidence. The normal identity path now starts with reliable member-labeled visual references from the web, then maps those references to clear video views and tracks each performer through the video. Captions and source credits remain corroboration rather than a dependency.

The failed baseline also used search queries that assumed an outfit-color mapping before verifying it. Identity searches must remain neutral so retrieval does not reinforce an early guess. Third-party profiles and lyric assignments cannot establish identity by themselves.

## 2026-09-07: Compare final candidates by purpose

The first redesigned-skill run produced a useful evidence set, but some final frames had overlays, crowding, or blur despite stronger alternatives elsewhere in the video. The final validation step now compares candidates that serve the same view purpose and keeps the clearest one with the best subject scale and least obstruction. A weaker frame remains valid when it provides unique evidence, such as the only available back view. The skill does not prescribe a scoring formula, extraction cadence, or frame count.

## 2026-09-07: Versioned evidence package and coverage floor

The `dZs_cLHfnNA` run found five LE SSERAFIM members and two outfits per member, but most full-body crops came from one shared frame and every party crop came from one green-lit group frame. The 47-turn Sol-medium run cost an estimated $3.6201184. It proved outfit-change discovery while exposing inconsistent final organization and weak garment-specific evidence.

Every run now extracts one lossless source-resolution frame per elapsed second as a deterministic coverage floor. The model remains free to choose how to review those frames and where to inspect nearby frames more densely. Dense recovery targets useful scenes whose baseline frame is blurred, obstructed, or poorly posed.

The new versioned evidence contract organizes results by member and numbered outfit. It requires one canonical full-frame record per accepted timestamp, lossless source-pixel performer and garment crops, the strongest available full-body evidence, complementary views, an outfit overview, identified pieces with their own evidence folders, and explicit gaps. JSON Schema documents define the run manifest, one-second overview map, and outfit files. Canonical records and crop records preserve timestamps, dimensions, SHA-256 checksums, and crop bounds. This standardizes the product without prescribing the model's visual reasoning process.

The first contract-guided rerun of `dZs_cLHfnNA` produced the complete baseline and organized evidence, but it combined independently searchable items. For example, one record described Chaewon's hoodie, tank, and necklaces, while another combined her layered bottoms and sneakers. The contract now requires one piece record and folder for each independently searchable garment, shoe, or accessory. It also names decoded source PTS explicitly so implementations do not record a requested seek time as observed provenance.

The first contract-guided rerun misread the official member-film comparisons. Huh Yunjin is the capped performer in the tweed jacket, Sakura wears the chain-trim top, and Kazuha wears the floral top before changing into the silver-jacket look. The video therefore contains ten distinct member outfits. The incorrect rerun used 39 Sol-medium turns and cost an estimated $2.6691656.

The rerun capped source acquisition at 1080p even though the fixture offers 4K. The runtime skill and tooling reference now require the highest-quality usable stream without a convenience resolution cap or lossy transcode.

## 2026-09-07: Three standard evidence views

Piece-specific crop folders duplicated much of the same visual information and encouraged records that mixed several garments. The evidence package now has three standard crop groups for each outfit: full body, upper body, and lower body. Each independently searchable piece remains a separate JSON record but references one or more standard evidence IDs.

Frame selection now prioritizes the performer's scale and clarity in the original source image. Cropping removes surrounding noise after selection. It does not turn a distant group view into detailed garment evidence. Front, side, back, and three-quarter orientations are metadata on an evidence item rather than separate folder requirements.

The first three-view retest acquired the 4K source and produced schema-conforming full-body, upper-body, and lower-body records. It cost an estimated $5.533396 over 47 Sol-medium turns. The run failed final acceptance because it used only a third-party identity source, reused unsuitable source frames across view purposes, produced crowded or miscentered crops, generated unhelpful outfit overviews, and did not prove decoded source PTS values. Repeated contact-sheet command failures also raised the cost. The three-view data shape is retained, but its evidence quality remains unproven.

## 2026-09-07: DBKpop identity procedure

A focused investigation found that DBKpop can provide several member-labeled frames from the exact target video and can link an MV entry to its YouTube ID. This makes it a useful provisional identity index. The site publishes no visible editorial or correction policy, so one page remains one third-party assertion. DBKpop-only mappings are capped at medium confidence. High confidence requires independent member-labeled visual corroboration and clear tracking through the target video.

The identity reference now defines target fingerprinting, exact-video verification, internal consistency checks, confidence levels, neutral fallback searches, and the split between deterministic page parsing and model visual judgment.

## 2026-09-07: All-frame neighborhood selection

A focused 4K experiment showed that a useful shot near 45 seconds moved from a distant baseline composition to a stronger full-body view at 47.542 seconds and a stronger upper-body view at 48.667 seconds. A fixed one-second search around the baseline would have missed the close upper-body composition.

Global blur and edge metrics helped form a shortlist but could not choose the winner. Blur favored one frame with visibly blurred hands and another dark transitional frame in the neon sequence. The frame-selection reference now uses broad proxy review to locate a shot, all decoded frames in a bounded local window, metric-assisted diverse shortlists, separate comparison for each evidence purpose, exact-PTS source extraction, and inspection of every final crop.
