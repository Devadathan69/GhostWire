# Cooperative verification and rehearsal

The current game is a 2–4 hero raid against one AI boss. [COOPERATIVE_RAID.md](COOPERATIVE_RAID.md) records the mechanism and implementation phases. The old versus-mode audit is historical.

## Automated unit and network checks

Current upgrade pass: **134 tests in twelve files**, TypeScript and the production build. The earlier connected-world baseline had 90 tests; the cooperative baseline had 69.

- Shared input/schema validation, calibrated pose/hand gesture fixtures, coordinate mapping, and 3D projection.
- Two-hero minimum, all-player readiness, four-player scaling and proportionally scaled late reinforcements.
- One realm per device; travel channel/cooldown/cancellation, regional damage/rescue/collision, cross-realm Aegis support, boss invasion timing and a roaming clock independent of lobby waiting.
- A living reinforcement prevents premature squad wipe while protected graphics load; its actions/targetability remain gated. Late joins do not pause existing heroes.
- Valid local creative blueprints, strict generated schemas, distinct keys/gestures, bounded power damage/cooldowns, actual model/storage settings, refusal/truncation/error handling, cancellation and secret-safe errors.
- Zero solo damage through Aegis; distinct-hero pairing within two seconds; six-second openings; range misses; window expiry.
- Independent simultaneous attacks/cooldowns, paired Overdrive Burst, no repeated/same-hero burst credit, and no friendly fire.
- Personal speed-normalized movement, arena bounds, stale-input stop, guards/jumps/evades, and two-axis Reality movement.
- Server AI threat/following, fixed warning marks, squad-wide volleys, and one-hit-per-volley behavior in overlapping circles.
- Downed controls, proximity, uninterrupted three-second rescue, movement/action/damage interruption (including the final tick), 40% revive health, protection, 20-second bleedout, and a genuine rescue opening for a two-hero squad.
- Scaled half-health breach, phase cancellation, terminal simulation freeze, squad wipe, and the 180-second limit.
- Clearly labeled AI ally that cannot damage Aegis by itself.
- Real Socket.IO ownership/capacity, token privacy, takeover denial, anti-replay sequences, leader transfer, lobby refresh, all-renderer readiness on initial start and reconnect, full-squad pause/resume, expiry, and fresh rematch readiness/health.
- Optional encounter-director success/failure/refusal/schema paths use a mocked API, not a live request.
- A recorded real gpt-6.1-sol encounter exercises all 18 generated power definitions and gesture bindings. Compact snapshots round-trip every live field and selected design for 2–4 heroes, including duplicate display names and ordinary presets; the network regression verifies a changed selection reaches another snapshot.

## Browser checks

All 11 Chromium scenarios passed against the production build in one combined run (7.7 minutes). Readiness on start, reconnect and reinforcement arrival was verified; two human-role contexts completed two full matches with matching results and fresh replay readiness. Subsequent guide wording and the specter cape checkbox refinement were rebuilt/typechecked without changing the tested raid mechanics.

1. Camera/motion preferences survive lobby-to-fight transitions and camera restart.
2. Cancellation and leaving discard a late camera permission result and stop its tracks.
3. A denied camera request can be retried with the synthetic camera fixture.
4. Actual keyboard walking, sprint, input release, jump/kick, paired powers/shared damage, and the exact guide.
5. Training with Echo: a complete cooperative win through breach, team result, recap export, and rematch.
6. Two independent human-role contexts: invitations, private host refresh, solo shield proof, coordinated combat, local synthetic-camera Reality Breach, navigation disconnect/resume, matching wins, and two full matches with fresh readiness.
7. Four-hero lobby rejects a fifth; all four 3D views load, scale to 660 HP, and coordinate actual boss damage.
8. Narrow phone layout, camera denial/manual control, and a real passive squad defeat from boss attacks.
9. Tempest perspective changes preserve world positions; WebGL interruption displays an error, restoration recovers rendering, and leaving removes the canvas.
10. Two devices initially show one hero in separate realms; watching pauses controls, travel brings two visible heroes together, the boss invades, and a third device expands the live world and loads safely while play continues.
11. The creator previews custom 3D designs, shows a no-key AI error, rejects duplicate bindings, saves edited powers/keys, supports hero selection and routes a remapped key to authoritative combat.

