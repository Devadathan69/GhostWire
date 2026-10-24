import express from 'express';
import { createServer } from 'node:http';
import { randomBytes, randomInt } from 'node:crypto';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { Server, type Socket } from 'socket.io';
import { z } from 'zod';
import {
  IntentSchema,
  TargetSchema,
  MovementSchema,
  isCombat,
  heroPosition,
  type Ack,
  type BattleState,
  type Role,
  type Session,
} from '@ghostwire/shared';
import { applyIntent, applyMovement, createState, startBattle, tickBattle } from './combatEngine';
import { directBattle, type Encounter } from './battleDirector';

type Room = {
  state: BattleState;
  tokens: Record<Role, string>;
  sockets: Partial<Record<Role, string>>;
  sequences: Record<Role, number>;
  touched: number;
  nextBotAt: number;
  botTurn: number;
  bossClaimed: boolean;
};
type Reply = (data: Ack<unknown>) => void;
const codeSchema = z.string().regex(/^[A-HJ-NP-Z2-9]{6}$/);
const resumeSchema = z
  .object({
    code: codeSchema,
    role: z.enum(['hero', 'boss']),
    token: z.string().regex(/^[a-f0-9]{48}$/),
  })
  .strict();
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const token = () => randomBytes(24).toString('hex');

