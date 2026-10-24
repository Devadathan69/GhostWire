# Verification and rehearsal matrix

## Automated checks

Latest upgrade: **46 unit/network tests and all 10 browser scenarios passed**, along with strict TypeScript and the production build. The public HTTPS check passed assets, invites, shared combat, and media signaling. Physical rehearsal remains separate below.

`npm test` covers the following independent risks:

- Readiness and role gates, attack ownership, anti-replay sequences, cooldown enforcement, telegraph delay, defense timing, damage clamps, victory and defeat.
- A single threshold breach, queue cancellation during transition, phase freeze while disconnected, preserved attack deadlines after resume, targeted collision and misses.
- Three valid presets; rejected unsupported mechanics, out-of-range health and invalid asset values.
- Mirrored widescreen coordinates, portrait/4:3 cover cropping, preserved camera center.
- Perspective projection of authoritative screen anchors and free world positions, at both 3D camera angles and desktop/mobile stage sizes.
- Neutral calibration, required landmark confidence, missing tracking, one punch per extension, held guard and duck.
- Real socket connections: one boss slot, private-token resume, wrong-token denial, host-only starts, shared health, and signaling isolation.
- AI success, no-key fallback, refusal, incomplete responses, schema-invalid output, unsupported actions and upstream errors. The API is mocked in these tests; these are not live model calls.
- Normalized diagonal movement, speed and arena bounds, stale-input stopping, pause/result freezes, both roles moving, melee reach, locked world targets, jump timing, kick damage, two-axis live-feed movement, and renderer-readiness gating.
- Expanded body gestures and hero hand mode: overhead charge, one-hand jump, visible knee kick, mirrored lean/depth movement, pinch, fist, and index-point safeguards.

`npm run test:e2e` runs Chromium against the production build:

1. Solo match from landing to ready gate, combat, breach, victory, PNG recap, and rematch.
2. Hero and mobile-sized boss in independent contexts. Join link, actual camera acquisition using a synthetic device, MediaPipe loading, shared damage, browser reload/resume, real WebRTC transfer, video-backed breach, aimed strike damage, keyboard after touch, stop-camera cleanup, and leave propagation.
3. Narrow mobile layout, a contrasting shadow encounter, denied-camera messaging, and continued manual gameplay.
4. A passive hero genuinely loses; combat controls disappear at zero health.
5. The Tempest 3D arena changes perspective while retaining authoritative world positions; a simulated WebGL context loss shows a recovery message, restoration resumes rendering, and leaving removes the canvas. The existing audit scenarios additionally cover camera cancellation/retry and two complete two-player matches with replay readiness.
6. Real keyboard walking/running, released movement stopping, jump/kick buttons, a rendered elemental cast and resulting damage, and both roles' exact controls guide. The complete browser suite now contains ten scenarios.

Screenshots are generated in `docs/screenshots/`. `breach-synthetic-camera.png` and camera-bearing boss screenshots contain Chromium's synthetic live source, not footage of a person. Traces and temporary browser recordings remain ignored in `test-results/`.

## Required physical rehearsal before submission

These checks cannot be replaced by synthetic landmarks or a local fake camera:

| Check            | Procedure                                                                    | Pass condition                                                         |
| ---------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Hero gestures    | Calibrate in intended lighting; punch ten times at varied comfortable speeds | One deliberate extension produces one strike; neutral produces none    |
| Defenses         | Guard, then duck during separate telegraphs                                  | Reduced damage and evasion at the expected times                       |
| New motion       | One hand overhead, both overhead, then a knee above its hip; return neutral  | Jump, Overdrive, and Kick register distinctly without unwanted repeats |
| Free movement    | Lean left/right, step closer/farther, release joystick and keyboard input    | Correct direction, bounded speed, reliable stopping and sprinting      |
| Boss pose        | Raise, extend, and guard unpredictably                                       | Correct preauthored action follows without repeated accidental attacks |
| Boss hand mode   | Open-palm calibration, lateral swipe, pinch, closed fist                     | Stable aim and predictable action classification                       |
| Lost tracking    | Move wrists out of frame, then return                                        | Input pauses; feedback explains loss; tracking recovers                |
| Camera mapping   | Move hand left/right/top/bottom with portrait and landscape feeds            | Display and attack target agree after mirror/crop transform            |
| Real phone       | Join over the intended trusted HTTPS origin                                  | Camera permission, controls, and video link all work                   |
| Venue network    | Use actual Wi-Fi/cellular path; configure TURN if needed                     | Live video works or failure is explicitly labeled                      |
| Camera lifecycle | Stop, restart, revoke permission, then re-enable                             | Device indicator and remote image reflect the current state            |
| Network drop     | Interrupt a participant for 5 seconds                                        | Match pauses; reconnect preserves health and remaining warning time    |
| Long disconnect  | Stay offline for more than 30 seconds                                        | Both clients exit the expired room clearly                             |
| AI live          | Supply a server key; submit two contrasting custom stories                   | Validated original names and supported visuals; source marked AI       |
| Actual demo      | Record two uninterrupted consenting two-person takes                         | Possession, breach, targeted attack, and finish all visible            |

## Known boundaries

- No claim of measured gesture-to-screen latency or 60 FPS across all devices.
- Inference runs at approximately 15 Hz on the main thread. Heavy phones may need hand mode, a lower visual workload, or manual controls.
- External camera geometry and occlusion are not reconstructed. The game renders 3D meshes over the camera's 2D video image and uses normalized target collision.
- TURN is configurable but no TURN service is provisioned by this repository.
- Browser testing establishes Chromium behavior locally. Safari/iOS and physical Android are not yet certified.
- The optional Docker recipe has not been run here.
