# Implementation record

## Cooperative redesign — 25 October 2026

The owner clarified the intended game as multiple heroes teaming up against one large boss. The current implementation replaces human boss possession with 2–4 private hero sessions, server AI, scaled shared boss HP, paired-hit Aegis openings, coordinated Overdrive bursts, teammate rescue, and shared outcomes. All heroes render together with personal controls and health. Reality Breach now uses optional local camera video per device. The design/phases are in [COOPERATIVE_RAID.md](COOPERATIVE_RAID.md).

Current validation: 69 unit/network tests, strict TypeScript, and the production build pass. All nine cooperative browser scenarios passed in the final combined run (5.7 minutes), including two complete human-role matches and four-hero combat. A public HTTPS check verified independent identities, invitations, assets, blocked solo damage, and paired shared damage. Physical gesture/device rehearsal remains unverified.

## Earlier implementation — 24 October 2026

The starting workspace was empty. The supplied blueprint was analyzed and divided into the six dependency-ordered phases in `IMPLEMENTATION_PLAN.md`.

| Phase                    | Delivered                                                                                                                                                        | Evidence                                                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1. Foundation and combat | Shared Zod contracts and registries, React/Vite client, Phaser scene, Node server, deterministic combat, complete outcomes and training opponent                 | Combat tests and browser win/loss paths                                                                         |
| 2. Rooms                 | QR/code invitations, one slot per role, private resume credentials, ready gate, snapshots, host-only start/rematch, expiry, pause/reconnect                      | Real Socket.IO integration and independent browser contexts                                                     |
| 3. Motion                | Local camera consent/lifecycle, pinned pose/hand model assets, calibration, confidence checks, smoothing, gesture deduplication, manual fallback                 | Landmark fixtures, browser tracker initialization, denied-camera test; physical tuning still requires rehearsal |
| 4. Reality Breach        | Server-driven threshold transition, mirrored live boss video, one-way WebRTC, stale-candidate generations, stream recovery, transparent scene, aim and hit zones | Synthetic live camera transported between separate browser contexts, targeted damage and stop-camera cleanup    |
| 5. AI and themes         | Strict Responses API integration, three curated encounters, supported mechanics, bounded text/numbers, source labeling, timeouts/refusals/fallback               | Mocked API success/failure tests and contrasting in-browser worlds; live API call requires a key                |
| 6. Delivery              | Responsive original artwork, hit effects, audio/mute, accessible controls, fullscreen, recap export, deployment instructions, demo script, screenshot evidence   | Production build, visual QA, unit/integration/browser suites                                                    |

## Quality decisions and fixes

### 3D upgrade

Replaced the Phaser stage with Three.js 0.186.1. The battle now uses authored articulated mesh fighters, a raised hex-tile arena, a shader rift, dimensional environment silhouettes, directional and point lighting, shadows, animated projectiles, impact particles, and defensive shields. All three curated worlds retain their colors and encounter mechanics. Duel and Overlook cameras offer two perspectives. Reality Breach keeps the 3D miniature hero and exact normalized aiming over the boss's live video.

Rigid mesh batching, instanced floor tiles, capped pixel density, automatic detail reduction, and full GPU resource cleanup keep the scene suitable for desktop and mobile browsers. Graphics interruption is recoverable; missing WebGL 2 is explained in the UI. Combat, networking, motion recognition, and camera consent remain in their existing authoritative/lifecycle systems. The original phase record above describes the initial implementation; this upgrade supersedes its Phaser renderer.

Browser verification exposed a pre-existing lobby recovery issue: a refreshed host waited for both players even before a boss had claimed the room. Rooms now remember whether the boss slot has been claimed, restore an unclaimed waiting lobby immediately, and reserve claimed roles for their resume credentials. A real-socket regression covers refresh, retained readiness, first boss joining, and starting the match.

3D validation: strict TypeScript and production builds pass; **37 unit/network tests and nine browser scenarios pass**. Browser evidence includes both camera angles, all three encounter themes, context loss/restoration, complete wins/losses, replay, and two independent players with synthetic live video and targeted breach damage. The HTTPS phone link was separately checked for assets, invitations, shared combat, and signaling. The lobby refresh fix was also verified in the actual public browser session. Physical phone gestures and venue-network video remain manual rehearsal checks.

- Kept gameplay authority on the server and model inference on the client. No AI calls or raw camera frames travel through combat intent messages.
- Used a frozen simulation clock during disconnects so warnings and cooldowns cannot expire invisibly while another player reconnects.
- Added a training opponent with explicit labeling. A missing API key or camera never blocks the core game.
- Kept camera and attack geometry in a shared mirrored/cover transform; damage targets lock at attack acceptance.
- Added CPU fallback if GPU tracker creation fails and cleanup for replaced cameras, streams, model instances, timers, and peer connections.
- Browser visual review found a clipped narrow-screen headline despite the document having no horizontal scroll. The responsive typography was corrected and a geometric assertion was added.
- Keyboard input continues after a touch button receives focus. Result wording distinguishes the winner's role.
- Used original procedural art and local fonts. MediaPipe models/WASM are downloaded once and served locally.

## Free movement and motion expansion — 25 October 2026

The subsequent upgrade replaces lane-bound play with authoritative world movement, sprinting, a touch joystick, input release/stale-input stopping, melee reach, locked world damage zones, jump evasion, kicks, and a pursuing training opponent. The live-video hero also moves in two dimensions. Calibrated body lean/depth, hands-up Overdrive, one-hand Jump, knee Kick, and hero hand-mode controls are documented in [CONTROLS.md](CONTROLS.md) and the in-game guide.

The renderer now uses smoother articulated rigs, original grain/bump textures, environment reflections, organic stone, braziers, and separate thunder/flame/moon/claw/orb/wave effects. Outcome panels explicitly show Mission Passed/Failed for each player's role. Both views prepare before combat's countdown; shader preloading avoids first-cast compilation, and slower renderers reduce detail. Real-person gesture precision and physical-device rendering performance remain rehearsal checks.

Final upgrade validation: **46 unit/network tests and all 10 browser scenarios passed**. Strict TypeScript and the production build passed. The browser suite exercised two complete human-role matches, walking/running and stopping, jump/kick, accepted elemental Overdrive and damage, exact instructions, synthetic live-video breach, real target hits, reload recovery, both outcomes, mobile controls, rematch, and graphics-context recovery. Public HTTPS assets, invites, shared combat, and media signaling also passed a separate check; TURN is not provisioned.

## Earlier audit and remaining external validation

An independent audit after the original build's completed handoff fixed camera
control preferences resetting between lobby and battle, added pending capture
cancellation, bounded result-screen reconnect recovery, and made invalid target
acknowledgments explicit. That earlier build passed 30 unit/network tests and eight
browser scenarios; the expanded two-player scenarios were also rerun successfully.
See [QA_AUDIT.md](QA_AUDIT.md) for evidence, scope and remaining manual checks.

Original build validation: production build and strict TypeScript checks pass; **25 unit/integration tests and 4 browser scenarios pass**. The production dependency audit reported zero known vulnerabilities at installation. Nine screenshots capture desktop/mobile setup, combat, synthetic video breach, and both outcomes. The optional Windows launcher and Docker recipe are included; Docker itself was not exercised here.

The software does not substitute automated success for physical evidence. Real-body gesture tuning, a real Android/HTTPS/venue-network session, a live OpenAI request with the user's key, and an uninterrupted consenting two-person demo recording remain external rehearsal steps. No public deployment, footage of a participant, or guaranteed hardware/network performance is claimed.
