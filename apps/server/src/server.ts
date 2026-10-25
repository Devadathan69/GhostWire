import express from 'express';
import { createServer } from 'node:http';
import { randomBytes, randomInt } from 'node:crypto';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { Server, type Socket } from 'socket.io';
import { z } from 'zod';
import {
  IntentSchema,
  ForgeBriefSchema,
  CreativeEncounterSchema,
  validateCreation,
  isCombat,
  battleSnapshot,
  MovementSchema,
  MAX_RAID_PLAYERS,
  type Ack,
  type RaidState,
  type Session,
} from '@ghostwire/shared';
import {
  addHero,
  createRaid,
  heroIntent,
  moveHero,
  reviveHero,
  startRaid,
  tickRaid,
  travelHero,
  scaleForLateJoin,
} from './raidEngine';
import { directBattle, type Encounter } from './battleDirector';
import { generateCreation, localBlueprint, ForgeError, GENERATION_MODEL } from './creativeDirector';

type Room = {
  state: RaidState;
  tokens: Record<string, string>;
  sockets: Record<string, string>;
  sequences: Record<string, number>;
  loadingDeadlines: Record<string, number>;
  touched: number;
};
type Reply = (data: Ack<unknown>) => void;
const codeSchema = z.string().regex(/^[A-HJ-NP-Z2-9]{6}$/);
const nameSchema = z
  .string()
  .trim()
  .min(1)
  .max(20)
  .regex(/^[\p{L}\p{N} _.-]+$/u, 'Use letters, numbers, spaces, or ._- in your name.');