export function makeServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '4kb' }));
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=()');
    next();
  });
  const http = createServer(app);
  const allowed = new Set(
    [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      ...(process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean),
      process.env.PUBLIC_URL,
    ].filter(Boolean),
  );
  const io = new Server(http, {
    maxHttpBufferSize: 32000,
    serveClient: false,
    allowRequest(req, cb) {
      const origin = req.headers.origin;
      let same = !origin;
      try {
        same ||= new URL(origin!).host === req.headers.host || allowed.has(origin!);
      } catch {
        /* invalid origin */
      }
      cb(null, same);
    },
  });
  const rooms = new Map<string, Room>();
  const encounters = new Map<string, Encounter & { expires: number }>();
  const rates = new Map<string, { count: number; until: number }>();
  function limited(key: string, max: number, window = 60000) {
    const now = Date.now();
    let r = rates.get(key);
    if (!r || r.until < now) {
      r = { count: 0, until: now + window };
      rates.set(key, r);
    }
    return ++r.count > max;
  }
  app.get('/api/health', (_req, res) =>
    res.json({ ok: true, aiConfigured: Boolean(process.env.OPENAI_API_KEY) }),
  );
  app.get('/api/config', (_req, res) => res.json({ publicUrl: process.env.PUBLIC_URL || null }));
  app.post('/api/encounters', async (req, res) => {
    if (limited(`ai:${req.ip}`, 8) || encounters.size >= 500) {
      res.status(429).json({ error: 'The director is busy. Wait a minute and try again.' });
      return;
    }
    const parsed = z
      .object({
        prompt: z.string().trim().min(3).max(500),
        preset: z.enum(['ember', 'shadow', 'storm']).optional(),
      })
      .strict()
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Describe a battle in 3–500 characters.' });
      return;
    }
    const encounter = await directBattle(parsed.data.prompt, parsed.data.preset);
    const id = token();
    encounters.set(id, { ...encounter, expires: Date.now() + 600000 });
    res.json({ id, ...encounter });
  });
  function broadcast(room: Room) {
    io.to(room.state.code).emit('battle:snapshot', room.state);
  }
  function closeRoom(code: string, reason: string) {
    const room = rooms.get(code);
    if (!room) return;
    io.to(code).emit('room:closed', { reason });
    for (const id of Object.values(room.sockets)) {
      const s = id && io.sockets.sockets.get(id);
      if (s) {
        s.leave(code);
        delete s.data.session;
      }
    }
    rooms.delete(code);
  }
  function joinUrl(socket: Socket, code: string) {
    const base =
      process.env.PUBLIC_URL ||
      socket.handshake.headers.origin ||
      `http://localhost:${process.env.PORT || 3001}`;
    return `${base}/?join=${code}`;
  }
  function bind(socket: Socket, room: Room, role: Role, reply: Reply) {
    const previous = room.sockets[role];
    if (previous && previous !== socket.id) {
      const old = io.sockets.sockets.get(previous);
      if (old) {
        old.leave(room.state.code);
        delete old.data.session;
        old.emit('room:closed', { reason: 'This role was resumed in another tab.' });
      }
    }
    room.sockets[role] = socket.id;
    room.sequences[role] = -1;
    room.state.players[role].connected = true;
    if (role === 'boss') room.bossClaimed = true;
    const session: Session = { code: room.state.code, role, token: room.tokens[role] };
    socket.data.session = session;
    socket.join(session.code);
    room.touched = Date.now();
    const waitingForFirstBoss = !room.bossClaimed && room.state.resumePhase === 'LOBBY';
    if (
      room.state.players.hero.connected &&
      (room.state.players.boss.connected || waitingForFirstBoss)
    ) {
      if (room.state.phase === 'DISCONNECTED') {
        room.state.phase = room.state.resumePhase ?? 'ARENA';
        room.state.resumePhase = null;
      }
      room.state.reconnectUntil = null;
    }
    reply({
      ok: true,
      data: { session, state: room.state, joinUrl: joinUrl(socket, session.code) },
    });
    broadcast(room);
    socket.to(session.code).emit('peer:joined');
  }
  io.on('connection', (socket) => {
    const fail = (reply: Reply, error: string) => reply({ ok: false, error });
    function member(): { room: Room; role: Role } | null {
      const sess = socket.data.session as Session | undefined;
      if (!sess) return null;
      const room = rooms.get(sess.code);
      if (!room || room.sockets[sess.role] !== socket.id) return null;
      return { room, role: sess.role };
    }
    function on(
      name: string,
      handler: (payload: unknown, reply: Reply) => void,
      max = 20,
      window = 1000,
    ) {
      socket.on(name, (payload, ack) => {
        const reply: Reply = typeof ack === 'function' ? ack : () => {};
        if (limited(`${socket.id}:${name}`, max, window)) {
          fail(reply, 'Too many requests. Slow down a little.');
          return;
        }
        try {
          handler(payload, reply);
        } catch {
          fail(reply, 'That request could not be processed.');
        }
      });
    }
    on(
      'room:create',
      (raw, reply) => {
        if (member()) {
          fail(reply, 'Leave your current room first.');
          return;
        }
        if (limited(`create:${socket.handshake.address}`, 15) || rooms.size >= 200) {
          fail(reply, 'Room limit reached. Try again in a minute.');
          return;
        }
        const p = z
          .object({ encounterId: z.string().length(48), practice: z.boolean() })
          .strict()
          .safeParse(raw);
        const e = p.success && encounters.get(p.data.encounterId);
        if (!p.success || !e || e.expires < Date.now()) {
          fail(reply, 'Encounter expired. Create a new battle.');
          return;
        }
        let code: string;
        do {
          code = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join('');
        } while (rooms.has(code));
        const state = createState(code, e.spec, p.data.practice);
        state.source = e.source;
        state.sourceNote = e.sourceNote;
        const room: Room = {
          state,
          tokens: { hero: token(), boss: token() },
          sockets: {},
          sequences: { hero: -1, boss: -1 },
          touched: Date.now(),
          nextBotAt: 0,
          botTurn: 0,
          bossClaimed: p.data.practice,
        };
        rooms.set(code, room);
        encounters.delete(p.data.encounterId);
        bind(socket, room, 'hero', reply);
      },
      3,
      10000,
    );
    on(
      'room:join',
      (raw, reply) => {
        if (member()) {
          fail(reply, 'Leave your current room first.');
          return;
        }
        if (limited(`join:${socket.handshake.address}`, 30)) {
          fail(reply, 'Too many room attempts. Try again in a minute.');
          return;
        }
        const p = z.object({ code: codeSchema }).strict().safeParse(raw);
        const room = p.success && rooms.get(p.data.code);
        if (!room || !['LOBBY', 'CALIBRATING'].includes(room.state.phase)) {
          fail(reply, 'Room not found or the raid has already begun.');
          return;
        }
        if (room.state.practice || room.bossClaimed) {
          fail(reply, 'The boss slot is already taken.');
          return;
        }
        bind(socket, room, 'boss', reply);
        room.state.phase = 'CALIBRATING';
        broadcast(room);
      },
      4,
      1000,
    );
    on(
      'room:resume',
      (raw, reply) => {
        const p = resumeSchema.safeParse(raw);
        const room = p.success && rooms.get(p.data.code);
        if (
          !p.success ||
          !room ||
          room.tokens[p.data.role] !== p.data.token ||
          (room.state.reconnectUntil && room.state.reconnectUntil <= Date.now())
        ) {
          fail(reply, 'This session expired. Create or join a new raid.');
          return;
        }
        const current = member();
        if (current && current.room !== room) {
          fail(reply, 'Leave your current room first.');
          return;
        }
        bind(socket, room, p.data.role, reply);
      },
      5,
      1000,
    );
    on('room:ready', (raw, reply) => {
      const m = member();
      const p = z
        .object({
          ready: z.boolean(),
          camera: z.boolean(),
          controlMode: z.enum(['manual', 'motion']),
        })
        .strict()
        .safeParse(raw);
      if (!m || !p.success) {
        fail(reply, 'Invalid player state.');
        return;
      }
      Object.assign(m.room.state.players[m.role], p.data);
      broadcast(m.room);
      reply({ ok: true, data: null });
    });
    on('battle:start', (raw, reply) => {
      const m = member();
      if (!m || m.role !== 'hero') {
        fail(reply, 'Only the hero can begin the raid.');
        return;
      }
      const options = z
        .object({ waitForRenderer: z.boolean().optional() })
        .strict()
        .safeParse(raw ?? {});
      if (!options.success) {
        fail(reply, 'Invalid raid setup.');
        return;
      }
      const error = startBattle(m.room.state, options.data.waitForRenderer ?? false);
      if (error) fail(reply, error);
      else {
        broadcast(m.room);
        reply({ ok: true, data: null });
      }
    });
    on('battle:render-ready', (_raw, reply) => {
      const m = member();
      if (!m) {
        fail(reply, 'Join a room first.');
        return;
      }
      const s = m.room.state;
      s.renderReady[m.role] = true;
      if (s.renderPending && s.renderReady.hero && s.renderReady.boss) {
        s.renderPending = false;
        s.renderDeadline = null;
        s.phaseAt = s.clock;
        broadcast(m.room);
      }
      reply({ ok: true, data: null });
    });
    on('battle:rematch', (_raw, reply) => {
      const m = member();
      if (!m || m.role !== 'hero' || !['VICTORY', 'DEFEAT'].includes(m.room.state.phase)) {
        fail(reply, 'Finish the raid before requesting a rematch.');
        return;
      }
      const old = m.room.state;
      const next = createState(old.code, old.spec, old.practice);
      next.players = old.players;
      next.players.hero.ready = false;
      next.players.boss.ready = old.practice;
      next.source = old.source;
      next.sourceNote = old.sourceNote;
      m.room.state = next;
      m.room.nextBotAt = 0;
      m.room.botTurn = 0;
      broadcast(m.room);
      reply({ ok: true, data: null });
    });
    on(
      'gesture:intent',
      (raw, reply) => {
        const m = member();
        const p = IntentSchema.safeParse(raw);
        if (!m || !p.success) {
          fail(reply, 'Invalid move.');
          return;
        }
        if (p.data.sequence <= m.room.sequences[m.role]) {
          fail(reply, 'Duplicate move.');
          return;
        }
        m.room.sequences[m.role] = p.data.sequence;
        const error = applyIntent(m.room.state, m.role, p.data.action, p.data.target);
        m.room.touched = Date.now();
        if (error) fail(reply, error);
        else {
          broadcast(m.room);
          reply({ ok: true, data: null });
        }
      },
      30,
    );
    on(
      'fighter:move',
      (raw, reply) => {
        const m = member(),
          parsed = MovementSchema.safeParse(raw);
        if (!m || !parsed.success) {
          fail(reply, 'Invalid movement.');
          return;
        }
        const error = applyMovement(m.room.state, m.role, parsed.data);
        if (error) fail(reply, error);
        else {
          m.room.touched = Date.now();
          reply({ ok: true, data: null });
        }
      },
      20,
    );
    on(
      'boss:target',
      (raw, reply) => {
        const m = member();
        const p = TargetSchema.safeParse(raw);
        if (!m || m.role !== 'boss' || !p.success) {
          fail(reply, 'Invalid boss target.');
          return;
        }
        m.room.state.bossTarget = p.data;
        reply({ ok: true, data: null });
      },
      20,
    );
    on(
      'webrtc:signal',
      (raw, reply) => {
        const m = member();
        const p = z
          .object({
            type: z.enum(['offer', 'answer', 'ice', 'request', 'stop']),
            sdp: z.string().max(24000).optional(),
            generation: z.string().max(64).optional(),
            candidate: z
              .object({
                candidate: z.string().max(2048).optional(),
                sdpMid: z.string().max(32).nullable().optional(),
                sdpMLineIndex: z.number().int().min(0).max(10).nullable().optional(),
                usernameFragment: z.string().max(256).nullable().optional(),
              })
              .strict()
              .optional(),
          })
          .strict()
          .safeParse(raw);
        if (!m || !p.success) return;
        const type = p.data.type;
        if (
          ((type === 'offer' || type === 'stop') && m.role !== 'boss') ||
          ((type === 'answer' || type === 'request') && m.role !== 'hero')
        )
          return;
        const other = m.room.sockets[m.role === 'boss' ? 'hero' : 'boss'];
        if (other) io.to(other).emit('webrtc:signal', p.data);
        reply({ ok: true, data: null });
      },
      80,
    );
    on('webrtc:config', (_raw, reply) => {
      if (!member()) {
        fail(reply, 'Join a room first.');
        return;
      }
      const iceServers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];
      if (process.env.TURN_URL)
        iceServers.push({
          urls: process.env.TURN_URL,
          username: process.env.TURN_USERNAME,
          credential: process.env.TURN_CREDENTIAL,
        });
      reply({ ok: true, data: { iceServers } });
    });
    on('room:leave', (_raw, reply) => {
      const m = member();
      if (m)
        closeRoom(
          m.room.state.code,
          `${m.role === 'hero' ? 'The hero' : 'The boss'} left the raid.`,
        );
      reply({ ok: true, data: null });
    });
    socket.on('disconnect', () => {
      const m = member();
      if (!m) return;
      const s = m.room.state;
      delete m.room.sockets[m.role];
      s.players[m.role].connected = false;
      s.players[m.role].camera = false;
      for (const role of ['hero', 'boss'] as const)
        s.fighters[role].movement = { x: 0, z: 0, sprint: false };
      s.reconnectUntil ??= Date.now() + 30000;
      if (!['VICTORY', 'DEFEAT', 'DISCONNECTED'].includes(s.phase)) {
        s.resumePhase = s.phase;
        s.phase = 'DISCONNECTED';
      }
      broadcast(m.room);
    });
  });
  let last = Date.now();
  const timer = setInterval(() => {
    const now = Date.now();
    const dt = now - last;
    last = now;
    for (const [code, room] of rooms) {
      const s = room.state;
      if (s.reconnectUntil && now > s.reconnectUntil) {
        closeRoom(code, 'Reconnect window expired. Start a fresh raid.');
        continue;
      }
      if (s.renderPending && s.renderDeadline && now > s.renderDeadline) {
        closeRoom(
          code,
          'The 3D views did not finish loading. Reopen the raid in a WebGL 2 browser.',
        );
        continue;
      }
      if (now - room.touched > 30 * 60000) {
        closeRoom(code, 'This room expired after 30 minutes of inactivity.');
        continue;
      }
      tickBattle(s, dt);
      if (s.practice && s.phase === 'ARENA') {
        const h = s.fighters.hero.position,
          b = s.fighters.boss.position,
          distance = Math.hypot(h.x - b.x, h.z - b.z);
        applyMovement(
          s,
          'boss',
          distance > 3.5
            ? { x: (h.x - b.x) / distance, z: (h.z - b.z) / distance, sprint: false }
            : { x: 0, z: 0, sprint: false },
        );
      }
      if (s.practice && isCombat(s.phase) && s.clock >= room.nextBotAt) {
        room.botTurn++;
        const action =
          room.botTurn % 5 === 0 ? 'guard' : room.botTurn % 3 === 0 ? 'power' : 'swipe';
        applyIntent(s, 'boss', action, heroPosition(s));
        room.nextBotAt = s.clock + (action === 'guard' ? 1800 : 3200);
      }
      broadcast(room);
    }
    for (const [key, e] of encounters) if (e.expires < now) encounters.delete(key);
    for (const [key, r] of rates) if (r.until < now) rates.delete(key);
  }, 50);
  const clientPath = resolve('dist/client');
  if (existsSync(clientPath)) {
    app.use(express.static(clientPath));
    app.get('/{*path}', (_req, res) => res.sendFile(resolve(clientPath, 'index.html')));
  }
  app.use(
    (_err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(400).json({ error: 'Invalid request.' });
    },
  );
  return {
    app,
    http,
    io,
    rooms,
    close: async () => {
      clearInterval(timer);
      await new Promise<void>((r) => io.close(() => r()));
      if (http.listening) await new Promise<void>((r) => http.close(() => r()));
    },
  };
}
