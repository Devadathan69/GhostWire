# GHOSTWIRE: COOPERATIVE REALITY RAID

**Your body is the controller. Your friends are your squad. No hero wins alone.**

A browser 3D raid for **2–4 heroes against one AI boss**. Everyone controls a hero. Coordinate attacks to break the boss's shield, combine powers, rescue teammates, and survive Reality Breach together.

[Cooperative design and phases](docs/COOPERATIVE_RAID.md) · [Exact controls](docs/CONTROLS.md) · [Phone walkthrough](docs/PHONE_TEST.md) · [Submission](SUBMISSION.md) · [Change log](CHANGELOG.md) · [AI assistance](AI_USAGE.md)

## Play locally

Requires Node.js 22.12+ and npm, with a WebGL 2 browser. No account or API key is needed for the three curated worlds.

```sh
npm ci
npm run setup:models
npm run build
npm start
```

Open **http://localhost:3001**. Create a raid, send the invitation to 1–3 teammates, and ready up. The squad leader begins when everyone is ready. A main raid cannot start with one hero. **Train with AI ally** provides Echo, a clearly labeled AI teammate, for rehearsal with the same cooperation rules.

Windows: **Start-Ghostwire.cmd** installs missing dependencies/models, builds, and starts the local game. Keep its window open. Development: `npm run dev` serves the frontend at localhost:5173 and proxies the server on port 3001. Stop the production server first if it occupies that port. Use `npm.cmd` when PowerShell policy blocks `npm.ps1`.

## How the team wins

- **Soul Aegis blocks all solo damage.** Two different standing heroes must land attacks within 2 seconds to break it. The team then gets a 6-second damage window.
- **Unity Burst:** pair two heroes' Overdrives within 1.8 seconds for 40 extra team damage. No friendly fire.
- **One shared boss, personal heroes:** independent health, movement, defenses, powers, and cooldowns. Boss HP scales to the starting team size. Emberfall has 360 / 510 / 660 HP for 2 / 3 / 4 heroes.
- **Read the boss:** it chooses threat targets, follows the squad, locks marked damage zones, and periodically marks every standing hero. Spread out or time a defense. Attack during recovery for bonus damage.
- **Rescue allies:** downed heroes have 20 seconds to be saved. Move close and press **F** or their **Revive** button; stay still for 3 seconds. Movement, damage, or another action interrupts. A revive restores 40% HP with brief protection.
- **Reality Breach:** at half scaled boss HP, every hero enters the camera-backed final phase. Each player's optional local video becomes their own backdrop; shared heroes and attack zones stay synchronized. No camera still gives a clearly labeled playable virtual fallback.
- **Team outcome:** defeat the boss for Mission Passed. A squad wipe, losing the team to departures, or the 180-second Cataclysm gives Mission Failed. Eliminated heroes spectate and share their team's result. The leader can request a fresh rematch.

## Controls

All players use the same hero controls. All actions have touch buttons. See [the complete guide](docs/CONTROLS.md) or **How to play** for exact timings and hand-mode alternatives.

| Action | Keyboard / touch | Body gesture |
| --- | --- | --- |
| Walk / run | WASD or arrows; Shift / joystick + RUN | Lean left/right; step closer/farther. Greater calibrated shoulder width runs. |
| Strike | J | Quick arm extension, then neutral |
| Kick | I | Lift a knee above its hip with hips/knees visible |
| Guard | K | Cross wrists near chest for ¼ second |
| Evade | L | Small duck for ¼ second |
| Jump | E | One hand above head, other below shoulder, for ¼ second |
| Overdrive | Space | Both hands above head for ½ second |
| Revive ally | F / their Revive button | Use keyboard/touch; remain still for 3 seconds |

Camera capture requires an explicit click and HTTPS (or same-device localhost). Hold neutral for about 1.3 seconds to calibrate. One hand mode supports open-palm movement, swipe Strike, fist Guard, pinch Overdrive, and index-up Jump. Tracking loss stops movement; manual input stays available.

## Phones and hosting

