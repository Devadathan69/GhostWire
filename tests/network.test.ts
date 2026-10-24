import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import type { Ack, RoomReply } from '@ghostwire/shared';
import { makeServer } from '../apps/server/src/server';

const server = makeServer();
let base = '';
const clients: Socket[] = [];
beforeAll(async () => {
  await new Promise<void>((r) => server.http.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.http.address() as { port: number }).port}`;
});
afterAll(async () => {
  clients.forEach((s) => s.disconnect());
  await server.close();
});
async function client() {
  const s = io(base, { transports: ['websocket'], forceNew: true, reconnection: false });
  clients.push(s);
  await new Promise<void>((r, j) => {
    s.once('connect', r);
    s.once('connect_error', j);
  });
  return s;
}
async function req<T>(s: Socket, event: string, data: unknown = {}): Promise<Ack<T>> {
  return new Promise((r) => s.emit(event, data, r));
}
async function room(s: Socket) {
  const e = (await fetch(`${base}/api/encounters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Thunder guardian', preset: 'ember' }),
  }).then((r) => r.json())) as { id: string };
  const reply = await req<RoomReply>(s, 'room:create', { encounterId: e.id, practice: false });
  if (!reply.ok) throw new Error(reply.error);
  return reply.data;
}
const ready = (s: Socket) =>
  req(s, 'room:ready', { ready: true, camera: false, controlMode: 'manual' });
function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
describe('real Socket.IO sessions', () => {
  it('isolates room roles and rejects takeover, invalid resume and guest start', async () => {
    const hero = await client(),
      boss = await client(),
      stranger = await client();
    const r = await room(hero);
    expect((await req(boss, 'room:join', { code: r.session.code })).ok).toBe(true);
    expect((await req(stranger, 'room:join', { code: r.session.code })).ok).toBe(false);
    expect((await req(stranger, 'room:resume', { ...r.session, token: 'a'.repeat(48) })).ok).toBe(
      false,
    );
    expect((await req(boss, 'battle:start')).ok).toBe(false);
    await ready(hero);
    expect((await req(hero, 'battle:start')).ok).toBe(false);
    await ready(boss);
    expect((await req(hero, 'battle:start')).ok).toBe(true);
    await wait(2900);
    expect((await req(boss, 'gesture:intent', { action: 'special', sequence: 1 })).ok).toBe(false);
    expect((await req(hero, 'gesture:intent', { action: 'punch', sequence: 1 })).ok).toBe(true);
    expect((await req(hero, 'gesture:intent', { action: 'punch', sequence: 1 })).ok).toBe(false);
    await wait(230);
    expect(server.rooms.get(r.session.code)!.state.bossHp).toBe(114);
    expect((await req(stranger, 'webrtc:config')).ok).toBe(false);
    await req(hero, 'room:leave');
    expect(server.rooms.has(r.session.code)).toBe(false);
  });
  it('reconnects with a private token without resetting health or damaging during pause', async () => {
    const hero = await client(),
      boss = await client();
    const r = await room(hero);
    const b = await req<RoomReply>(boss, 'room:join', { code: r.session.code });
    if (!b.ok) throw new Error(b.error);
    await ready(hero);
    await ready(boss);
    await req(hero, 'battle:start');
    await wait(2900);
    await req(boss, 'gesture:intent', { action: 'swipe', sequence: 1 });
    boss.disconnect();
    await wait(100);
    const state = server.rooms.get(r.session.code)!.state,
      clock = state.clock;
    expect(state.phase).toBe('DISCONNECTED');
    await wait(5000);
    expect(state.clock).toBe(clock);
    expect(state.heroHp).toBe(100);
    const resumed = await client();
    expect((await req(resumed, 'room:resume', b.data.session)).ok).toBe(true);
    expect(state.phase).toBe('ARENA');
    await wait(850);
    expect(state.heroHp).toBe(90);
    await req(hero, 'room:leave');
  });
  it('never lets an unauthenticated or other-room peer inject signaling', async () => {
    const h1 = await client(),
      h2 = await client(),
      boss = await client(),
      outsider = await client();
    const one = await room(h1),
      two = await room(h2);
    expect(one.session.code).not.toBe(two.session.code);
    await req(boss, 'room:join', { code: one.session.code });
    let leaked = false;
    h2.on('webrtc:signal', () => (leaked = true));
    let received = 0;
    h1.on('webrtc:signal', () => received++);
    outsider.emit('webrtc:signal', { type: 'offer', sdp: 'bad', generation: 'bad' });
    await req(boss, 'webrtc:signal', { type: 'offer', sdp: 'scoped', generation: 'test' });
    await wait(80);
    expect(received).toBe(1);
    expect(leaked).toBe(false);
    await req(h1, 'room:leave');
    await req(h2, 'room:leave');
  });
  it('validates HTTP input and supplies distinct offline fallback encounters', async () => {
    const bad = await fetch(`${base}/api/encounters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'x' }),
    });
    expect(bad.status).toBe(400);
    const shadow = (await fetch(`${base}/api/encounters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Moon shadow forest', preset: 'shadow' }),
    }).then((r) => r.json())) as { spec: { arena: string }; source: string };
    expect(shadow.source).toBe('preset');
    expect(shadow.spec.arena).toBe('shadow_forest');
  });
});
