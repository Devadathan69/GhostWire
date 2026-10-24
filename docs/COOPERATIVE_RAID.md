# Cooperative raid design and implementation

The main game is a 2–4 player cooperative raid against one server-controlled boss. Everyone plays a hero. There is no human boss slot and no friendly fire. A one-person main raid cannot start. **Train with AI ally** adds Echo, an explicitly labeled AI teammate, to rehearse the same mechanics without another human.

## Phase 1 — Shared squad and authoritative combat

Implemented: private identities/tokens per hero, four player slots, leader-only start/rematch, all-player readiness and renderer gates, independent movement/health/defenses/cooldowns, shared boss HP, reconnect pause, departing-player handling, and genuine team outcomes.

Boss health locks when combat starts: preset HP × (3 + 1.25 × extra heroes above two). Emberfall has 360 / 510 / 660 boss HP for two / three / four heroes. Joining after combat starts is disallowed, keeping scaling and ownership stable.

## Phase 2 — Cooperation makes the boss beatable

- **Soul Aegis:** solo attacks deal zero damage. Hits from two different standing heroes within 2 seconds break the shield for 6 seconds. A repeatedly attacking single hero never opens it. Missed melee attacks do not count.
- **Damage opening:** attack during the shared six-second opening. Strike deals 8, Kick 12, Overdrive 32. Boss recovery boosts these by 25%. The attack that breaks the shield can deal damage immediately; the first linking hit is absorbed.
- **Unity Burst:** Overdrives from two different heroes resolving within 1.8 seconds during an opening add 40 team damage. Each pair triggers once. Start both casts together: each charges for 1.1 seconds.
- **Boss AI:** follows its threat target, locks marked attack zones before impact, alternates encounter powers, and marks every standing hero on each fourth attack. Spread out, guard, evade, or jump. Defenses apply personally. Phase two attacks faster.
- **Rescue:** at zero HP a hero falls, cannot attack/move, and has 20 seconds before elimination. A standing teammate within 2.6 world units (or equivalent screen distance in Reality) presses F / Revive and remains still for 3 seconds. Movement, another action, or damage interrupts the channel. A revive restores 40% HP plus 2 seconds of protection. Eliminated players spectate; they still share a team victory.
- **Failure:** every hero down/out, losing the team to departures, or the 180-second Cataclysm timer ends the raid. Damage and timers stop after either outcome. The whole squad receives Mission Passed or Mission Failed.

## Phase 3 — Visible squad and motion

Implemented: all heroes appear in the same 3D scene with distinct colored equipment/name tags, individual movement/combat/downed animations, team shield/burst feedback, squad health and revive controls, mobile joystick/buttons, exact motion guide, and all prior hero gestures.

At 50% of scaled boss HP the squad enters Reality Breach. Each player's optional **local** camera is their backdrop. All hero positions and locked attack zones are still shared. Camera video stays on its device; no peer video or microphone is needed. Without camera permission, the explicit virtual fallback remains playable. This is video compositing, not room reconstruction or furniture occlusion.

## Phase 4 — Verification and publication

The first cooperative unit/network pass passed 66 tests, including 22 new raid rule tests and migrated network/recovery coverage. Browser scenarios are being migrated from the former versus game to the cooperative product. Final browser/build results are recorded in the changelog and README after they run. Physical gesture/device rehearsal remains a separate manual check.

## Connection rules

A short disconnect pauses the squad's simulation for up to 30 seconds. Token resume restores that hero without resetting combat. If the reconnect window expires, the missing hero's token is invalidated. Remaining squads of at least two connected heroes can continue; fewer heroes receive a team failure. Leaving a waiting lobby frees the slot and transfers leadership. Rematches reset personal HP, effects, readiness, team mechanics, and boss health; every human readies again.
