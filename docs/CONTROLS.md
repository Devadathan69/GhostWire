# Exact controls

The in-game **How to play** screen contains the full cooperative hero guide. Enable the camera, select **Body gestures** or **One hand**, and hold neutral for about 1.3 seconds to calibrate. Recalibrate after moving the camera. Tracking loss stops motion movement and suppresses gestures.

## Movement

- **Keyboard:** hold W/A/S/D or arrows to walk forward/left/back/right; hold Shift while moving to run. Release to stop.
- **Touch:** drag the circular joystick in any direction. Release to stop. RUN toggles joystick running. The four small arrow buttons make short steps.
- **Body:** lean toward the left/right side of the mirrored preview. Step a little closer to the camera to advance, or farther away to retreat. Running activates when your apparent shoulder width is about one third larger than at calibration.
- **Hero, One hand:** move an open palm slowly away from its calibrated center to walk. A quick sideways swipe attacks. Use Shift or the touch RUN toggle for running.
- All 2–4 heroes move freely in the 3D arena. During Reality Breach all heroes move across each device’s optional local video. The boss is AI-controlled.
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

## Connected realms and custom powers

Every human device adds a realm. Use **Watch** on a world-map card to view it; your controls pause while watching away from your hero. **Return view to my hero** restores controls. **Travel here** takes 1.2 seconds standing still, grants one second of arrival protection and recharges for 6 seconds. Movement/damage cancels travel; finish attacks first. Kick and revives require the boss/teammate's realm. Across realms, Strike casts a 4-damage rift bolt with a 0.55-second windup; Overdrive retains its damage and 1.1-second windup. Both still need teamwork to break Aegis.

For created heroes, **the actual keys and names are on your power buttons**. Phone buttons use two columns and wrap long names. Open **Your power and motion guide** for each selected gesture, description, damage and recharge. The creator may map any of the six physical recognizers to a different action. Return to neutral between motions. Body mode supports all six recognizers. One-hand mode supports swipe, fist, pinch and index-up, so use touch/keyboard for powers mapped to duck or knee lift. WASD/arrows, Shift and F remain reserved.

The recorded live-AI encounter uses Thor **J / I / K / L / E / Space**, Doctor Strange **U / O / P / H / N / M**, and Iron Man **1 / 2 / 3 / 4 / 5 / 6**, in Strike / Kick / Guard / Evade / Jump / Overdrive order. See [the generated encounter record](LIVE_AI_VERIFICATION.md) for powers and recharge times. Those bindings belong to this saved encounter; a new prompt can produce different mappings.

## Rescue a teammate in your realm

The boss briefly delays its next cast when a hero falls, creating a rescue opening. Everyone controls a hero. Press **F** to attempt revival of the nearest downed teammate, or tap that teammate's **Revive** button in the squad panel. Get within 2.6 world units (or the corresponding screen distance in Reality), then stay still for 3 seconds. Movement, another action, or damage interrupts. Reviving restores 40% health and 2 seconds of protection. Downed heroes cannot act and have 20 seconds before elimination. Eliminated heroes spectate and share the team's result.

## Combat and outcomes

Warning rings show locked damage zones. Leave the ring, guard, evade, or time a jump before impact. Striking during boss recovery grants bonus damage. Duel / Overlook switches camera angle. All squad views finish loading before the opening countdown advances.

Two distinct heroes landing attacks within 2 seconds break Soul Aegis for a 6-second damage window. Solo hits through Aegis deal zero damage. Paired Overdrives within 1.8 seconds add 40 Unity Burst damage. No friendly fire. At half scaled boss HP, Reality Breach begins. Local camera video appears when enabled; the virtual fallback is clearly labeled. The squad shares **MISSION PASSED** or **MISSION FAILED**, with team stats and recap download. A squad wipe or the 180-second timer ends the raid. The squad leader requests Raid again; all humans ready again.

Gesture regressions use synthetic landmarks and camera sources. The owner confirmed the generated Doctor Strange and gestures working on one physical phone. Broader device and lighting coverage still requires rehearsal.