Windows: double-click **Start-Phone-Test.cmd** or run `npm run phone:start` after building. Open the printed HTTPS address on laptop and phones. Create a squad on one device, scan the QR on each teammate's phone, and select **Join the squad**. **Stop-Phone-Test.cmd** / `npm run phone:stop` stops the temporary session. Runtime data stays in ignored `.local/phone-test/`. See [PHONE_TEST.md](docs/PHONE_TEST.md).

The temporary public link works while the laptop stays awake and online. A phone's localhost points to the phone itself. Plain LAN HTTP supports manual controls, while cameras need HTTPS. The server serves UI and Socket.IO together. For permanent hosting, use a long-running Node process behind HTTPS with WebSocket upgrades. Configure `PUBLIC_URL` for the canonical invite origin and `ALLOWED_ORIGINS` only for additional trusted frontends.

Run one server instance: rooms live in memory and restarts end active raids. Short disconnects pause the squad up to 30 seconds. Private tokens resume individual heroes. On timeout the missing hero is removed; squads with at least two connected heroes can continue. Fewer teammates produce a team failure. No room can be joined after combat starts.

Optional container recipe (not executed here):

```sh
docker build -t ghostwire .
docker run --rm -p 3001:3001 --env-file .env ghostwire
```

## Optional encounter director

Copy `.env.example` to `.env` and set server-only `OPENAI_API_KEY` and optionally `OPENAI_MODEL`. Curated worlds bypass the API. Edited story prompts use Responses API Structured Outputs with Zod validation and a bounded timeout; no key/refusal/error produces a visibly labeled curated fallback. Generated configuration selects only supported mechanics/colors, never executable code or remote assets. Requests use `store: false`. Live API output needs an actual configured key and remains an external check.

## Verification

```sh
npm run typecheck
npm test
npx playwright install chromium
npm run build
npm run test:e2e
```

The first cooperative milestone passed **68 unit/network tests**, strict TypeScript, and the production build. The browser suite is being migrated and exercised against the cooperative game; final results will be recorded after completion. Coverage includes shield pairing/expiry, burst timing, personal movement/defenses, shared AOE, rescue interruption/bleedout, wipe/time limit, scaled breach, AI companion, room capacity/ownership, reconnects, renderer gates, and replay.

Physical body/hand recognition, Android/iOS performance, venue networks, a live OpenAI request, and Docker remain manual checks. Synthetic camera/landmark tests establish integration rather than real-person recognition. Existing versus-mode screenshots and [the earlier audit](docs/QA_AUDIT.md) are historical evidence; they do not establish the cooperative release. New cooperative evidence is recorded separately.

## Privacy and boundaries

All camera video stays local in cooperative mode. No microphone, camera recording, face identification, or video storage. Stop camera terminates tracks. Recap export contains only game text/stats. Reality Breach composites 3D meshes over video; it does not reconstruct rooms or occlude behind furniture. The boss uses authored animations and server AI. Accounts, matchmaking, persistent leaderboards, and production-scale anti-cheat are outside this release.

Original characters, terrain, textures, and effects are authored as Three.js geometry/shaders and SVG/CSS. Runtime/model/fonts retain their licenses in [THIRD_PARTY_NOTICES.md](docs/THIRD_PARTY_NOTICES.md). Event guidance remains in [RULES.md](RULES.md).

## Source map

- `apps/server/src/raidEngine.ts`: cooperative rules, AI boss, revives, and shared simulation.
- `apps/server/src/server.ts`: rooms, private hero ownership, APIs, readiness, reconnect, and snapshots.
- `packages/shared/src/index.ts`: validated inputs, raid/hero contracts, and personal-view projection.
- `apps/client/src/game/`: articulated 3D scene, team rigs, powers, materials, audio, and movement input.
- `apps/client/src/cv/`: local camera lifecycle and calibrated pose/hand controls.
- `apps/client/src/components/`: squad display, HUD, controls, Reality Breach, and outcomes.
- `tests/`: deterministic combat/raid checks, real Socket.IO sessions, and browser scenarios.

The earlier implementation plan and build log remain in `docs/` as historical context. [COOPERATIVE_RAID.md](docs/COOPERATIVE_RAID.md) describes the current game.
