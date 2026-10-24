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
  ally = await connect();
try {
  assert.equal(health.mode, 'cooperative');
  const encounter = await fetch(`${base}/api/encounters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Cooperative phone connection test', preset: 'ember' }),
  }).then((r) => r.json());
  const room = await request(hero, 'room:create', { encounterId: encounter.id, practice: false });
  assert(room.joinUrl.startsWith(base));
  const joined = await request(ally, 'room:join', { code: room.session.code });
  assert.equal(joined.session.role, 'hero');
  assert.notEqual(joined.session.playerId, room.session.playerId);
  let h = room.state,
    a;
  hero.on('battle:snapshot', (s) => (h = s));
  ally.on('battle:snapshot', (s) => (a = s));
  for (const client of [hero, ally])
    await request(client, 'room:ready', { ready: true, camera: false, controlMode: 'manual' });
  await request(hero, 'battle:start');
  await sleep(3100);
  await request(hero, 'gesture:intent', { action: 'punch', sequence: 1 });
  await sleep(400);
  assert.equal(h.bossHp, 360); // Solo attack is absorbed.
  await Promise.all([
    request(hero, 'gesture:intent', { action: 'special', sequence: 2 }),
    request(ally, 'gesture:intent', { action: 'special', sequence: 1 }),
  ]);
  await sleep(1500);
  assert(h.bossHp < 360);
  assert.equal(h.bossHp, a.bossHp);
  assert.equal(Object.keys(h.raid.heroes).length, 2);
  assert(h.raid.targetId);
  console.log(
    JSON.stringify(
      {
        https: true,
        cooperative: true,
        modelAssets: true,
        publicInvites: true,
        independentHeroes: true,
        soloDamageBlocked: true,
        sharedTeamDamage: true,
        bossAI: true,
        cameraMode: 'local only',
      },
      null,
      2,
    ),
  );
  await request(ally, 'room:leave');
  await request(hero, 'room:leave');
} finally {
  hero.disconnect();
  ally.disconnect();
}
