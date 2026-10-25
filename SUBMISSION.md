# Project submission

Project details for the repository the owner identified as their Devin Hack Kochi submission. Organizer eligibility and final submission confirmations remain the participant's responsibility.

## Project

- **Project name:** GHOSTWIRE: REALITY RAID
- **Short description:** A browser 3D cooperative raid for 2–4 heroes against one AI boss. Every joining device expands the world with an owned realm; heroes travel through rifts, the boss invades, and reinforcements can join during play. Link attacks/powers, rescue allies and survive camera-backed Reality Breach for a shared Mission Passed/Failed result. A prompt-based creator previews editable procedural 3D heroes, boss, environment, powers, keys and recognized gestures through optional OpenAI generation or explicit local blueprints.
- **Code repository URL:** https://github.com/Devadathan69/GhostWire
- **Final submitted implementation commit SHA:** [7a827086b7e6c3f7fccc5aa110f06ef235bb6719](https://github.com/Devadathan69/GhostWire/commit/7a827086b7e6c3f7fccc5aa110f06ef235bb6719). This revision includes the live-AI verification fixture, connected worlds/creator, compact phone updates, graphics/reconnect recovery and readable generated power controls. It was checkpointed while final verification was running, then passed the complete public three-client generated raid through victory and rematch. The following publication record updates documentation/evidence only. Earlier milestones remain in preserved history; organizer handoff is not independently confirmed.
- **Working demo URL or local demo steps:** [Watch the 2:25 narrated demo](https://github.com/user-attachments/assets/9411962e-3ae1-4541-af2a-1f5fefc9dc16), or [open/download its repository copy](Demo/ghostwire-demo.mp4). For interactive play, run the commands below and open `http://localhost:3001`. On Windows, `Start-Phone-Test.cmd` creates a temporary HTTPS address for both devices; [the phone walkthrough](docs/PHONE_TEST.md) explains the complete match. A permanent hosted game URL has not been provisioned.
- **Demo access requirements:** Node.js 22.12+, npm, WebGL 2 browser, initial-install internet and 2–4 humans for a main raid. Training supplies an explicit AI ally. Presets/local blueprints require no account/key. AI creation requires a private server OpenAI API key and model access. Cameras require permission/HTTPS; manual controls remain available.

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
- **Demo walkthrough:** Create a raid or preview/edit a custom world, share the invite and ready the heroes. Show separate owned realms, watching with paused controls, rift travel, boss invasions and a third device joining live. Link strikes/Overdrives across realms, rescue a nearby ally, enter local-camera Reality Breach and finish at a shared result/rematch. Custom heroes show their actual bindings in the power guide. See [demo script](docs/DEMO_SCRIPT.md), [upgrade phases](docs/EXPANDING_WORLDS.md) and [exact controls](docs/CONTROLS.md).
- **Checks performed and results:** Production build and TypeScript passed, with 134 rules/network/creator/motion checks in twelve files. The earlier connected-world browser suite passed all 11 scenarios in 7.7 minutes. One real gpt-6.1-sol request succeeded in 45.8 seconds; its unmodified Thor/Doctor Strange/Iron Man/Thanos encounter is replayed without more API charges. The final public three-client raid passed in 2.2 minutes with zero browser errors through generated keys/touch, travel, reinforcement, all ultimate effects, named boss warnings, camera-backed Reality Breach, shared victory and rematch; every hero dealt real damage. Lost graphics confirmation, lost resume message and compact-state round trips are covered. The owner reported Doctor Strange rendering and gestures working on one physical phone. [Test plan](docs/TEST_PLAN.md) and [live-AI evidence/controls](docs/LIVE_AI_VERIFICATION.md) distinguish exact run results and physical coverage.
- **Known limitations or incomplete features:** Generated designs use supported procedural parts/effects, without exact movie meshes or arbitrary new pose detectors. Real model/account access and one phone's rendering/gestures are verified; broader physical multi-phone/Safari performance, lighting, venue networks, Docker and human code review remain unverified. Browser camera sources are synthetic. Reality Breach composites video without room reconstruction/occlusion. Rooms are in memory; restarts end raids. Temporary HTTPS requires an awake connected laptop. No real-person recording is supplied.
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
