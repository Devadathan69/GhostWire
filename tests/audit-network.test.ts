import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import type { Ack, RoomReply } from '@ghostwire/shared';
import { makeServer } from '../apps/server/src/server';

const server = makeServer();
let base = '';
const clients: Socket[] = [];
beforeAll(async () => {
  await new Promise<void>((resolve) => server.http.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.http.address() as { port: number }).port}`;
});
afterAll(async () => {
  clients.forEach((socket) => socket.disconnect());
  await server.close();
});
async function client() {
  const socket = io(base, { transports: ['websocket'], forceNew: true, reconnection: false });
  clients.push(socket);
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });
  return socket;
}
function req<T>(socket: Socket, event: string, payload: unknown = {}): Promise<Ack<T>> {
  return new Promise((resolve, reject) =>
    socket
      .timeout(2000)
      .emit(event, payload, (error: Error | null, result: Ack<T>) =>
        error ? reject(error) : resolve(result),
      ),
  );
}
async function create(hero: Socket) {
  const response = await fetch(`${base}/api/encounters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Thunder guardian', preset: 'ember' }),
  });
  expect(response.ok).toBe(true);
  const encounter = (await response.json()) as { id: string };
  const result = await req<RoomReply>(hero, 'room:create', {
    encounterId: encounter.id,
    practice: false,
  });
  if (!result.ok) throw new Error(result.error);
  return result.data;
}
const ready = (socket: Socket) =>
  req(socket, 'room:ready', { ready: true, camera: false, controlMode: 'manual' });
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('cooperative recovery and replay audit', () => {
  it('waits for every real renderer, including the third hero', async () => {
    const host = await client(),
      p2 = await client(),
      p3 = await client();
    const r = await create(host);
    await req(p2, 'room:join', { code: r.session.code });
    await req(p3, 'room:join', { code: r.session.code });
    for (const p of [host, p2, p3]) await ready(p);
    expect((await req(host, 'battle:start', { waitForRenderer: true })).ok).toBe(true);
    const s = server.rooms.get(r.session.code)!.state;
    const clock = s.clock;
    await req(host, 'battle:render-ready');
    await req(p2, 'battle:render-ready');
    await wait(150);
    expect(s.clock).toBe(clock);
    await req(p3, 'battle:render-ready');
    await wait(100);
    expect(s.renderPending).toBe(false);
    expect(s.clock).toBeGreaterThan(clock);
    for (const p of [p3, p2, host]) await req(p, 'room:leave');
  });
  it('restores a lone host lobby before the first teammate joins', async () => {
    const host = await client(),
      replacement = await client(),
      peer = await client();
    const r = await create(host);
    await ready(host);
    host.disconnect();
    await wait(80);
    expect(server.rooms.get(r.session.code)!.state.phase).toBe('DISCONNECTED');
    const resumed = await req<RoomReply>(replacement, 'room:resume', r.session);
    if (!resumed.ok) throw Error(resumed.error);
    expect(resumed.data.state.phase).toBe('LOBBY');
    expect(resumed.data.state.raid!.heroes[r.session.playerId!].ready).toBe(true);
    expect((await req(peer, 'room:join', { code: r.session.code })).ok).toBe(true);
    await req(peer, 'room:leave');
    await req(replacement, 'room:leave');
  });
  it('revokes a stale socket and resets every hero’s health, readiness, and effects on rematch', async () => {
    const host = await client(),
      peer = await client(),
      replacement = await client();
    const r = await create(host);
    await req(peer, 'room:join', { code: r.session.code });
    const closed = new Promise<{ reason: string }>((resolve) => host.once('room:closed', resolve));
    expect((await req(replacement, 'room:resume', r.session)).ok).toBe(true);
    expect((await closed).reason).toContain('another tab');
    expect((await req(host, 'gesture:intent', { action: 'punch', sequence: 1 })).ok).toBe(false);
    await ready(replacement);
    await ready(peer);
    await req(replacement, 'battle:start');
    const old = server.rooms.get(r.session.code)!.state;
    old.phase = 'DEFEAT';
    old.raid.heroes[r.session.playerId!].hp = 0;
    expect((await req(peer, 'battle:rematch')).ok).toBe(false);
    expect((await req(replacement, 'battle:rematch')).ok).toBe(true);
    const fresh = server.rooms.get(r.session.code)!.state;
    expect(fresh.phase).toBe('LOBBY');
    for (const h of Object.values(fresh.raid.heroes)) {
      expect(h.hp).toBe(100);
      expect(h.ready).toBe(false);
      expect(h.downedUntil).toBeNull();
    }
    expect((await req(replacement, 'battle:start')).ok).toBe(false);
    await req(peer, 'room:leave');
    await req(replacement, 'room:leave');
  });
  it('expires a missing teammate, invalidates their token, and ends a two-person raid honestly', async () => {
    const host = await client(),
      peer = await client(),
      returning = await client();
    const r = await create(host);
    const joined = await req<RoomReply>(peer, 'room:join', { code: r.session.code });
    if (!joined.ok) throw Error(joined.error);
    await ready(host);
    await ready(peer);
    await req(host, 'battle:start');
    peer.disconnect();
    await wait(80);
    const s = server.rooms.get(r.session.code)!.state;
    s.reconnectUntil = Date.now() - 1;
    await wait(100);
    expect(s.phase).toBe('DEFEAT');
    expect((await req(returning, 'room:resume', joined.data.session)).ok).toBe(false);
    await req(host, 'room:leave');
  });
});