const token = () => randomBytes(24).toString('hex');
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function makeServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '48kb' }));
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
    perMessageDeflate: { threshold: 1024, zlibDeflateOptions: { level: 3 } },
    allowRequest(req, cb) {
      const origin = req.headers.origin;
      let same = !origin;
      try {
        same ||= new URL(origin!).host === req.headers.host || allowed.has(origin!);
      } catch {
        /* reject malformed origins */
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
    res.json({
      ok: true,
      mode: 'cooperative',
      worldExpansion: true,
      creativeForge: true,
      maxPlayers: 4,
      aiConfigured: Boolean(process.env.OPENAI_API_KEY),
    }),
  );
  app.get('/api/config', (_req, res) =>
    res.json({
      publicUrl: process.env.PUBLIC_URL || null,
      aiConfigured: Boolean(process.env.OPENAI_API_KEY),
      model: process.env.OPENAI_MODEL || GENERATION_MODEL,
    }),
  );
  let generations = 0;
  app.post('/api/forge', async (req, res) => {
    if (limited(`forge:${req.ip}`, 5) || encounters.size >= 500) {
      res.status(429).json({ error: 'The creator is busy. Wait a minute and retry.' });
      return;
    }
    const p = z
      .object({ mode: z.enum(['ai', 'local']), brief: ForgeBriefSchema })
      .strict()
      .safeParse(req.body);
    if (!p.success) {
      res.status(400).json({ error: 'Please complete a valid creative brief.' });
      return;
    }
    if (p.data.mode === 'ai' && generations >= 2) {
      res.status(429).json({ error: 'Two worlds are already being generated. Try again shortly.' });
      return;
    }
    if (p.data.mode === 'ai') generations++;
    const controller = new AbortController();
    res.once('close', () => {
      if (!res.writableEnded) controller.abort();
    });
    try {
      const spec =
        p.data.mode === 'ai'
          ? await generateCreation(p.data.brief, controller.signal)
          : localBlueprint(p.data.brief);
      res.json({
        spec,
        source: p.data.mode === 'ai' ? 'ai' : 'custom',
        sourceNote:
          p.data.mode === 'ai'
            ? `Created with ${process.env.OPENAI_MODEL || GENERATION_MODEL}. Review your editable 3D blueprint.`
            : 'Local editable blueprint. No AI called.',
      });
    } catch (error) {
      if (res.destroyed) return;
      res.status(error instanceof ForgeError ? error.status : 500).json({
        error: error instanceof ForgeError ? error.message : 'The blueprint could not be created.',
      });
    } finally {
      if (p.data.mode === 'ai') generations--;
    }
  });
  app.post('/api/forge/save', (req, res) => {
    if (limited(`save:${req.ip}`, 12) || encounters.size >= 500) {
      res.status(429).json({ error: 'Too many blueprints. Wait a minute.' });
      return;
    }
    const p = CreativeEncounterSchema.safeParse(req.body);
    const error = p.success
      ? validateCreation(p.data.creation)
      : 'The blueprint has invalid or missing fields.';
    if (!p.success || error) {
      res.status(400).json({ error });
      return;
    }
    const spec = p.data;
    spec.heroName = spec.creation.heroes[0].name;
    spec.bossName = spec.creation.boss.name;
    spec.bossAttacks = spec.creation.boss.attacks.map((a) => a.mechanic) as typeof spec.bossAttacks;
    const encounter: Encounter = {
      spec,
      source: 'custom',
      sourceNote:
        'Reviewed custom blueprint. Appearance, powers, environment and controls are defined by this design.',
    };
    const id = token();
    encounters.set(id, { ...encounter, expires: Date.now() + 600000 });
    res.json({ id, ...encounter });
  });
  app.post('/api/encounters', async (req, res) => {
    if (limited(`ai:${req.ip}`, 8) || encounters.size >= 500) {
      res.status(429).json({ error: 'The director is busy. Wait a minute and retry.' });
      return;
    }
    const p = z
      .object({
        prompt: z.string().trim().min(3).max(500),
        preset: z.enum(['ember', 'shadow', 'storm']).optional(),
      })
      .strict()
      .safeParse(req.body);
    if (!p.success) {
      res.status(400).json({ error: 'Describe a battle in 3–500 characters.' });
      return;
    }
    const encounter = await directBattle(p.data.prompt, p.data.preset),
      id = token();
    encounters.set(id, { ...encounter, expires: Date.now() + 600000 });
    res.json({ id, ...encounter });
  });
  // Each snapshot replaces the whole state. Skip stale frames under network
  // backpressure; room closures and request acknowledgements remain reliable.
  const broadcast = (r: Room) =>
    io.to(r.state.code).volatile.emit('battle:snapshot', battleSnapshot(r.state));
  function closeRoom(code: string, reason: string) {
    const r = rooms.get(code);
    if (!r) return;
    io.to(code).emit('room:closed', { reason });
    for (const id of Object.values(r.sockets)) {
      const socket = io.sockets.sockets.get(id);
      socket?.leave(code);
      if (socket) delete socket.data.session;
    }
    rooms.delete(code);
  }
  function resumeIfConnected(r: Room) {
    const s = r.state;
    const heroes = Object.values(s.raid.heroes).filter((h) => r.tokens[h.id] || h.bot);
    if (heroes.every((h) => h.connected)) {
      s.reconnectUntil = null;
      if (s.phase === 'DISCONNECTED') {
        if (
          !['LOBBY', 'CALIBRATING'].includes(s.resumePhase ?? 'LOBBY') &&
          heroes.some((h) => !h.renderReady)
        ) {
          s.renderPending = true;
          s.renderDeadline ??= Date.now() + 60000;
          return;
        }
        s.phase = s.resumePhase ?? 'LOBBY';
        s.resumePhase = null;
        s.renderPending = false;
        s.renderDeadline = null;
      }
    }
  }
  function bind(socket: Socket, r: Room, id: string, reply: Reply, lateJoin = false) {
    const oldId = r.sockets[id];
    if (oldId && oldId !== socket.id) {
      const old = io.sockets.sockets.get(oldId);
      old?.leave(r.state.code);
      if (old) {
        delete old.data.session;
        old.emit('room:closed', { reason: 'This hero was resumed in another tab.' });
      }
    }
    r.sockets[id] = socket.id;
    r.sequences[id] = -1;
    r.state.raid.heroes[id].connected = true;
    if (lateJoin) r.loadingDeadlines[id] = Date.now() + 60000;
    const s = r.state;
    const battlePhase = s.phase === 'DISCONNECTED' ? s.resumePhase : s.phase;
    if (
      !lateJoin &&
      battlePhase &&
      !['LOBBY', 'CALIBRATING', 'VICTORY', 'DEFEAT'].includes(battlePhase)
    ) {
      if (s.phase !== 'DISCONNECTED') {
        s.resumePhase = s.phase;
        s.phase = 'DISCONNECTED';
      }
      s.raid.heroes[id].renderReady = false;
      s.renderPending = true;
      s.renderDeadline = Date.now() + 60000;
      for (const h of Object.values(s.raid.heroes)) {
        h.fighter.movement = { x: 0, z: 0, sprint: false };
        h.reviving = null;
      }
    }
    const session: Session = {
      code: r.state.code,
      role: 'hero',
      playerId: id,
      token: r.tokens[id],
    };
    socket.data.session = session;
    socket.join(session.code);
    r.touched = Date.now();
    resumeIfConnected(r);
    const base =
      process.env.PUBLIC_URL ||
      socket.handshake.headers.origin ||
      `http://localhost:${process.env.PORT || 3001}`;
    reply({
      ok: true,
      data: { session, state: r.state, joinUrl: `${base}/?join=${session.code}` },
    });
    broadcast(r);
  }
  function departed(r: Room, id: string) {
    delete r.tokens[id];
    delete r.sequences[id];
    delete r.sockets[id];
    delete r.loadingDeadlines[id];
    if (
      ['LOBBY', 'CALIBRATING'].includes(r.state.phase) ||
      r.state.resumePhase === 'LOBBY' ||
      r.state.resumePhase === 'CALIBRATING'
    ) {
      const region = r.state.raid.heroes[id]?.regionId;
      delete r.state.raid.heroes[id];
      if (region) delete r.state.raid.regions[region];
      if (region === r.state.raid.bossRegionId)
        r.state.raid.bossRegionId = Object.keys(r.state.raid.regions)[0] ?? '';
    } else {
      const h = r.state.raid.heroes[id];
      h.connected = false;
      h.ready = false;
      h.eliminated = true;
      h.hp = 0;
      h.downedUntil = null;
      h.reviving = null;
    }
    const humans = Object.values(r.state.raid.heroes).filter((h) => !h.bot && r.tokens[h.id]);
    if (!humans.length) {
      closeRoom(r.state.code, 'The squad left the raid.');
      return;
    }
    if (r.state.raid.hostId === id) r.state.raid.hostId = humans[0].id;
    resumeIfConnected(r);
    if (
      !['LOBBY', 'CALIBRATING', 'VICTORY', 'DEFEAT'].includes(r.state.phase) &&
      Object.values(r.state.raid.heroes).filter((h) => h.connected).length < 2
    ) {
      r.state.phase = 'DEFEAT';
      r.state.phaseAt = r.state.clock;
      r.state.resumePhase = null;
      r.state.pending = [];
      r.state.renderPending = false;
      r.state.renderDeadline = null;
      r.state.raid.endReason = 'The squad lost its teammates. A raid needs at least two heroes.';
      r.state.reconnectUntil = null;
    }
    broadcast(r);
  }
  io.on('connection', (socket) => {
    function member() {
      const sess = socket.data.session as Session | undefined,
        r = sess && rooms.get(sess.code),
        id = sess?.playerId;
      return r && id && r.sockets[id] === socket.id ? { room: r, id } : null;
    }
    function on(
      name: string,
      handler: (raw: unknown, reply: Reply) => void,
      max = 20,
      window = 1000,
    ) {
      socket.on(name, (raw, ack) => {
        const reply: Reply = typeof ack === 'function' ? ack : () => {};
        if (limited(`${socket.id}:${name}`, max, window)) {
          reply({ ok: false, error: 'Too many requests. Slow down a little.' });
          return;
        }
        try {
          handler(raw, reply);
        } catch {
          reply({ ok: false, error: 'That request could not be processed.' });
        }
      });
    }
    const fail = (r: Reply, error: string) => r({ ok: false, error });
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
          .object({
            encounterId: z.string().length(48),
            practice: z.boolean(),
            name: nameSchema.optional(),
          })
          .strict()
          .safeParse(raw);
        const e = p.success && encounters.get(p.data.encounterId);
        if (!p.success || !e || e.expires < Date.now()) {
          fail(reply, 'Encounter expired or player name invalid. Create a new battle.');
          return;
        }
        let code: string;
        do {
          code = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join('');
        } while (rooms.has(code));
        const id = randomBytes(8).toString('hex'),
          state = createRaid(code, e.spec, id, p.data.name ?? 'Hero 1', p.data.practice);
        state.source = e.source;
        state.sourceNote = e.sourceNote;
        const r: Room = {
          state,
          tokens: { [id]: token() },
          sockets: {},
          sequences: {},
          loadingDeadlines: {},
          touched: Date.now(),
        };
        rooms.set(code, r);
        encounters.delete(p.data.encounterId);
        bind(socket, r, id, reply);
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
        const p = z
            .object({ code: codeSchema, name: nameSchema.optional() })
            .strict()
            .safeParse(raw),
          r = p.success && rooms.get(p.data.code);
        if (
          !r ||
          !p.success ||
          !['LOBBY', 'CALIBRATING', 'ARENA', 'REALITY'].includes(r.state.phase)
        ) {
          fail(reply, 'Room not found or not accepting reinforcements right now.');
          return;
        }
        if (r.state.practice || Object.keys(r.state.raid.heroes).length >= MAX_RAID_PLAYERS) {
          fail(reply, 'This squad is full. A raid supports 2–4 heroes.');
          return;
        }
        const id = randomBytes(8).toString('hex');
        r.tokens[id] = token();
        addHero(r.state, id, p.data.name ?? `Hero ${Object.keys(r.state.raid.heroes).length + 1}`);
        const late = isCombat(r.state.phase);
        if (late) {
          r.state.raid.heroes[id].ready = true;
          scaleForLateJoin(r.state);
        }
        bind(socket, r, id, reply, late);
      },
      4,
    );
    on(
      'room:resume',
      (raw, reply) => {
        const p = z
            .object({
              code: codeSchema,
              role: z.literal('hero'),
              playerId: z.string().regex(/^[a-f0-9]{16}$/),
              token: z.string().regex(/^[a-f0-9]{48}$/),
            })
            .strict()
            .safeParse(raw),
          r = p.success && rooms.get(p.data.code);
        if (
          !p.success ||
          !r ||
          r.tokens[p.data.playerId] !== p.data.token ||
          (r.state.reconnectUntil && r.state.reconnectUntil <= Date.now())
        ) {
          fail(reply, 'This session expired. Create or join a new raid.');
          return;
        }
        const m = member();
        if (m && (m.room !== r || m.id !== p.data.playerId)) {
          fail(reply, 'Leave your current hero first.');
          return;
        }
        bind(socket, r, p.data.playerId, reply);
      },
      5,
    );
    on('room:ready', (raw, reply) => {
      const m = member(),
        p = z
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
      const h = m.room.state.raid.heroes[m.id];
      h.camera = p.data.camera;
      h.controlMode = p.data.controlMode;
      if (['LOBBY', 'CALIBRATING'].includes(m.room.state.phase)) h.ready = p.data.ready;
      broadcast(m.room);
      reply({ ok: true, data: null });
    });
    on('hero:design', (raw, reply) => {
      const m = member(),
        p = z
          .object({ index: z.number().int().min(0).max(3) })
          .strict()
          .safeParse(raw);
      if (!m || !p.success || !['LOBBY', 'CALIBRATING'].includes(m.room.state.phase)) {
        fail(reply, 'Choose your hero in the lobby.');
        return;
      }
      const design = m.room.state.spec.creation?.heroes[p.data.index];
      if (!design) {
        fail(reply, 'That hero is not available.');
        return;
      }
      m.room.state.raid.heroes[m.id].design = structuredClone(design);
      m.room.state.raid.heroes[m.id].designIndex = p.data.index;
      broadcast(m.room);
      reply({ ok: true, data: null });
    });
    on(
      'world:travel',
      (raw, reply) => {
        const m = member(),
          p = z
            .object({ regionId: z.string().max(48) })
            .strict()
            .safeParse(raw);
        if (!m || !p.success) {
          fail(reply, 'Choose a connected realm.');
          return;
        }
        const error = travelHero(m.room.state, m.id, p.data.regionId);
        if (error) fail(reply, error);
        else {
          broadcast(m.room);
          reply({ ok: true, data: null });
        }
      },
      5,
    );
    on('battle:start', (raw, reply) => {
      const m = member(),
        p = z
          .object({ waitForRenderer: z.boolean().optional() })
          .strict()
          .safeParse(raw ?? {});
      if (!m || m.id !== m.room.state.raid.hostId) {
        fail(reply, 'Only the squad leader can begin the raid.');
        return;
      }
      if (!p.success) {
        fail(reply, 'Invalid raid setup.');
        return;
      }
      const error = startRaid(m.room.state, p.data.waitForRenderer ?? false);
      if (error) fail(reply, error);
      else {
        broadcast(m.room);
        reply({ ok: true, data: null });
      }
    });
    on('battle:render-ready', (_raw, reply) => {
      const m = member();
      if (!m) {
        fail(reply, 'Join a squad first.');
        return;
      }
      const s = m.room.state;
      s.raid.heroes[m.id].renderReady = true;
      delete m.room.loadingDeadlines[m.id];
      if (
        s.renderPending &&
        Object.values(s.raid.heroes)
          .filter((h) => m.room.tokens[h.id] || h.bot)
          .every((h) => h.connected && h.renderReady)
      ) {
        s.renderPending = false;
        s.renderDeadline = null;
        if (s.phase === 'DISCONNECTED') resumeIfConnected(m.room);
        else s.phaseAt = s.clock;
      }
      broadcast(m.room);
      reply({ ok: true, data: null });
    });
    on('battle:rematch', (_raw, reply) => {
      const m = member();
      if (
        !m ||
        m.id !== m.room.state.raid.hostId ||
        !['VICTORY', 'DEFEAT'].includes(m.room.state.phase)
      ) {
        fail(reply, 'The squad leader can request a rematch after the raid.');
        return;
      }
      const old = m.room.state,
        host = old.raid.heroes[m.id],
        next = createRaid(old.code, old.spec, m.id, host.name, false);
      next.practice = old.practice;
      next.source = old.source;
      next.sourceNote = old.sourceNote;
      for (const h of Object.values(old.raid.heroes)) {
        if (h.id !== m.id && (h.bot || m.room.tokens[h.id])) addHero(next, h.id, h.name, h.bot);
        const n = next.raid.heroes[h.id];
        if (n) {
          n.connected = h.connected;
          n.camera = h.camera;
          n.controlMode = h.controlMode;
          n.color = h.color;
          n.design = h.design;
          n.designIndex = h.designIndex;
        }
      }
      m.room.state = next;
      for (const id of Object.keys(m.room.sequences)) m.room.sequences[id] = -1;
      broadcast(m.room);
      reply({ ok: true, data: null });
    });
    on(
      'gesture:intent',
      (raw, reply) => {
        const m = member(),
          p = IntentSchema.safeParse(raw);
        if (!m || !p.success) {
          fail(reply, 'Invalid hero action.');
          return;
        }
        if (p.data.sequence <= m.room.sequences[m.id]) {
          fail(reply, 'Duplicate move.');
          return;
        }
        m.room.sequences[m.id] = p.data.sequence;
        const error = heroIntent(m.room.state, m.id, p.data.action);
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
          p = MovementSchema.safeParse(raw);
        if (!m || !p.success) {
          fail(reply, 'Invalid movement.');
          return;
        }
        const error = moveHero(m.room.state, m.id, p.data);
        if (error) fail(reply, error);
        else {
          m.room.touched = Date.now();
          reply({ ok: true, data: null });
        }
      },
      20,
    );
    on(
      'raid:revive',
      (raw, reply) => {
        const m = member(),
          p = z
            .object({ targetId: z.string().max(32) })
            .strict()
            .safeParse(raw);
        if (!m || !p.success) {
          fail(reply, 'Invalid teammate.');
          return;
        }
        const error = reviveHero(m.room.state, m.id, p.data.targetId);
        if (error) fail(reply, error);
        else {
          broadcast(m.room);
          reply({ ok: true, data: null });
        }
      },
      5,
    );
    on('room:leave', (_raw, reply) => {
      const m = member();
      if (m) {
        socket.leave(m.room.state.code);
        delete socket.data.session;
        departed(m.room, m.id);
      }
      reply({ ok: true, data: null });
    });
    socket.on('disconnect', () => {
      const m = member();
      if (!m) return;
      const s = m.room.state,
        h = s.raid.heroes[m.id];
      delete m.room.sockets[m.id];
      h.connected = false;
      h.camera = false;
      for (const hero of Object.values(s.raid.heroes)) {
        hero.fighter.movement = { x: 0, z: 0, sprint: false };
        hero.reviving = null;
      }
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
    const now = Date.now(),
      dt = now - last;
    last = now;
    for (const [code, r] of rooms) {
      const s = r.state;
      for (const [id, deadline] of Object.entries(r.loadingDeadlines)) {
        if (now <= deadline) continue;
        const socket = io.sockets.sockets.get(r.sockets[id]);
        socket?.leave(code);
        if (socket) {
          delete socket.data.session;
          socket.emit('room:closed', {
            reason: 'Your 3D realm did not finish loading. Rejoin with a WebGL 2 browser.',
          });
        }
        departed(r, id);
      }
      if (!rooms.has(code)) continue;
      if (s.reconnectUntil && now > s.reconnectUntil) {
        for (const h of Object.values(s.raid.heroes).filter((h) => !h.connected && !h.bot))
          departed(r, h.id);
        if (!rooms.has(code)) continue;
        s.reconnectUntil = null;
        resumeIfConnected(r);
      }
      if (s.renderPending && s.renderDeadline && now > s.renderDeadline) {
        closeRoom(
          code,
          'A teammate’s 3D view did not finish loading. Reopen in a WebGL 2 browser.',
        );
        continue;
      }
      if (now - r.touched > 30 * 60000) {
        closeRoom(code, 'The squad expired after 30 minutes of inactivity.');
        continue;
      }
      tickRaid(r.state, dt);
      broadcast(r);
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
