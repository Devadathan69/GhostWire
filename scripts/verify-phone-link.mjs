import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { io } from 'socket.io-client';

const state = JSON.parse(
  await readFile(new URL('../.local/phone-test/state.json', import.meta.url), 'utf8'),
);
const base = state.url;
assert(base?.startsWith('https://'));
const health = await fetch(`${base}/api/health`).then((r) => r.json());
assert(health.ok);
const config = await fetch(`${base}/api/config`).then((r) => r.json());
assert.equal(config.publicUrl, base);
for (const file of [
  'pose_landmarker_lite.task',
  'hand_landmarker.task',
  'wasm/vision_wasm_internal.wasm',
]) {
  const r = await fetch(`${base}/models/${file}`, { method: 'HEAD' });
  assert.equal(r.status, 200, file);
  const length = r.headers.get('content-length');
  if (length !== null) assert(Number(length) > 1000000, file);
  assert(!r.headers.get('content-type')?.includes('text/html'), file);
  if (file.endsWith('.wasm')) assert(r.headers.get('content-type')?.includes('application/wasm'));
}
const connect = () =>
  new Promise((resolve, reject) => {
    const client = io(base, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
      extraHeaders: { Origin: base },
      timeout: 15000,
    });
    client.once('connect', () => resolve(client));
    client.once('connect_error', reject);
  });
const request = (s, event, data = {}) =>
  new Promise((resolve, reject) =>
    s
      .timeout(12000)
      .emit(event, data, (e, r) =>
        e ? reject(e) : r.ok ? resolve(r.data) : reject(new Error(r.error)),
      ),
  );
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hero = await connect(),
  boss = await connect();
try {
  const encounter = await fetch(`${base}/api/encounters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Phone connection test', preset: 'ember' }),
  }).then((r) => r.json());
  const room = await request(hero, 'room:create', { encounterId: encounter.id, practice: false });
  assert(room.joinUrl.startsWith(base));
  await request(boss, 'room:join', { code: room.session.code });
  let h = room.state,
    b;
  hero.on('battle:snapshot', (s) => (h = s));
  boss.on('battle:snapshot', (s) => (b = s));
  await request(hero, 'room:ready', { ready: true, camera: false, controlMode: 'manual' });
  await request(boss, 'room:ready', { ready: true, camera: false, controlMode: 'manual' });
  await request(hero, 'battle:start');
  await sleep(3100);
  await request(hero, 'gesture:intent', { action: 'punch', sequence: 1 });
  await sleep(500);
  assert.equal(h.bossHp, 114);
  assert.equal(b.bossHp, 114);
  await request(boss, 'gesture:intent', { action: 'swipe', sequence: 1 });
  await sleep(1200);
  assert.equal(h.heroHp, 90);
  assert.equal(b.heroHp, 90);
  const signal = new Promise((r) => hero.once('webrtc:signal', r));
  await request(boss, 'webrtc:signal', {
    type: 'offer',
    sdp: 'connectivity-check',
    generation: 'phone-verify',
  });
  assert.equal((await signal).generation, 'phone-verify');
  const rtc = await request(hero, 'webrtc:config');
  console.log(
    JSON.stringify(
      {
        https: true,
        modelAssets: true,
        publicInvites: true,
        twoPlayers: true,
        sharedCombat: true,
        mediaSignaling: true,
        turnConfigured: rtc.iceServers.some(
          (s) => String(s.urls).includes('turn:') || String(s.urls).includes('turns:'),
        ),
      },
      null,
      2,
    ),
  );
  await request(hero, 'room:leave');
} finally {
  hero.disconnect();
  boss.disconnect();
}
