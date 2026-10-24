# Change log

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
