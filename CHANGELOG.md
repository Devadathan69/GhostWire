# Change log

## 2026-10-25T05:53:36+05:30 — Preserve heroes through a lost reconnect message

- Changed: apps/client/src/networking/session.ts now distinguishes retryable network errors from explicit server rejections. Transient resume failures preserve the private hero identity and automatically retry with controls paused. A version guard cancels stale recovery after leaving, room closure or another accepted session; the server still owns validity and expiry.
- Validation: tests/e2e/resume.spec.ts deliberately drops one real resume message over polling or WebSocket, then confirms the same hero, invite, ready state and one occupied slot recover after the actual timeout. Passed in 10.3 seconds (13.9 seconds including runner startup). All 134 automated checks and the new build/TypeScript also pass. The refreshed public generated encounter is being replayed with the new client; earlier successful public/full-local results remain recorded below.
- Test corrections: wait for server-confirmed combat controls before travel, allow the advertised reconnect window at rematch, and write the success report only after rematch. Capture generated screenshots into each run's isolated report directory; an intermittent Windows error opening a screenshot being reviewed no longer blocks combat checks through a shared documentation path. No combat state or result was forced.
- Replay driving: keep heroes defending from the first active frame, use ordinary map buttons to follow the boss, wait through locked volleys before crossing, and exercise Kick while both heroes are in the boss realm. A later attempt correctly cancelled travel when an idle hero took damage; this correction changes test inputs, without changing travel cancellation or boss rules. Final refreshed replay remains in progress at this checkpoint.
- Documentation: README, test plan and live verification distinguish timeout recovery, permanent rejection, exact generated controls and real-phone versus synthetic coverage. Human code review and broader physical device coverage remain unconfirmed.

## 2026-10-25T05:47:14+05:30 — Reduce phone traffic and verify generated multiplayer combat

- Changed: shared/server/client snapshots now send live state and a hero selection index, reusing the complete blueprint delivered on create/join/resume. Selections survive rematch and standard presets remain supported. A public two-hero sample decreased from 13,454 to 2,901 bytes per update (about 78%); this reduces repeated generated descriptions, powers and appearance data on phone connections.
- Phone presentation: corrected the narrow-screen grid's selector precedence, wrapped long generated power names and kept key labels visible. Saved actual generated-world, mobile, breach and victory screenshots; updated README, controls, test plan, submission scope and the live-AI verification record.
- Validation: all 134 unit/network/creator/motion checks in twelve files pass, including 2–4 hero compact-state round trips, duplicate display names, preset compatibility and actual selection updates. Build/TypeScript pass. The local generated three-client raid passed; an isolated public HTTPS replay passed in 2.1 minutes with zero browser errors. Three transport regressions also passed in 2.5 minutes: training victory, two complete human-role raids with camera breach/reconnect/rematch, and a deliberately lost graphics confirmation.
- Follow-up: the final phone layout replay reached shared victory with readable buttons but the host briefly disconnected during rematch while peers returned to the lobby. The browser check now allows the advertised 30-second reconnect window and writes its success record only after rematch assertions. Its isolated rerun follows this entry; no game rule or outcome was forced. Overlapping earlier test processes caused report-artifact errors; clean serial runs use separate output directories.
- Limits: the owner confirmed Doctor Strange and gestures on one physical phone. Full three-client browser coverage uses synthetic media and does not establish every phone, Safari version or lighting condition. One paid generation was used; subsequent replays use its unmodified saved output. Human code review and organizer handoff remain unconfirmed.

## 2026-10-25T05:28:14+05:30 — Confirm readiness recovery and preserve the live-AI milestone

- Validation: the browser test that deliberately drops the first graphics confirmation passed. Existing AI-ally training and two complete human-role matches through camera breach, reconnect and rematch also passed with the updated input pilot (three scenarios in 2.5 minutes). All 129 automated checks and the production build/TypeScript passed before this browser run.
- Transport: the refreshed public protocol probe reached Arena with both heroes ready. Direct-server compression is negotiated by the network regression; Cloudflare's current public edge did not advertise it. The snapshot flow remains correct without that extension.
- Status: live generation, all generated power/gesture regressions and a full local three-client generated raid are verified. The fresh public full-match replay follows this checkpoint. No physical full-team match or broad device coverage is claimed.

