# Independent P0 audit - 24 October 2026

This is a historical audit of the original build. The later 3D upgrade, phone-test setup, and repository delivery are recorded in [IMPLEMENTATION_LOG.md](IMPLEMENTATION_LOG.md), [CHANGELOG.md](../CHANGELOG.md), and [SUBMISSION.md](../SUBMISSION.md).

## Build handoff and scope

The original Codex task, **Implement phased Reality Raid plan**
on the local host completed at
**2026-10-24 16:05:29 UTC**. Supported task status showed a completed turn,
an explicit final handoff, and an idle task before this audit changed files.
A further check at 16:16:18 UTC still showed that same completed turn with
no newer editing turn. No original-builder process was interrupted.

The complete Library blueprint was read: `Pasted text(4).txt`, 653 lines,
46,973 bytes.
Requirements were treated as planned scope, not proof of implementation.
README, implementation phases, implementation log, test plan, demo guide,
runtime sources and tests were inspected. No applicable AGENTS.md or
project .agents/.codex instructions were found.

## Implemented P0 status

- [x] Create/join lobby, QR/code invitation, separate hero/boss roles and readiness.
- [x] Authoritative shared combat, cooldowns, defenses, phase transition and both outcomes.
- [x] Complete two-player match and a second match with fresh readiness, without changing code.
- [x] Keyboard/touch play, three distinct curated encounters, explicit AI fallback labeling.
- [x] Local MediaPipe pose/hand integration, confidence/calibration feedback and manual fallback.
- [x] Boss-to-hero WebRTC, transparent breach stage, mirrored/cropped hand mapping and targeted damage.
- [x] Camera denial/retry/stop/cancellation, reconnect pause/resume, role ownership and expiry.
- [ ] Real-person gesture accuracy and unpredictable hand targeting on physical cameras.
- [ ] Physical phone over trusted HTTPS on the intended venue network.
- [ ] Live OpenAI generation with the user's server-side key.
- [ ] Uninterrupted, consenting two-person demonstration and backup recording.

The last four items are external validation/delivery steps. The checkmarks above
establish implemented code and the automated evidence below; they do not certify
hardware, live API output, internet/NAT connectivity or a real participant's motion.
P1 gesture training/narration and P2 scope were not added.

## Fixes made

1. **Preserved control choices across lobby/battle remounts.** CameraPanel owned
   its motion toggle and tracking-mode state, so entering combat silently enabled
   motion again after a player selected manual controls. Reproduced against the
   original production build: the regression expected an unchecked Motion controls
   box and received a checked box. App now owns these choices. Tests cover manual
   control through transition/camera restart and a boss's selected tracking mode.
2. **Added pending camera cancellation.** The new Cancel camera request button
   uses the existing capture-generation cancellation. A late permission result is
   stopped and cannot activate a camera after cancellation or leaving the raid.
3. **Bound result-screen disconnects.** Victory/defeat previously skipped the
   reconnect deadline. Disconnected roles now have the same bounded recovery window;
   successful return clears it while preserving the outcome and allowing rematch.
4. **Acknowledged invalid boss targets.** Invalid/unauthorized target requests now
   return an error rather than leaving acknowledged requests waiting for a timeout.
5. **Isolated browser QA.** Playwright starts a fresh production server on port
   3211 (override with E2E_PORT), refuses to reuse another server, and applies an
   action timeout. This prevents accidentally testing an older demo process.

Production changes are limited to `apps/client/src/App.tsx`,
`apps/client/src/components/CameraPanel.tsx`, and `apps/server/src/server.ts`.
The original architecture, artwork, dependencies and feature set were retained.

## Final verification

| Command                                                                | Result                                                                            |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `npm.cmd run build`                                                    | PASS: TypeScript, Vite client and bundled Node server                             |
| `npm.cmd run typecheck`                                                | PASS after the final test additions                                               |
| `npm.cmd test`                                                         | PASS: 30 tests in 5 files                                                         |
| `npm.cmd run test:e2e`                                                 | PASS: all 8 browser scenarios, 2.4 minutes                                        |
| `npm.cmd run test:e2e -- --grep "two players finish\|two independent"` | PASS: both scenarios rerun after adding Back/Forward and tracking-mode assertions |

