# Play the full raid from your phone

## Start and stop

On Windows, double-click **Start-Phone-Test.cmd**. It checks the local assets, builds the game, and starts a separate game server plus a temporary HTTPS tunnel in the background. The terminal prints the phone-test URL. It works while the laptop is awake and online; restarting the tunnel creates a different URL.

Alternatively, after building:

```sh
npm run phone:start
npm run phone:status
npm run phone:stop
```

Double-click **Stop-Phone-Test.cmd** when finished. This closes only the phone-test server and tunnel owned by its supervisor. The regular app on localhost:3001 remains available. Runtime logs and the current address are in the ignored `.local/phone-test/` folder. No account, domain, system installation, firewall change, or global PATH change is made. The pinned Cloudflare executable is downloaded from the official release and checked against its SHA-256 digest.

The link is a temporary public test address: people with the address can open the game. Private role tokens stay in each browser's session storage. Do not share the address beyond your intended testers. [Cloudflare Quick Tunnels documentation](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

## Laptop: hero

1. Open the **HTTPS phone-test URL**, not the regular localhost:3001 game. These are separate game servers.
2. Select a preset and choose **Create a raid**. The lobby shows a phone-ready QR and six-character raid code.
3. Enable the hero camera if you want motion on both sides. Hold a neutral posture with shoulders and wrists visible until calibration finishes. Hero video stays local.
4. Click **I'm ready**. Wait until the boss is connected and ready; then click **Begin raid**.

## Phone: boss

1. Start with the phone and laptop on the same Wi-Fi. Scan the lobby QR using your phone's camera and open the link in Chrome on Android or Safari on iPhone. Avoid a messaging app's embedded browser.
2. Tap **Possess the boss**. Tap **Enable camera** and allow camera access. No microphone permission is requested.
3. The narrow-screen default is **One hand** mode. Hold an open palm still until calibration completes. Move the open hand sideways to swipe; pinch thumb and index finger to charge; close your fist to guard.
4. For body gestures instead, select **Body gestures**. Place the phone on a stable support and keep shoulders and wrists visible. Extend an arm quickly to swipe, hold both hands above the head for half a second to power attack, or cross wrists near the chest for a quarter second to guard. The full hero/boss controls and cooldowns are in [CONTROLS.md](CONTROLS.md) and **How to play**.
5. Keep **Motion controls** checked, then tap **I'm ready**. Keep the browser visible and the phone awake during play.

## Verify the signature moment

- The hero uses WASD/arrows to walk, Shift to run, J to strike, I to kick, K to guard, L to evade, E to jump, and Space for Overdrive. Touch has the joystick, RUN, and all six actions. Move closer before melee attacks.
- Check that a deliberate boss gesture triggers a monster attack on the laptop and updates the same health values on both devices.
- Reduce the boss to **50% health**. The arena fractures and switches to the boss's live feed. Look for **LIVE · BOSS CAMERA** on the hero's screen.
- In Reality Breach, move your hand to aim the ring at the miniature hero and trigger an attack. A target locks at the start of its wind-up. Touching the arena is also a way to aim.
- Finish at the full-screen **MISSION PASSED / MISSION FAILED** result, save a recap if wanted, and request a rematch. Camera video is never recorded by the game.

## If something fails

| Symptom                                       | Next step                                                                                                                                                                                                                                                   |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phone camera unavailable                      | Confirm the address starts with HTTPS, allow camera for this site in browser settings, and use the phone's full browser. [Secure-context requirements](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).                         |
| Room not found                                | Both devices must use the current phone-test URL. A localhost:3001 room is not on the separate phone-test server. Create a fresh room if the host closed or expired.                                                                                        |
| Tracking lost                                 | Improve lighting, show the full palm or upper body, then recalibrate. Use small movements or keep playing with touch controls.                                                                                                                              |
| Controls work but video does not              | Keep both devices on the same Wi-Fi, turn off a VPN for this test if appropriate, keep browsers visible, then select **Retry link**. Switching off camera and enabling it again also renegotiates.                                                          |
| Restrictive Wi-Fi/mobile networks block video | Configure your own TURN service in `.env` using `TURN_URL`, `TURN_USERNAME`, and `TURN_CREDENTIAL`, then stop and restart phone-test mode. An HTTPS tunnel carries signaling; it does not relay WebRTC video. No TURN service is provisioned automatically. |
| Temporary link stops responding               | Check `npm run phone:status`, keep the laptop awake, or stop/start the phone test and share its new URL.                                                                                                                                                    |
| Browser asks to bypass a certificate warning  | Do not bypass it. The provided public HTTPS URL should have a trusted certificate; verify the address or start a new tunnel.                                                                                                                                |

For macOS/Linux, use an officially installed `cloudflared`, run a tunnel to a dedicated built Node server, and set `PUBLIC_URL` to the resulting HTTPS address. The bundled convenience launcher is specifically for 64-bit Windows.