## 2026-10-25T05:25:53+05:30 — Verify real gpt-6.1-sol output in cooperative play

- Live generation: one actual application API request succeeded using the owner's private server key and gpt-6.1-sol, completing in 45.8 seconds. Preserved the unmodified public test brief/output as tests/fixtures/ai-avengers.json. Thor, Doctor Strange and Iron Man have distinct equipment, supported powers and keys; Thanos and the rooftop palette/weather/props are generated configuration. No credential or participant data is in the fixture.
- Verification: 129 unit/network/creator/motion checks pass across 11 files, including every generated power and gesture plus actual compression negotiation. TypeScript/build pass. The exact generated encounter completed a three-client local browser raid with all heroes contributing damage, all ultimate effects and named boss attacks, late expansion, camera-backed breach, shared victory and fresh rematch. The owner reported hero rendering and gestures working on one physical phone. This is not a claim of three independently tested physical phones.
- Corrections: imported blueprints now have an honest import label; generated environment and boss move names appear in-game; capes use secondary costume color. Added replay tests without API charges, an explicitly opt-in paid verifier, HTTPS browser-test targeting, and profile-aware test inputs that move and travel for rescues rather than forcing outcomes.
- Network work: a public replay stalled at graphics readiness. Added confirmation retries until the server acknowledges the rendered hero, negotiated WebSocket compression, and replaceable snapshots that skip stale frames under backpressure. A real public two-client protocol probe reached Arena with both readiness flags true and 116ms confirmation latency; a controlled first-message-loss browser regression and full public replay are still being completed.
- Limits: no synthetic test is evidence for every physical phone, lighting condition or Safari version. Physical confirmation is the owner's report; human code review, Docker and organizer handoff remain unverified. Final browser/public results will be recorded separately.

## 2026-10-25T04:56:52+05:30 — Record the published connected-world implementation

- Changed: recorded verified implementation 19e7846a191fdc5e816c3f35b4f0c7982c4c8d25 in SUBMISSION.md, with connected-device realms, creative generation scope, reproducible demo steps, current checks and known limitations. This follow-up changes documentation only.
- Publication: implementation and milestone commits were successfully pushed to Devadathan69/GhostWire main, preserving shared history. No live key, room token or private QR was committed.
- Validation: 90 automated checks, 11 combined browser scenarios (7.7 minutes), build/TypeScript and public HTTPS multiplayer checks passed; final guide/cape cleanup was rebuilt/typechecked. Credential-pattern/local-link and whitespace review passed. Human review, physical-device rehearsal, live API output and organizer handoff remain unconfirmed.

## 2026-10-25T04:55:32+05:30 — Complete connected-world and creator verification

- Changed: protected a living reinforcement from premature squad-wipe failure while its graphics load; reset boss roaming relative to the raid opening; reduced graphics warmup to used effects; added arrival-loading feedback and visible-region diagnostics. Honored custom boss equipment/headgear/cape and the specter cape option, avoided discarded preview weapon geometry, and clarified custom versus preset controls.
- Validation: all 90 rules/network/creator/motion tests pass in ten files. Production build and TypeScript pass. All 11 browser scenarios passed in one combined run (7.7 minutes), including complete human-role raids, camera breach/reconnect/rematch/outcomes, four-player combat, separate realms/watch/travel/boss arrival, a third live device, editable preview/save/hero selection, no-key/duplicate-control errors and a remapped key reaching combat. Subsequent guide wording and cape-checkbox cleanup were rebuilt/typechecked; they change no tested raid mechanic.
- Public check: the refreshed HTTPS service passed assets, invitations, private identities, solo shielding, paired damage, AI, travel and live expansion. One temporary tunnel restart failed its readiness check; retry succeeded. The verifier now crosses after a volley because real damage cancels travel as designed. Live room tokens/QR data stay ignored locally; screenshots committed here use synthetic test rooms or a non-private template preview.
- Documentation/evidence: updated setup, phases, phone/demo/controls/verification guides, provenance and AI-assistance records; captured connected-realms, mobile expansion, creator and custom-raid evidence. Repository review found zero credential-pattern files and zero broken local Markdown links.
- Limits: no OPENAI_API_KEY was supplied locally, so real gpt-6.1-sol generation/account access remains unverified. The playable local blueprint path is explicit. Procedural parts/effects do not create exact film meshes or new gesture detectors. Physical phones/gestures, human review, venue conditions and Docker remain separate checks. Temporary access needs an awake connected laptop.

