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
describe('cooperative Socket.IO sessions', () => {
  it('creates four independent hero slots, rejects a fifth, and enforces leader/readiness gates', async () => {
    const host = await client(),
      peers = await Promise.all([client(), client(), client(), client()]);
    const r = await room(host);
    expect(r.session.role).toBe('hero');
    expect((await req(host, 'battle:start')).ok).toBe(false);
    const sessions = [];
    for (const peer of peers.slice(0, 3)) {
      const joined = await req<RoomReply>(peer, 'room:join', { code: r.session.code });
      if (!joined.ok) throw Error(joined.error);
      sessions.push(joined.data.session);
    }
    expect(new Set([r.session.playerId, ...sessions.map((s) => s.playerId)]).size).toBe(4);
    expect((await req(peers[3], 'room:join', { code: r.session.code })).ok).toBe(false);
    expect((await req(peers[0], 'battle:start')).ok).toBe(false);
    await ready(host);
    expect((await req(host, 'battle:start')).ok).toBe(false);
    for (const peer of peers.slice(0, 3)) await ready(peer);
    expect((await req(host, 'battle:start')).ok).toBe(true);
    expect(server.rooms.get(r.session.code)!.state.bossHp).toBe(660);
    expect((await req(peers[3], 'room:join', { code: r.session.code })).ok).toBe(false);
    for (const peer of peers.slice(0, 3)) await req(peer, 'room:leave');
    await req(host, 'room:leave');
  });
  it('scopes movement and attacks to the socket hero, rejects replay/extra actor fields, and shares damage', async () => {
    const host = await client(),
      peer = await client(),
      outsider = await client();
    const r = await room(host);
    const joined = await req<RoomReply>(peer, 'room:join', { code: r.session.code });
    if (!joined.ok) throw Error(joined.error);
    await ready(host);
    await ready(peer);
    await req(host, 'battle:start');
    const s = server.rooms.get(r.session.code)!.state;
    s.phase = 'ARENA';
    s.raid.nextAttackAt = 1e9;
    for (const h of Object.values(s.raid.heroes)) h.fighter.position = { x: 2, z: 0 };
    const id = r.session.playerId!,
      other = joined.data.session.playerId!;
    expect((await req(outsider, 'fighter:move', { x: 1, z: 0, sprint: false })).ok).toBe(false);
    expect((await req(peer, 'fighter:move', { x: 1, z: 0, sprint: false, playerId: id })).ok).toBe(
      false,
    );
    expect((await req(host, 'gesture:intent', { action: 'power', sequence: 1 })).ok).toBe(false);
    expect((await req(host, 'gesture:intent', { action: 'punch', sequence: 2 })).ok).toBe(true);
    expect((await req(host, 'gesture:intent', { action: 'punch', sequence: 2 })).ok).toBe(false);
    await wait(230);
    expect(s.bossHp).toBe(360);
    expect((await req(peer, 'gesture:intent', { action: 'punch', sequence: 1 })).ok).toBe(true);
    await wait(230);
    expect(s.bossHp).toBeLessThan(360);
    const before = { ...s.raid.heroes[id].fighter.position };
    await req(peer, 'fighter:move', { x: 1, z: 0, sprint: true });
    await wait(150);
    expect(s.raid.heroes[other].fighter.position.x).toBeGreaterThan(2);
    expect(s.raid.heroes[id].fighter.position).toEqual(before);
    expect(s.raid.heroes[id].hp).toBe(100);
    await req(peer, 'room:leave');
    await req(host, 'room:leave');
  });
  it('pauses the whole squad on disconnect and resumes the private hero without resetting health', async () => {
    const host = await client(),
      peer = await client();
    const r = await room(host);
    const joined = await req<RoomReply>(peer, 'room:join', { code: r.session.code });
    if (!joined.ok) throw Error(joined.error);
    await ready(host);
    await ready(peer);
    await req(host, 'battle:start');
    const s = server.rooms.get(r.session.code)!.state;
    s.phase = 'REALITY';
    s.raid.heroes[joined.data.session.playerId!].hp = 49;
    peer.disconnect();
    await wait(100);
    expect(s.phase).toBe('DISCONNECTED');
    const clock = s.clock;
    await wait(250);
    expect(s.clock).toBe(clock);
    const replacement = await client();
    expect((await req(replacement, 'room:resume', joined.data.session)).ok).toBe(true);
    expect(s.phase).toBe('REALITY');
    expect(s.raid.heroes[joined.data.session.playerId!].hp).toBe(49);
    await req(replacement, 'room:leave');
    await req(host, 'room:leave');
  });
  it('never exposes tokens in snapshots or permits another hero to resume a stolen id', async () => {
    const host = await client(),
      peer = await client(),
      stranger = await client();
    const r = await room(host);
    const joined = await req<RoomReply>(peer, 'room:join', { code: r.session.code });
    if (!joined.ok) throw Error(joined.error);
    expect(JSON.stringify(joined.data.state)).not.toContain(r.session.token);
    expect(
      (await req(stranger, 'room:resume', { ...r.session, token: joined.data.session.token })).ok,
    ).toBe(false);
    expect((await req(peer, 'room:resume', r.session)).ok).toBe(false);
    await req(peer, 'room:leave');
    await req(host, 'room:leave');
  });
  it('transfers leadership and frees a lobby slot when a teammate leaves', async () => {
    const host = await client(),
      peer = await client(),
      third = await client();
    const r = await room(host);
    const joined = await req<RoomReply>(peer, 'room:join', { code: r.session.code });
    if (!joined.ok) throw Error(joined.error);
    await req(host, 'room:leave');
    const s = server.rooms.get(r.session.code)!.state;
    expect(s.raid.hostId).toBe(joined.data.session.playerId);
    expect(Object.keys(s.raid.heroes)).toHaveLength(1);
    expect((await req(third, 'room:join', { code: r.session.code })).ok).toBe(true);
    expect(new Set(Object.values(s.raid.heroes).map((h) => h.color)).size).toBe(2);
    await req(third, 'room:leave');
    await req(peer, 'room:leave');
    expect(server.rooms.has(r.session.code)).toBe(false);
  });
  it('validates HTTP encounters and rejects invalid player names', async () => {
    const bad = await fetch(`${base}/api/encounters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'x' }),
    });
    expect(bad.status).toBe(400);
    const shadow = await fetch(`${base}/api/encounters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Moon shadow forest', preset: 'shadow' }),
    }).then((r) => r.json());
    expect(shadow.spec.arena).toBe('shadow_forest');
    const h = await client();
    expect(
      (await req(h, 'room:create', { encounterId: shadow.id, practice: false, name: '<script>' }))
        .ok,
    ).toBe(false);
  });
});
