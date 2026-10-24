# GHOSTWIRE implementation phases

The supplied blueprint describes a coherent MVP. Its largest risk is integrating two cameras, motion recognition, media transport, and shared combat. A dependency-driven build is safer than treating the original hourly schedule as a guarantee.

1. **Foundation and combat.** React/Vite/TypeScript, shared validated contracts, Phaser stage, deterministic authoritative combat, practice opponent, victory and defeat. Gate: tests prove damage, cooldown, defenses, and phase transitions.
2. **Two-player rooms.** Six-character invitations, per-role private resume tokens, QR join, ready gate, touch controls, snapshots, reconnect pause, expiry. Gate: two independent browser sessions complete a synchronized match.
3. **Motion controls.** Explicit camera consent, local pinned MediaPipe assets, confidence filtering, neutral calibration, smoothed gesture classification, manual fallback. Gate: gesture fixtures and denied-camera path; real-body tuning needs a human rehearsal.
4. **Reality Breach.** Scoped WebRTC signaling, one-way boss video, media recovery, transparent stage, consistent mirrored cover transform, server-authorized hand-target hits. Gate: mapping and combat tests plus synthetic live-stream browser verification; real phone/NAT needs field testing.
5. **AI and theme packs.** Server-only Responses API with strict schema, bounded mechanics, original procedural visuals, three curated fallback encounters. Gate: invalid output/API failure cannot prevent play; live generation requires an account key.
6. **Experience and delivery.** Cinematic effects, audio, mobile layout, accessible manual controls, recap export, setup/deployment/demo instructions. Gate: production build, integration tests, browser walkthrough, documented remaining physical tests.

## Scope decisions

- P0 gameplay takes priority. A labeled solo training mode makes the game playable immediately and does not impersonate another human.
- Procedural vector art is authored locally and animated in Phaser; no runtime image generation dependency.
- Scoped CSS replaces Tailwind to keep the visual system small and explicit.
- No recording occurs automatically. An actual two-person demonstration video requires consenting participants and their cameras; synthetic QA is labeled as such.
- P1 custom gesture training and narration, and all P2 items, are excluded from the initial MVP.
- “Perfect” is treated as a quality target, not a claim that untested hardware/network combinations are guaranteed.