## 2026-10-25T04:39:50+05:30 — Verify the world/creator milestone and refine playability

- Validation: all 88 unit/network/creator/motion tests and TypeScript pass. The production build passed before the final server cancellation refinement, which is covered by an added regression and will be rebuilt for release. Eight original browser scenarios passed in the first run; its movement case now passes separately on the refreshed build. World/creator browser checks remain in progress.
- Corrections: local-template weapon selection, remote Kick feedback, long-form grid overlap, creator lighting/weather, compact phone world-map access, late graphics timeout, cancellation propagated to OpenAI, and a two-request generation concurrency limit. The initial world browser assertion expected the boss to remain after a reinforcement joined; it now checks invasion before that join, since roaming is intended.
- Scope and limits: connected realms and editable procedural 3D generation are implemented. No API key is configured locally, so live model generation is not claimed. Physical motion/phone performance and human code review remain pending. Final browser/public results will be recorded separately.

## 2026-10-25T04:34:47+05:30 — Add connected device realms and the creative forge

- Changed: one owned realm per human device, region-scoped combat/collisions/revives, rift support attacks, channeled hero travel, telegraphed boss invasions, live reinforcements with proportional boss scaling, dynamic 3D actors, and a world map with watch/travel/invite controls.
- Creator: added server-side gpt-6.1-sol Responses Structured Outputs, strict editable hero/boss/environment schemas, explicit local blueprints, 3D preview/editor, per-player hero selection, custom power keys/gestures/recharge/damage and supported elemental animations. No API key is exposed to the browser or committed. Reused existing dependencies and documented official API sources in docs/EXPANDING_WORLDS.md.
- Validation: 87 unit/network/creator/gesture tests pass across ten files; TypeScript passes. An earlier production build passed. Browser verification is in progress: camera lifecycle, AI-ally victory, two complete human-role raids with breach/reconnect/rematch, and four-hero combat passed. The movement scenario found a remote Kick presentation issue; the UI now explains that travel is required, with its browser regression pending a fresh build.
- Limits: live AI generation is not verified because no local API key is configured. Procedural 3D parts/effects do not establish exact film assets or arbitrary pose recognition. Physical gestures/phones, venue conditions and human review remain unverified. Final browser/public checks will be recorded after completion.

## 2026-10-25T01:16:13+05:30 — Record the published cooperative implementation

- Changed: recorded final cooperative implementation SHA `2cfb7e827e6de6b99a5617ca2710270b952588af` in `SUBMISSION.md`, with current team mechanics, setup, checks, and limitations. Updated the AI/publication record. This follow-up changes documentation only.
- Publication: the verified implementation was pushed successfully to the owner's submitted `Devadathan69/GhostWire` repository on `main`, preserving its existing history and milestone commits.
- Validation: build/TypeScript, 69 unit/network tests, all nine browser scenarios, and public cooperative HTTPS checks passed before this documentation update. Staged whitespace and local-link/credential-pattern review passed; no new runtime result is claimed for documentation-only work.
- Limitations: participant human review, real-person gestures/physical devices, and organizer confirmations remain unverified.

## 2026-10-25T01:14:55+05:30 — Complete cooperative release verification

