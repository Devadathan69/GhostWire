# Exact controls

The in-game **How to play** screen contains the full role-by-role guide. Enable the camera, select **Body gestures** or **One hand**, and hold neutral for about 1.3 seconds to calibrate. Recalibrate after moving the camera. Tracking loss stops motion movement and suppresses gestures.

## Movement

- **Keyboard:** hold W/A/S/D or arrows to walk forward/left/back/right; hold Shift while moving to run. Release to stop.
- **Touch:** drag the circular joystick in any direction. Release to stop. RUN toggles joystick running. The four small arrow buttons make short steps.
- **Body:** lean toward the left/right side of the mirrored preview. Step a little closer to the camera to advance, or farther away to retreat. Running activates when your apparent shoulder width is about one third larger than at calibration.
- **Hero, One hand:** move an open palm slowly away from its calibrated center to walk. A quick sideways swipe attacks. Use Shift or the touch RUN toggle for running.
- Both players move freely in the 3D arena. During Reality Breach the hero moves across the live image; the boss aims instead of walking. Boss One hand mode uses the joystick for arena movement.
- Keyboard/joystick movement takes priority over motion. Movement is speed-limited and bounded by the server; stale input stops within 350ms. Provide fresh input after leaving instructions or resuming a paused raid.

## Hero

| Action    | Key / touch       | Body gesture                                                                                                          | One hand                                                   |
| --------- | ----------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Strike    | J / Strike        | Extend one arm quickly; return it to neutral before another punch.                                                    | Swipe an open palm sideways.                               |
| Kick      | I / Kick          | Lift one knee above its hip; hips and knees must be visible.                                                          | Use the Kick button.                                       |
| Guard     | K / Guard         | Cross wrists near the upper chest for a quarter second.                                                               | Make a fist.                                               |
| Evade     | L / Evade         | Duck slightly for a quarter second.                                                                                   | Use the Evade button.                                      |
| Jump      | E / Jump          | Hold one hand above the head and the other below shoulder level for a quarter second. A physical jump is unnecessary. | Point only the index finger up, folding the other fingers. |
| Overdrive | Space / Overdrive | Hold both hands above the head for half a second.                                                                     | Pinch thumb and index finger for half a second.            |

Cooldowns: Strike **0.44s**, Kick **0.95s**, Guard **1.45s**, Evade **1.7s**, Jump **1.4s**, Overdrive **8s**. Guard lasts 1.1s; Evade lasts 0.6s. Jump lasts 0.8s, with evasion approximately 0.15–0.65s after takeoff. Overdrive charges automatically for 1.1s after activation; no held key is required.

Strike and Kick need striking distance in the arena; **MOVE CLOSER** identifies a range miss. Overdrive reaches across the arena: Emberfall uses thunder strike, Hollow Moon uses moon shield, and Tempest uses flame slash. Moon shield also grants temporary guarding after resolving.

## Boss

| Action | Key / touch                 | Body gesture                                      | One hand                                        |
| ------ | --------------------------- | ------------------------------------------------- | ----------------------------------------------- |
| Swipe  | J / Swipe                   | Extend one arm quickly, then return to neutral.   | Swipe an open palm sideways.                    |
| Guard  | K / Guard                   | Cross wrists near the chest for a quarter second. | Make a fist.                                    |
| Power  | Space / Power               | Hold both hands above the head for half a second. | Pinch thumb and index finger for half a second. |
| Aim    | Pointer / touch battlefield | Right wrist aims during Reality Breach.           | Move the palm over the live feed.               |

Cooldowns: Swipe **1.8s**, Guard **1.45s**, Power **3.6s**. The encounter chooses claw sweep, fire orb, lightning burst, or shadow wave effects. Arena claws lock the hero's position; other powers target the pointer's ground mark, falling back to the hero when no mark exists. Reality Breach uses the on-screen aiming mark.

## Combat and outcomes

Warning rings show locked damage zones. Leave the ring, guard, evade, or time a jump before impact. Striking during boss recovery grants bonus damage. Duel / Overlook switches camera angle. Both views finish loading before the opening countdown advances.

At half boss health, Reality Breach begins. Live boss video appears when enabled and connected; the virtual fallback is clearly labeled. Each player receives **MISSION PASSED** or **MISSION FAILED** according to their own outcome, with stats and a recap download. The hero requests Raid again; both players then ready up.

Gesture tests use synthetic landmarks and camera sources. Real-person recognition still requires physical-device rehearsal in the intended framing and lighting.
