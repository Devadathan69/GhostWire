# Project submission

Project details for the repository the owner identified as their Devin Hack Kochi submission. Organizer eligibility and final submission confirmations remain the participant's responsibility.

## Project

- **Project name:** GHOSTWIRE: REALITY RAID
- **Short description:** A browser-based two-player 3D boss battle. One player controls the hero while a friend possesses the boss using camera gestures or touch/keyboard controls. At half boss health, Reality Breach makes the boss's live camera feed the battlefield for the miniature 3D hero.
- **Code repository URL:** https://github.com/Devadathan69/GhostWire
- **Final submitted implementation commit SHA:** Recorded by the follow-up publication record after the implementation commit is created.
- **Working demo URL or local demo steps:** Run the commands below and open `http://localhost:3001`. On Windows, `Start-Phone-Test.cmd` creates a temporary HTTPS address for both devices; [the phone walkthrough](docs/PHONE_TEST.md) explains the complete match. A permanent hosted demo URL has not been provisioned.
- **Demo access requirements:** Node.js 22.12+, npm, a current browser with WebGL 2, and internet for initial installation. No account or API key is required. Camera motion and phone video require permission and HTTPS. Manual controls and solo training work without cameras.

## Participants

Only the repository owner's GitHub identity has been supplied. Additional participant names, team membership, and eligibility have not been confirmed.

| Participant name | GitHub handle                                   | Contribution                                                                              |
| ---------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Repository owner | [Devadathan69](https://github.com/Devadathan69) | Project direction and repository ownership; code assistance is documented in AI_USAGE.md. |

## Run and demonstrate

- **Prerequisites and versions:** Node.js 22.12+; npm; WebGL 2 browser. Exact runtime/library versions are pinned in `package-lock.json`.
- **Install command:** `npm ci`, then `npm run setup:models` and `npm run build`.
- **Required environment variable names:** None for curated encounters and local gameplay. Optional server settings are listed in [.env.example](.env.example): `OPENAI_API_KEY`, `OPENAI_MODEL`, `PORT`, `PUBLIC_URL`, `ALLOWED_ORIGINS`, `TURN_URL`, `TURN_USERNAME`, and `TURN_CREDENTIAL`. No live credentials are included.
- **Start command:** `npm start`, then open `http://localhost:3001`; alternatively use `Start-Ghostwire.cmd` on Windows. Use `Start-Phone-Test.cmd` or `npm run phone:start` for temporary HTTPS phone access.
- **Demo walkthrough:** Create a raid on the laptop; open its invitation on the phone and choose Possess the boss. Enable cameras and calibrate if testing motion. Both players choose I'm ready; the hero chooses Begin raid. Demonstrate shared damage and 3D attacks, cross half boss health to trigger Reality Breach, aim a boss attack over live video, finish the match, and choose Raid again. See [DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md). Solo training provides the full combat flow without a second player.
- **Checks performed and results:** Production build and strict TypeScript passed. All 37 unit/network checks and nine browser scenarios passed. The final two-player scenario passed again after the waiting-lobby refresh fix; public HTTPS assets, invitations, shared combat, and signaling were separately verified. Synthetic camera/landmark tests establish integration, not physical gesture accuracy.
- **Known limitations or incomplete features:** Physical gestures, phone/venue-network media, live OpenAI output with an actual API key, Docker, and physical Safari/iOS remain manual checks. Reality Breach overlays 3D meshes on video without room reconstruction or furniture occlusion. Rooms are in memory, so a server restart ends raids; restrictive networks may require TURN. Temporary tunnels require the laptop to remain running. No real-person demo recording is supplied.
- **Libraries, APIs, and public datasets used:** React/Vite/TypeScript, Three.js, Node/Express, Socket.IO, MediaPipe pose/hand models, WebRTC, Zod, QRCode, Lucide, Fontsource fonts, and the optional server-side OpenAI Responses API. Original fighters/arenas and sound are authored in the repository. Sources and license notices are in [THIRD_PARTY_NOTICES.md](docs/THIRD_PARTY_NOTICES.md); no participant dataset is included.
- **AI usage record:** [AI_USAGE.md](AI_USAGE.md)
- **Development change log:** [CHANGELOG.md](CHANGELOG.md)

## Submission checklist

- [ ] The project follows the organizers' current project-start and eligibility instructions.
- [ ] The participation format follows the organizers' current instructions.
- [x] AI assistance is documented with human review status; this template requires no particular tool or provider.
- [x] The code repository URL, short description, and reproducible local demo steps are provided.
- [x] README setup and demo instructions match the implementation.
- [x] Actual checks and known limitations are documented.
- [ ] Commit milestones throughout development: the local implementation predated connection to this repository, so its earlier phases have no Git commit record. The import preserves the existing submitted history.
- [ ] The final implementation is committed and pushed, and its SHA is recorded above.
- [ ] No credentials or private data are included in the repository or demo instructions.
- [ ] The organizers' announced submission method and timing have been followed.

Event: **Devin Hack Kochi**. Follow the organizers' current submission method and deadline. The event has no major AI usage constraints.