The final production sources were unchanged between the full browser run and
the expanded two-scenario rerun. Source changes were rebuilt before browser QA.
The initial restricted-shell network test failed with loopback EACCES; the
same authorized tests passed with local network access. This was an execution
restriction, not an application networking failure.

Coverage includes stale-role revocation after token resume, wrong-role actions,
cooldown flooding and duplicate sequences, invalid targets, cross-room signaling,
five-second network loss with frozen combat, expired-session cleanup, interrupted
lobby recovery, host-only rematch and readiness reset, both outcomes, two complete
two-player matches, Back/Forward rejoin, camera denial/retry, cancellation and late
capture cleanup, reload recovery, synthetic WebRTC breach and aimed damage,
stop-camera fallback, mobile layout, recap export, and mirrored/cover transforms
at corners and interior portrait/landscape/wide-frame positions.

Expiry tests advance the server deadline to exercise cleanup without waiting
30 real seconds. Gesture tests use landmark fixtures. Camera tests use Chromium's
synthetic device or a generated canvas stream; no physical camera, microphone,
participant recording or personal media was used. AI tests mock the API.

Local screenshots in `docs/screenshots/` were reviewed for the mobile landing
page, mobile boss controls and synthetic-camera breach. They remain local QA
evidence, not a real-person demo. Temporary traces remain ignored in test-results.

## Remaining checks and exact next steps

- **Physical motion:** two consenting participants should calibrate, make ten
  deliberate punches/swipes, test guard/duck, lose tracking and return, and aim at
  all sides of portrait/landscape video. Tune thresholds only from that evidence.
- **Phone/network:** use a trusted HTTPS origin reachable by both devices and test
  the venue network. Ordinary phone LAN HTTP does not enable camera capture.
  Configure TURN only if required and authorized. No tunnel/deployment was created.
- **Live AI:** no .env file or OPENAI_API_KEY was present in the audited environment.
  The user must supply a server-only key, then try two contrasting custom stories
  and verify AI source labeling and valid playable output. No paid API request ran.
- **Submission evidence:** record two uninterrupted, consenting two-person takes,
  including possession, breach, targeted damage and finish. Keep a labeled backup.
- **Git delivery:** Git has no commits and no remote configured. The supplied
  registration receipt names `https://github.com/Devadathan69/GhostWire.git`, but
  nothing was pushed, fetched, reinitialized from a template, or configured remotely.
  Publishing remains a separate authorized action. Docker and physical Safari/iOS
  were not tested.

## Practical local demo

The audit's test servers stopped after QA; port 3211 is free. An existing Node demo
listener remains on port 3001 (PID 60468) and was left untouched. Its loaded server
code predates these fixes. Stop it from its own terminal before starting the rebuilt
server, or use a free port as shown below. No process from another task was killed.

1. In this existing checkout run `npm.cmd start`, then open http://localhost:3001.
   The production build and model assets are already present. For a fresh checkout:
   `npm.cmd ci`, `npm.cmd run setup:models`, `npm.cmd run build`, `npm.cmd start`.
   To leave an existing demo alone, use PowerShell `$env:PORT='3212'`, then
   `npm.cmd start`, and open http://localhost:3212 instead.
2. Choose Emberfall and Create a raid. Open the invitation in an independent local
   browser tab/window, then Possess the boss. Both players choose I'm ready; hero
   chooses Begin raid. Use solo training only when presenting it as training.
3. Hero: J strike, K guard, L evade, Space overdrive, A/D move. Boss: J swipe,
   K guard, Space power; touch buttons also work. Cameras start only after a click.
4. Demonstrate shared HP, cross 50% boss HP, aim a boss strike and finish the fight.
   Without enabled video, describe the labeled virtual fallback honestly. A real
   live-camera demonstration requires specific participant consent.
5. Choose Raid again and ready both roles again. Stop cameras and leave when done;
   stop the manually launched server with Ctrl+C. See DEMO_SCRIPT.md for the
   physical-phone rehearsal and 60-second presentation route.