Additional regressions cover a deliberately lost graphics confirmation, the saved real-AI three-client encounter, and a deliberately lost resume message on polling/WebSocket. The resume check passed in 10.3 seconds: after the real request timeout, the same hero, invite, ready state and one occupied slot returned automatically. No session token is printed. Browser commands run serially with separate report folders; generated screenshots are captured in each run's report folder before verified evidence is copied into docs.

On final implementation `7a827086b7e6c3f7fccc5aa110f06ef235bb6719`, the two-human/two-complete-match scenario, lost graphics confirmation and lost resume message passed together in **2.0 minutes** (1.7 minutes, 9.7 seconds and 9.6 seconds respectively). The final generated public replay passed separately in 2.2 minutes. This is distinct from the earlier 11-scenario combined run; a new combined run of all 14 scenarios is not claimed.

Screenshots prefixed `coop-` are current cooperative QA evidence. Camera images are synthetic Chromium sources, not a person or demonstration recording. Earlier screenshots and QA_AUDIT.md describe the former versus game. Traces and temporary browser recordings stay ignored in test-results/.

## Public phone link

The HTTPS script passed model/WASM assets, invitations, private hero identities, separate regions, blocked solo damage, paired shared damage, boss AI, hero travel and a third player's live world expansion/scaled health/graphics gate against the refreshed public service. It waits for a locked volley to finish before crossing because damage correctly cancels travel. Configuration exposes no API key. Video stays local. Transport checks do not certify physical phone motion/rendering or live AI output.

The world/creator browser scenarios exercise watching with paused controls, traveling into a shared 3D view, boss arrival, a third live device/renderer, full blueprint preview/edit/save/hero selection, duplicate-key errors, no-key AI errors and a remapped key reaching authoritative combat. They drive real UI inputs and never mutate server game state.

The actual generated encounter also passed a complete **three-client HTTPS raid in 2.2 minutes on the final implementation**, including generated keys/touch, hero selection, travel, live reinforcement, all ultimate effects, named boss warnings, camera-backed Reality Breach, shared victory and rematch, with zero browser errors. Compact updates reuse the full blueprint delivered on create/join/resume; the sampled two-hero public snapshot decreased from 13,454 to 2,901 bytes without relying on edge compression. The exact evidence and limits are in [LIVE_AI_VERIFICATION.md](LIVE_AI_VERIFICATION.md).

## Live generation and physical confirmation

One real gpt-6.1-sol request completed in 45.8 seconds. Its exact result is saved as a credential-free regression fixture and replayed without further API charges. The owner reported Doctor Strange rendering and camera gestures working on one physical phone. See [the live verification record](LIVE_AI_VERIFICATION.md) for the generated controls, full-match browser evidence and limits.

## Broader physical rehearsal

- Join from actual 2–4 devices using the same HTTPS origin. Check landscape/portrait layouts and rendering performance.
- Calibrate body and hand modes in intended lighting; deliberately test all six actions, neutral poses, lost tracking, and motion movement stopping.
- Coordinate two real heroes to break Aegis, combine Overdrives, spread out during volleys, and revive a fallen ally.
- Enable local camera, cross the breach, and verify every visible hero/attack mark matches shared positions. Stop/restart camera; verify automatic stop at a team result.
- Interrupt and restore a device connection; check the 30-second pause, private resume, and departure behavior.
- Live output is verified with the owner's server key. Broader physical Safari/iOS coverage and Docker remain unverified.
- Record only through a deliberate action and with every participant's consent. Never present synthetic evidence as a human demo.

Reality Breach does not reconstruct rooms or provide furniture occlusion. No frame-rate or gesture-latency guarantee is claimed across devices. Rooms are in memory; restarting the server ends them. A temporary tunnel needs the laptop awake and online.
