import { mkdir, cp, access, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const dir = resolve('apps/client/public/models');
await mkdir(dir, { recursive: true });
await cp(resolve('node_modules/@mediapipe/tasks-vision/wasm'), resolve(dir, 'wasm'), {
  recursive: true,
});
const models = {
  'pose_landmarker_lite.task':
    'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
  'hand_landmarker.task':
    'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
};
for (const [name, url] of Object.entries(models)) {
  const path = resolve(dir, name);
  try {
    await access(path);
    console.log(`${name}: already present`);
    continue;
  } catch {}
  const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`Model download failed: ${response.status}`);
  await writeFile(path, new Uint8Array(await response.arrayBuffer()));
  console.log(`${name}: installed`);
}