- Validation: final production build and strict TypeScript passed; all 69 unit/network tests passed. The final combined browser run passed all nine scenarios in 5.7 minutes: camera lifecycle, real movement/powers, AI-ally victory/recap, two full human-role matches with synthetic local-camera breach and graphics-ready reconnect, four-hero combat/capacity, real team defeat, replay, and graphics recovery.
- Public test: the refreshed HTTPS build passed model/WASM assets, invitation origins, private independent hero identities, zero solo shield damage, shared paired damage, and AI target selection. The host lobby is ready for teammates; live room data remains ignored locally.
- Documentation/evidence: completed the current cooperative design, controls, implementation/verification record, and QA screenshots. Publication review covered 119 candidate files with zero credential-pattern matches or broken local Markdown links. Existing repository history remains preserved.
- Limitations: camera sources/landmarks were synthetic. Human review, physical gesture/device rehearsal, live OpenAI output, and Docker remain unverified. The temporary phone URL requires the laptop to stay awake.

## 2026-10-25T01:08:50+05:30 — Protect returning heroes and verify complete cooperative raids

- Changed: reconnect/takeover now waits for the returning hero's first rendered frame before resuming the squad; existing views acknowledge without reloading. Added a 4.5-second rescue opening when a hero falls, squad state feedback, and a regression for finishing that rescue. Updated current controls, verification matrix, implementation record, and cooperative screenshots.
- Why: prevent boss damage while a returning device is compiling graphics, and give two-hero squads time to rescue an ally. Browser controls are driven through the same DOM keyboard handlers with mobile/manual fallback and real authoritative server combat.
- Validation: all 69 unit/network tests, strict TypeScript, and the production build pass. Eight browser scenarios passed, including four independent hero views dealing shared scaled damage; the final two-human scenario then passed separately with local synthetic-camera breach, navigation disconnect, graphics readiness, two complete victories, and fresh rematch readiness. A final combined nine-scenario run is in progress.
- Limitations: synthetic media/landmarks do not establish real-person recognition. Physical phone/Safari performance and live encounter generation remain manual checks. No permanent host or spatial room reconstruction is claimed.

## 2026-10-25T00:48:06+05:30 — Verify squad rules and refine coordinated combat

- Changed: capped overlapping zones from one Cataclysm to one hit per hero, tuned raid damage, and made final-tick damage interrupt revives. Cameras stop automatically at a team outcome. Removed obsolete peer-video code and TURN setup; migrated current controls, phone/demo guides and public-link checks to local-camera cooperative play.
- Validation: all 68 unit/network tests and strict TypeScript pass. The first browser run passed camera preferences/cancellation/retry, four-hero capacity, and mobile camera denial with a real defeat. It exposed idle-test and sequential-network timing issues; complete-match/movement scenarios are being corrected and rerun before handoff. Public HTTPS independently verified assets, invitations, independent hero identities, blocked solo damage, and shared paired damage.
- Limitations: the full cooperative browser suite is not yet passing; final build and browser validation will be recorded separately. Real-person gestures and physical-device rendering remain manual checks.

## 2026-10-25T00:42:36+05:30 — Convert the game into a cooperative squad raid

- Changed: replaced hero-versus-human-boss rooms with 2–4 privately owned heroes against one server AI boss. Added scaled shared boss HP, Soul Aegis requiring two distinct attackers, six-second openings, paired Overdrive Unity Bursts, personal health/defenses, downed/rescue/bleedout, team wipe/time-limit outcomes, leader transfer, reconnect and replay gates.
- Presentation: cooperative home/lobby, independent colored/name-tagged 3D heroes and spells, shared boss/team HUD, revive controls, exact hero/motion guide, and team results. Reality Breach now uses each hero's optional local camera; removed peer-video transmission.
- Why: implement the owner's intended team-against-one-boss game. A main raid cannot start solo, and solo attacks cannot break the boss shield. AI-ally training is explicitly labeled.
- Validation: strict TypeScript and production build passed; all 66 unit/network tests passed. Added 20 cooperative-rule tests and migrated room/recovery coverage. The cooperative browser regression and public HTTPS check are running and will be recorded separately.
- Limitations: real-person motion and physical phone/Safari rendering remain unverified; camera fixtures are synthetic. No permanent hosting or room reconstruction is claimed.

