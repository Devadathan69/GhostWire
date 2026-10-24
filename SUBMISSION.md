# Project submission

Project details for the repository the owner identified as their Devin Hack Kochi submission. Organizer eligibility and final submission confirmations remain the participant's responsibility.

## Project

- **Project name:** GHOSTWIRE: REALITY RAID
- **Short description:** A browser 3D cooperative raid for 2–4 heroes against one AI boss. Two heroes must link hits to break Soul Aegis, pair powers for Unity Burst, and revive fallen teammates. At half scaled boss HP, Reality Breach composites shared 3D heroes and attacks over each player’s optional local camera. The squad shares a Mission Passed/Failed result.
- **Code repository URL:** https://github.com/Devadathan69/GhostWire
- **Final submitted implementation commit SHA:** [2cfb7e827e6de6b99a5617ca2710270b952588af](https://github.com/Devadathan69/GhostWire/commit/2cfb7e827e6de6b99a5617ca2710270b952588af). This includes the cooperative redesign, rescue mechanics, graphics-ready reconnect fix, and completed verification. The following publication record changes documentation only. The earlier versus releases remain in preserved history.
- **Working demo URL or local demo steps:** Run the commands below and open `http://localhost:3001`. On Windows, `Start-Phone-Test.cmd` creates a temporary HTTPS address for both devices; [the phone walkthrough](docs/PHONE_TEST.md) explains the complete match. A permanent hosted demo URL has not been provisioned.
- **Demo access requirements:** Node.js 22.12+, npm, WebGL 2 browser, internet for initial install, and 2–4 human players for a main raid. Train with AI ally supplies an explicitly labeled teammate for rehearsal. No account/API key is required. Camera motion/backdrops require permission and HTTPS; manual controls work without cameras.

## Participants

Only the repository owner's GitHub identity has been supplied. Additional participant names, team membership, and eligibility have not been confirmed.

| Participant name | GitHub handle                                   | Contribution                                                                              |
| ---------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Repository owner | [Devadathan69](https://github.com/Devadathan69) | Project direction and repository ownership; code assistance is documented in AI_USAGE.md. |

## Run and demonstrate

- **Prerequisites and versions:** Node.js 22.12+; npm; WebGL 2 browser. Exact runtime/library versions are pinned in `package-lock.json`.
- **Install command:** `npm ci`, then `npm run setup:models` and `npm run build`.
- **Required environment variable names:** None for curated encounters/local gameplay. Optional server settings in [.env.example](.env.example): `OPENAI_API_KEY`, `OPENAI_MODEL`, `PORT`, `PUBLIC_URL`, and `ALLOWED_ORIGINS`. Camera video is local-only, requiring no TURN service. No live credentials are included.
- **Start command:** `npm start`, then open `http://localhost:3001`; alternatively use `Start-Ghostwire.cmd` on Windows. Use `Start-Phone-Test.cmd` or `npm run phone:start` for temporary HTTPS phone access.
- **Demo walkthrough:** Create a raid on the laptop; 1–3 friends open the invite on their phones and choose Join the squad. Every player controls a hero. All ready up; the leader begins. Link strikes, pair Overdrives, rescue allies with F / Revive, cross half boss HP into each device’s camera-backed Reality Breach, and finish with the same team result. Demonstrate a fresh rematch. See [DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md), [cooperative design/phases](docs/COOPERATIVE_RAID.md), and [exact controls](docs/CONTROLS.md).
- **Checks performed and results:** Production build and strict TypeScript passed. All 69 unit/network checks and all nine browser scenarios passed; the combined browser run took 5.7 minutes. Coverage includes four-hero combat/capacity, zero solo shield damage, coordinated powers, rescues, two complete human-role matches, local synthetic-camera breach, graphics-ready reconnect, replay, both outcomes, and graphics recovery. Public HTTPS assets, invitations, independent identities, solo shielding, and coordinated shared damage also passed. Synthetic sources establish integration rather than physical recognition.
- **Known limitations or incomplete features:** Real-person gestures, physical phone/Safari rendering, intended venue networks, a live OpenAI request, Docker, and human code review remain unverified. Reality Breach composites video without room reconstruction/furniture occlusion. Rooms are in memory; a server restart ends raids. Temporary phone access requires an awake, connected laptop. No real-person recording is supplied.
- **Libraries, APIs, and public datasets used:** React/Vite/TypeScript, Three.js, Node/Express, Socket.IO, MediaPipe pose/hand models, browser camera APIs, Zod, QRCode, Lucide, Fontsource fonts, and optional server-side OpenAI Responses API. Original fighters/arenas/textures/effects and sound are authored in the repository. Sources/licenses are in [THIRD_PARTY_NOTICES.md](docs/THIRD_PARTY_NOTICES.md); no participant dataset is included.
- **AI usage record:** [AI_USAGE.md](AI_USAGE.md)
- **Development change log:** [CHANGELOG.md](CHANGELOG.md)

## Submission checklist

- [ ] The project follows the organizers' current project-start and eligibility instructions.
- [ ] The participation format follows the organizers' current instructions.
- [x] AI assistance is documented with human review status; this template requires no particular tool or provider.
- [x] The code repository URL, short description, and reproducible local demo steps are provided.
- [x] README setup and demo instructions match the implementation.
- [x] Actual checks and known limitations are documented.
- [x] Cooperative milestone and completion commits preserve the submitted history. Earlier pre-import phases have no local milestone record; no timestamps/history were reconstructed.
- [x] The implementation is committed and pushed to `main`, and its SHA is recorded above.
- [x] Repository review found no credentials or private participant data; local secrets, live room data, recordings, and temporary tooling are ignored. The publication scan found zero credential-pattern matches and zero broken local Markdown links.
- [ ] The organizers' announced submission method and timing have been followed.

Event: **Devin Hack Kochi**. Follow the organizers' current submission method and deadline. The event has no major AI usage constraints.
