# Asset and dependency provenance

- Character illustrations, arena geometry, UI, icons assembled into the game scene, particles, and sound synthesis are authored in this repository. No image-generation service or third-party character likeness is used.
- MediaPipe Tasks Vision package is pinned to `0.10.22-rc.20250304`. The package's WASM/JS files are copied locally by `npm run setup:models`. Preserve upstream license notices embedded in those files and the package license.
- Pose model: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`.
- Hand model: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`.
- Both model URLs refer to version 1 artifacts. The installation script records no camera input. See the MediaPipe model cards and upstream terms for model distribution conditions.
- Barlow Condensed and DM Sans are bundled through Fontsource. Their OFL license files are retained with the packages; source fonts are distributed under the SIL Open Font License.
- Lucide UI icons are supplied by `lucide-react` under its ISC license.
- Three.js (MIT), React, Socket.IO, Express, Zod, QRCode, OpenAI SDK, and build/testing dependencies retain their package license files under `node_modules`. The lockfile records exact installed versions. Three.js's notice is also distributed at `/licenses/THREE-MIT.txt`.

The screenshots ending in `synthetic-camera` and the boss-camera screenshots show Chromium's fake media source. They are not footage of an actual participant.