## 2026-10-25T00:19:16+05:30 — Record the published movement and motion revision

- Changed: recorded implementation revision `aaaa3b02540e059a83d337760caacfde5b95fb3c` and the upgrade's final scope and verification in `SUBMISSION.md`; updated the AI record. No game code changed.
- Publication: the implementation and its preceding milestone were pushed successfully to the submitted `Devadathan69/GhostWire` repository on `main`, preserving its history.
- Validation: final production build/TypeScript, 46 unit/network tests, all 10 browser scenarios, and public HTTPS/network checks passed before this documentation update. Publication review covered 101 candidate files, with zero credential-pattern matches and zero broken local Markdown links; staged whitespace passed.
- Limitations: physical-device/real-person rehearsal and human review remain pending; no additional runtime result is claimed for this documentation-only commit.

## 2026-10-25T00:17:33+05:30 — Finish graphics loading, input precision, and full regression

- Changed: preload character, shield, and power shaders before the renderer-ready signal and after graphics recovery. Shift/touch RUN now also applies to motion movement; opening instructions resets touch input. Index-up Jump requires an upward finger, and raised-hand actions use a real above-head threshold.
- Why: avoid a first-cast shader pause, stop movement safely during instructions, and match the exact gesture guide. Updated demo/phone instructions and synthetic-camera/screenshots evidence.
- Files: client renderer, movement pad/hook, gesture classifier and app wiring; browser scenarios; README, implementation/test/demo/phone docs and screenshots.
- Validation: 46 unit/network tests passed, all 10 browser scenarios passed (6.4 minutes), and the final strict TypeScript/production build passed. Public HTTPS model assets, invitations, shared combat, and media signaling passed a separate check. Browser camera sources were synthetic.
- Limitations: physical gesture tuning, physical phone/Safari performance, live OpenAI output, and venue-network video remain manual checks. TURN is configurable but not provisioned. Temporary HTTPS access depends on the running laptop.

## 2026-10-25T00:05:29+05:30 — Add free movement and richer motion combat

- Changed: replaced lane movement with authoritative free walking/running for both arena fighters and two-axis movement over Reality Breach. Added a touch joystick, input-release/stale-input stopping, melee reach, locked world-space attack zones, jump evasion, kicks, and a training boss that follows the hero.
- Motion: added calibrated body movement, hero hands-up Overdrive, one-hand-raised Jump, knee Kick, and hero One hand mode with palm movement, swipe, pinch, fist, and index-point gestures. Added exact in-game and Markdown controls guides.
- Presentation: smoother articulated armor/creature rigs, animated knees/elbows/cape, textured PBR surfaces, environment reflections, organic terrain, braziers, elemental casts/impacts, and full-screen role-specific Mission Passed/Failed results. Combat waits for both renderers before its countdown; slower devices reduce detail.
- Files: shared contracts, server combat/networking, client tracking/input/rendering/components/styles, movement/gesture/network/browser tests, README and docs.
- Validation: strict TypeScript and production build pass; 46 unit/network tests pass. Initial targeted movement and graphics-recovery browser scenarios passed; the complete updated browser regression is in progress and will be recorded separately.
- Limitations: physical gesture accuracy, physical phone/Safari performance, live OpenAI output, and venue-network media remain unverified. This is an authored browser 3D upgrade, not a claim of photographic fidelity or spatial room reconstruction.

## 2026-10-24T23:38:29+05:30 — Record the implementation revision

