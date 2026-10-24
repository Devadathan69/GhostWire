# Cooperative verification and rehearsal

The current game is a 2–4 hero raid against one AI boss. [COOPERATIVE_RAID.md](COOPERATIVE_RAID.md) records the mechanism and implementation phases. The old versus-mode audit is historical.

## Automated unit and network checks

Latest cooperative pass: **69 tests in eight files**, all passing. Strict TypeScript and the production build also pass.

- Shared input/schema validation, calibrated pose/hand gesture fixtures, coordinate mapping, and 3D projection.
- Two-hero minimum, all-player readiness, four-player scaling, and locked combat roster.
- Zero solo damage through Aegis; distinct-hero pairing within two seconds; six-second openings; range misses; window expiry.
- Independent simultaneous attacks/cooldowns, paired Overdrive Burst, no repeated/same-hero burst credit, and no friendly fire.
- Personal speed-normalized movement, arena bounds, stale-input stop, guards/jumps/evades, and two-axis Reality movement.
- Server AI threat/following, fixed warning marks, squad-wide volleys, and one-hit-per-volley behavior in overlapping circles.
- Downed controls, proximity, uninterrupted three-second rescue, movement/action/damage interruption (including the final tick), 40% revive health, protection, 20-second bleedout, and a genuine rescue opening for a two-hero squad.
- Scaled half-health breach, phase cancellation, terminal simulation freeze, squad wipe, and the 180-second limit.
- Clearly labeled AI ally that cannot damage Aegis by itself.
- Real Socket.IO ownership/capacity, token privacy, takeover denial, anti-replay sequences, leader transfer, lobby refresh, all-renderer readiness on initial start and reconnect, full-squad pause/resume, expiry, and fresh rematch readiness/health.
- Optional encounter-director success/failure/refusal/schema paths use a mocked API, not a live request.

## Browser checks

All nine Chromium scenarios passed against the production build in the final combined run (5.7 minutes). Readiness on initial start and graphics-ready reconnect was verified; two human-role contexts completed two full matches with matching results and fresh replay readiness.

1. Camera/motion preferences survive lobby-to-fight transitions and camera restart.
2. Cancellation and leaving discard a late camera permission result and stop its tracks.
3. A denied camera request can be retried with the synthetic camera fixture.
4. Actual keyboard walking, sprint, input release, jump/kick, paired powers/shared damage, and the exact guide.
5. Training with Echo: a complete cooperative win through breach, team result, recap export, and rematch.
6. Two independent human-role contexts: invitations, private host refresh, solo shield proof, coordinated combat, local synthetic-camera Reality Breach, navigation disconnect/resume, matching wins, and two full matches with fresh readiness.
7. Four-hero lobby rejects a fifth; all four 3D views load, scale to 660 HP, and coordinate actual boss damage.
8. Narrow phone layout, camera denial/manual control, and a real passive squad defeat from boss attacks.
9. Tempest perspective changes preserve world positions; WebGL interruption displays an error, restoration recovers rendering, and leaving removes the canvas.

Screenshots prefixed `coop-` are current cooperative QA evidence. Camera images are synthetic Chromium sources, not a person or demonstration recording. Earlier screenshots and QA_AUDIT.md describe the former versus game. Traces and temporary browser recordings stay ignored in test-results/.

## Public phone link

The HTTPS script verifies model/WASM assets, public invitations, separate hero identities, blocked solo damage, paired shared damage, and AI target selection. Video is local-only in this release; it requires no peer signaling/TURN service. Transport checks do not certify physical phone motion or rendering performance.

## Physical rehearsal still required

- Join from actual 2–4 devices using the same HTTPS origin. Check landscape/portrait layouts and rendering performance.
- Calibrate body and hand modes in intended lighting; deliberately test all six actions, neutral poses, lost tracking, and motion movement stopping.
- Coordinate two real heroes to break Aegis, combine Overdrives, spread out during volleys, and revive a fallen ally.
- Enable local camera, cross the breach, and verify every visible hero/attack mark matches shared positions. Stop/restart camera; verify automatic stop at a team result.
- Interrupt and restore a device connection; check the 30-second pause, private resume, and departure behavior.
- If demonstrating AI-generated encounters, verify live output using the owner's server key. Docker and physical Safari/iOS remain unverified.
- Record only through a deliberate action and with every participant's consent. Never present synthetic evidence as a human demo.

Reality Breach does not reconstruct rooms or provide furniture occlusion. No frame-rate or gesture-latency guarantee is claimed across devices. Rooms are in memory; restarting the server ends them. A temporary tunnel needs the laptop awake and online.
