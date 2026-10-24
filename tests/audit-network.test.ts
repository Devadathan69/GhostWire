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

describe('audit: interrupted and repeated room actions', () => {
  it('restores a refreshed host lobby before the first boss joins', async () => {
    const hero = await client(),
      returning = await client(),
      boss = await client();
    const room = await create(hero);
    await ready(hero);
    hero.disconnect();
    await wait(100);
    expect(server.rooms.get(room.session.code)!.state.phase).toBe('DISCONNECTED');
    const resumed = await req<RoomReply>(returning, 'room:resume', room.session);
    if (!resumed.ok) throw new Error(resumed.error);
    expect(resumed.data.state.phase).toBe('LOBBY');
    expect(resumed.data.state.players.hero.ready).toBe(true);
    expect(resumed.data.state.reconnectUntil).toBeNull();
    expect((await req(boss, 'room:join', { code: room.session.code })).ok).toBe(true);
    await ready(boss);
    expect((await req(returning, 'battle:start')).ok).toBe(true);
    await req(returning, 'room:leave');
  });
  it('revokes the stale socket after token resume and rejects cooldown flooding', async () => {
    const oldHero = await client(),
      boss = await client(),
      replacement = await client();
    const room = await create(oldHero);
    expect((await req(boss, 'room:join', { code: room.session.code })).ok).toBe(true);
    const closed = new Promise<{ reason: string }>((resolve) =>
      oldHero.once('room:closed', resolve),
    );
    expect((await req(replacement, 'room:resume', room.session)).ok).toBe(true);
    expect((await closed).reason).toContain('another tab');
    expect((await req(oldHero, 'webrtc:config')).ok).toBe(false);
    await req(oldHero, 'room:leave');
    expect(server.rooms.has(room.session.code)).toBe(true);
    await ready(replacement);
    await ready(boss);
    expect((await req(replacement, 'battle:start')).ok).toBe(true);
    await wait(2900);
    expect((await req(oldHero, 'gesture:intent', { action: 'punch', sequence: 1 })).ok).toBe(false);
    const replies = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        req(boss, 'gesture:intent', { action: 'swipe', sequence: i + 1 }),
      ),
    );
    expect(replies.filter((reply) => reply.ok)).toHaveLength(1);
    await wait(900);
    expect(server.rooms.get(room.session.code)!.state.heroHp).toBe(90);
    expect((await req(boss, 'gesture:intent', { action: 'swipe', sequence: 1 })).ok).toBe(false);
    expect((await req(boss, 'boss:target', { x: -1, y: 4 })).ok).toBe(false);
    await req(replacement, 'room:leave');
  });

  it('expires a disconnected room, invalidates its token and lets the peer create again', async () => {
    const hero = await client(),
      boss = await client(),
      returning = await client();
    const room = await create(hero);
    const joined = await req<RoomReply>(boss, 'room:join', { code: room.session.code });
    if (!joined.ok) throw new Error(joined.error);
    const closed = new Promise<{ reason: string }>((resolve) => hero.once('room:closed', resolve));
    boss.disconnect();
    await wait(100);
    const state = server.rooms.get(room.session.code)!.state;
    expect(state.phase).toBe('DISCONNECTED');
    // Advance the deadline, not the simulation, to check the actual expiry/cleanup branch.
    state.reconnectUntil = Date.now() - 1;
    expect((await closed).reason).toContain('expired');
    expect((await req(returning, 'room:resume', joined.data.session)).ok).toBe(false);
    const fresh = await create(hero);
    expect(fresh.session.code).not.toBe(room.session.code);
    await req(hero, 'room:leave');
  });

  it('recovers from an interrupted lobby and resets both readiness gates on rematch', async () => {
    const hero = await client(),
      boss = await client(),
      returning = await client();
    const room = await create(hero);
    const joined = await req<RoomReply>(boss, 'room:join', { code: room.session.code });
    if (!joined.ok) throw new Error(joined.error);
    await ready(hero);
    await ready(boss);
    boss.disconnect();
    await wait(100);
    expect((await req(returning, 'room:resume', joined.data.session)).ok).toBe(true);
    const current = server.rooms.get(room.session.code)!;
    expect(current.state.phase).toBe('CALIBRATING');
    expect(current.state.reconnectUntil).toBeNull();
    // Seed a completed outcome; this test checks server rematch ownership and reset behavior.
    current.state.phase = 'VICTORY';
    current.state.bossHp = 0;
    expect((await req(returning, 'battle:rematch')).ok).toBe(false);
    expect((await req(hero, 'battle:rematch')).ok).toBe(true);
    expect(current.state.heroHp).toBe(current.state.spec.heroMaxHp);
    expect(current.state.bossHp).toBe(current.state.spec.bossMaxHp);
    expect(current.state.players.hero.ready).toBe(false);
    expect(current.state.players.boss.ready).toBe(false);
    expect((await req(hero, 'battle:start')).ok).toBe(false);
    await ready(hero);
    await ready(returning);
    expect((await req(hero, 'battle:start')).ok).toBe(true);
    await req(hero, 'room:leave');
  });

  it('bounds result-screen disconnects and clears the deadline when both roles return', async () => {
    const hero = await client(),
      boss = await client(),
      returning = await client();
    const room = await create(hero);
    const joined = await req<RoomReply>(boss, 'room:join', { code: room.session.code });
    if (!joined.ok) throw new Error(joined.error);
    const state = server.rooms.get(room.session.code)!.state;
    state.phase = 'DEFEAT';
    state.heroHp = 0;
    boss.disconnect();
    await wait(100);
    expect(state.phase).toBe('DEFEAT');
    expect(state.reconnectUntil).toBeGreaterThan(Date.now());
    expect((await req(returning, 'room:resume', joined.data.session)).ok).toBe(true);
    expect(state.reconnectUntil).toBeNull();
    expect(state.phase).toBe('DEFEAT');
    expect((await req(hero, 'battle:rematch')).ok).toBe(true);
    await req(hero, 'room:leave');
  });
});
