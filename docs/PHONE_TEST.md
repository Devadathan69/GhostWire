# Play a cooperative raid from your phones

1. Build with `npm run build`, then run `npm run phone:start` or double-click **Start-Phone-Test.cmd** on Windows. Keep the laptop awake. Stop using `npm run phone:stop` / **Stop-Phone-Test.cmd**.
2. Open the printed HTTPS address on the laptop. Choose a world, optionally enter a hero name, and **Create a raid**.
3. Send the invite/QR to 1–3 teammates. Each opens it in a full browser on their phone and chooses **Join the squad**. Everyone is a hero; the AI controls the one large boss.
4. Each teammate may enable their own camera for motion. Choose Body gestures or One hand. Hold neutral for about 1.3 seconds. Camera video stays local. Touch joystick/buttons always work.
5. Everyone presses **I’m ready**. The squad leader selects **Begin raid**. All 3D views load before the opening countdown proceeds.
6. Get into range and strike together. Two different heroes must hit within 2 seconds to break Aegis for 6 seconds. Coordinate both Overdrives for a Unity Burst. A lone hero does zero damage through Aegis.
7. Evade the marked zones. Move toward a downed teammate, press F / their Revive button, and stay still for 3 seconds. You have 20 seconds before their elimination; being hit or moving interrupts rescue.
8. At half boss HP, check **REALITY BREACH**. Enabled local video shows **LIVE · YOUR CAMERA** on that device. Without it, **VIRTUAL ARENA · NO LIVE CAMERA** is explicit. All heroes/attack zones remain synchronized across devices.
9. Finish at the same Mission Passed/Failed result. The leader requests **Raid again**; every human readies again.

[Exact controls and gesture timings](CONTROLS.md). Start with both devices on the same Wi-Fi. HTTPS is required for phone cameras. Use a full current Chrome/Edge/Safari browser with WebGL 2 and hardware acceleration. If a camera is denied, manual controls work immediately. A refresh privately resumes the same hero; a short disconnect pauses the squad up to 30 seconds.

Runtime logs and the current temporary address are in ignored `.local/phone-test/`. The regular localhost:3001 game is separate from the phone-test server. Restarting the phone-test tunnel changes its address and ends its raids. No account/domain/global installation/firewall change is made by the launcher. Its pinned executable comes from the official Cloudflare release and is checksum-verified. [Quick Tunnel documentation](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

The temporary public URL can be opened by anyone with it; share only with intended teammates. Tokens stay private in session storage. This cooperative release uses no peer-video transport or TURN service: local camera permission and the shared game connection are sufficient. Physical-device gesture and rendering quality still need rehearsal in intended lighting.