- Changed: recorded implementation commit `80df2ad32fd8206e66c3b187d750d21bab0d59a1` in `SUBMISSION.md` and updated the AI/publication record. Game code is unchanged.
- Why: let reviewers identify the exact implementation independently of this follow-up documentation commit.
- Validation: reviewed 91 publishable files, found zero credential-pattern matches and zero broken local Markdown links, and passed the complete staged whitespace check. The existing submitted repository history is an ancestor of the implementation commit.
- Publication: implementation commit `80df2ad` was pushed successfully to the submitted repository's `main` branch; this subsequent commit records its SHA and publication status.
- Limitations: the participant's human review, physical demo, and organizer confirmations remain unverified; no additional runtime test result is claimed for this documentation-only update.

## 2026-10-24T23:35:48+05:30 — Publish the playable 3D Reality Raid implementation

- Changed: added the completed local game in `apps/` and `packages/`, reproducible setup/phone-test scripts, pinned dependencies and model assets, tests, licenses, screenshots, and implementation/demo documentation. Completed project details in `README.md`, `SUBMISSION.md`, and `AI_USAGE.md`; combined local ignores with the submitted template's credential/cache exclusions.
- Why: publish the playable game, including the requested 3D upgrade and two-player phone support, to the repository the owner submitted: `Devadathan69/GhostWire`.
- Behavior: authoritative hero/boss rooms, solo training, gesture/manual controls, three 3D worlds and two camera views, live-video Reality Breach, encounter configuration, results/rematch, and reconnect recovery. The waiting lobby survives a host refresh before its first boss joins.
- Validation already completed: production build and strict TypeScript passed; 37 unit/network checks and nine browser scenarios passed. The two-player camera/breach scenario passed again after the lobby fix. A separate public HTTPS check verified assets, invites, two-player shared combat, and media signaling.
- Repository history: this is an import of completed local work on top of the existing submitted repository. Earlier local implementation commits did not exist; no timestamps or milestone commits were fabricated, and shared history is preserved.
- Limitations: browser camera evidence is synthetic; physical phone gesture accuracy, venue-network media, live OpenAI generation, Docker, and physical Safari/iOS remain unverified. The temporary phone link requires the laptop to remain running; no permanent hosting is claimed. Human review and organizer eligibility/submission confirmations remain with the participant.

## 2026-10-24T21:53:05+05:30 — Correct Devin Hack Kochi event guidance

- Changed: corrected the current event name and AI tool guidance in `.github/pull_request_template.md`, `AGENTS.md`, `AI_USAGE.md`, `CHANGELOG.md`, `README.md`, `RULES.md`, `SUBMISSION.md`.
- Why: the organizer shared an older event template; Devin Hack Kochi has no
  major AI usage constraints and the template must not require a particular AI provider.
- Scope: preserved project implementation and historical assistance records.
- Removed obsolete template logistics, participation limits, and credit promises; current organizer instructions remain authoritative.
- Validation: reviewed documentation diffs, checked whitespace with `git diff --check`, and checked local Markdown links for new breakage.
- Limitations: maintainer review is pending; application tests were not run for this documentation-only correction.

Record each meaningful project change during the event, newest first. Update this file in the same commit as the change. Use a real timestamp with timezone, for example `YYYY-MM-DDTHH:MM:SS+05:30`.

## Event build log

The implementation import is recorded above. The detailed local phase and verification record is in [docs/IMPLEMENTATION_LOG.md](docs/IMPLEMENTATION_LOG.md). The following format remains available for future changes:

```text
## <actual timestamp> — <short change title>

- Changed: <feature or files changed>
- Why: <reason for the change>
- Validation: <commands or manual checks actually run, with results>
- Limitations: <known issues or "None identified in these checks">
```

## Template setup — 10 October 2026

- Changed: Added the event README, rules, agent guide, change log, AI usage record, submission checklist, Git ignore rules, and pull request checklist.
- Why: Give participants a consistent starting point for event rules, basic coding patterns, documented changes, and regular commits.
- Validation: Checked local Markdown links, event detail consistency, required documents, and diff whitespace before publishing.
- Limitations: Documentation scaffolding only; no participant project, application, or working demo is included. GitHub publication and template status are verified separately after creation.
