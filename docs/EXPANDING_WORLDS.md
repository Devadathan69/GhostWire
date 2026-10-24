# Connected worlds and the creative forge

## Phase 1 — A device owns a region

Implemented: creating a lobby creates the leader's realm. Each of up to three joining devices adds an independently owned realm, local movement coordinates and a rift gate. A device initially views its own hero's realm. Watching another realm pauses local controls; **Return view to my hero** restores them. Training's AI ally shares its human's realm.

The connected world is a portal network, not physically aligned screens. **Travel here** channels a 1.2-second crossing, repositions the hero with one second of protection, and recharges for six seconds. Movement or damage cancels a crossing. Finish attacks before travel. Revives require both heroes in the same realm and within normal rescue distance.

## Phase 2 — A boss that invades the world

Implemented: the one shared boss fights heroes in its current realm, with region-scoped warning circles, collisions and damage. It announces a 2.2-second invasion, then waits 1.8 seconds before attacking in its destination. It considers roaming every 13 seconds, or sooner when its realm is empty. The map shows its destination/current realm. Attacks cannot hit it mid-transit; attacks aimed at a realm it has left miss honestly.

Heroes elsewhere contribute through rifts: **Strike becomes a 4-damage bolt with a 0.55-second windup**; Overdrive retains configured damage and its 1.1-second windup. Both obey Soul Aegis and Unity Burst. Kick requires travel to the boss realm. Local attacks retain normal reach/damage. Reality Breach preserves regional combat rather than merging every hero into one device view.

## Phase 3 — Reinforcements during play

Implemented: the world map retains the invitation link/code. Joining during Arena or Reality adds a realm without pausing existing heroes. Boss maximum HP scales while preserving its current percentage. New heroes cannot act or be targeted until graphics are ready. Private reconnect tokens resume the same hero/region; reconnecting an active hero retains the whole-squad graphics gate. Capacity is four total hero slots per raid. Server restarts end in-memory raids.

## Phase 4 — Prompt, review, play

Implemented: **Create a world** accepts story/movie/fight context, 2–4 character names, boss, environment, powers and desired controls. **Generate with AI** calls server-side OpenAI Responses using strict Zod Structured Outputs, `store: false`, bounded tokens/time, and `gpt-6.1-sol` by default. Missing credentials, refusals, incomplete output, invalid controls and upstream errors are visible failures. No silent template fallback claims AI success.

**Build local blueprint** explicitly makes no AI call. It interprets names, broad visual themes and powers; controls remain editable defaults. The AI path interprets the detailed brief and desired mappings. Both paths produce a live 3D preview and editable blueprint before lobby creation.

The editor supports hero name, costume colors, archetype, headgear, weapon, cape, power names/keys/recognized gestures/damage/recharge/ultimate effect; boss form/colors and two attack names/patterns/warnings/damage; environment name/colors/ground/weather. An optional advanced editor exposes descriptions and prop layout. Lobby members choose their own generated hero.

## Supported generation and controls

The renderer assembles articulated procedural 3D models, authored materials, props and effects. Forms: knight, mage, tech, beast, colossus, specter. Heads: helmet, hood, mask, hair. Weapons: blade, staff, hammer, fists. Environment props are visual scenery without furniture-style collision/occlusion.

Ultimate effects: thunder strike, flame slash, moon shield, fire orb, lightning burst, shadow wave. Powers retain six semantic slots: Strike, Kick, Guard, Evade, Jump, Overdrive. Their names/keys/gestures can change; their combat meaning stays bounded. Overdrive uses the chosen elemental animation. Basic attacks retain melee/rift animations; defenses retain their existing animations.

Every hero requires six unique keys and recognizer assignments. Power keys: J/K/L/I/E/Space/U/O/P/H/B/N/M/1–6. WASD/arrows, Shift and F remain movement/sprint/revive. Recognizers: arm extension/palm swipe, knee lift, crossed wrists/fist, duck, one hand overhead/index up, both hands overhead/pinch. One-hand mode lacks knee/duck recognition; use touch for those assigned powers. Review **Your power and motion guide** in combat. Arbitrary poses cannot create a new detector.

The creator does not produce downloadable film-quality meshes, exact actor likenesses, arbitrary scripts or new combat systems. The schema accepts no executable code or remote assets.

## Private setup and verification

Copy `.env.example` to `.env`, add `OPENAI_API_KEY` privately, leave `OPENAI_MODEL=gpt-6.1-sol`, and restart the server or phone test. The API project needs model access. Browser configuration exposes only a configured boolean/model name. Never put credentials in chat/source/commits.

Actual checks are recorded in CHANGELOG.md. Physical phone gestures/performance and a real API request remain separate checks; mocks do not establish account access or generation quality.

API sources: [model](https://developers.openai.com/api/docs/models/gpt-6.1-sol), [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs). Existing Three.js, MediaPipe, Socket.IO and OpenAI dependencies are reused; no asset provider was added.
