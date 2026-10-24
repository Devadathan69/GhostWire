# Live demonstration

Use the actual game with two consenting participants. The synthetic-camera screenshot in this repository is QA evidence only and must not be presented as a human gameplay recording.

## Prepare

1. Start the production build and open the same tested HTTPS origin on laptop and phone. If this is a local two-tab rehearsal, localhost works.
2. Use a laptop for the hero and a stable phone for the boss. Give each participant room for small gestures; seated play is supported through manual controls.
3. Create an encounter. AI generation requires a configured key and edited story text. If using a preset, say “curated encounter.”
4. Scan the lobby QR, join as boss, enable the boss camera, and hold neutral for about 1.3 seconds to calibrate. Body gestures or One hand mode can be selected. Use [the exact controls guide](CONTROLS.md) during rehearsal.
5. Enable the hero camera if demonstrating motion. Confirm the tracking status. Only the laptop should play audio.
6. Walk with WASD/arrows, run with Shift, and demonstrate E Jump and I Kick before combat. On touch use the joystick and RUN. Body movement uses lean left/right and closer/farther camera distance.
7. Run one rehearsal through Reality Breach. Check hand mapping at the left and right sides, move the hero out of a locked warning circle, and finish at a Mission Passed/Failed screen. If the camera fails, use the retry control and inspect HTTPS/TURN setup.

## 60-second route

| Time   | Action                                        | What it demonstrates                                     |
| ------ | --------------------------------------------- | -------------------------------------------------------- |
| 0–7s   | Show story and encounter name                 | Configured AI encounter, or explicitly identified preset |
| 7–14s  | Boss joins and raises/swipes an arm           | A second human drives accepted monster actions           |
| 14–29s | Hero walks/runs, jumps, kicks, and guards     | Free movement, articulated animations, real inputs       |
| 29–36s | Cross 50% boss health                         | Automatic in-engine breach, not edited footage           |
| 36–50s | Move boss hand and fire a targeted strike     | Live camera plus tracked target with real damage         |
| 50–60s | Cast Overdrive and show Mission Passed/Failed | Animated powers and a genuine end-to-end outcome         |

“We turn a story into a playable encounter. I’m the hero, and my friend is the boss on their own device. Our movements trigger the same synchronized fight. At half health, the arena breaks into their actual camera feed. Their hand aims an attack in that room, and I have to survive it. This is GHOSTWIRE: Reality Raid.”

The exact duration depends on player timing. The fight is not rigged to force an outcome. Record one uninterrupted take using a deliberate screen-recording action with both participants' consent. Do not hide the movement when claiming gesture input. Save the real recording in the ignored `recordings/` directory. Keep a clearly labeled backup take for venue failures.

## Honest fallback route

No opponent: use **Solo training** and call it training. No camera: show manual control and the **VIRTUAL ARENA · NO LIVE CAMERA** label. No API: choose a curated world and describe it as a preset. No trusted HTTPS phone link: use two local browser tabs. Do not present these fallbacks as proof of the unavailable feature.
