import {
  ARENA_RADIUS,
  ATTACKS,
  COOLDOWNS,
  MELEE_RANGE,
  RAID_COLORS,
  isCombat,
  type Action,
  type BattleSpec,
  type Movement,
  type PendingAttack,
  type RaidHero,
  type RaidState,
  type WorldPosition,
} from '@ghostwire/shared';
import { createState, setPhase } from './combatEngine';

const zero = (): Movement => ({ x: 0, z: 0, sprint: false });
export const alive = (h: RaidHero) => h.connected && !h.eliminated && h.hp > 0;
export function addHero(s: RaidState, id: string, name: string, bot = false) {
  const slot = Math.max(
    0,
    RAID_COLORS.findIndex((color) => !Object.values(s.raid.heroes).some((h) => h.color === color)),
  );
  const angle = Math.PI * 0.25 + slot * Math.PI * 0.5;
  s.raid.heroes[id] = {
    id,
    name,
    bot,
    color: RAID_COLORS[slot % 4],
    hp: s.spec.heroMaxHp,
    connected: true,
    ready: bot,
    camera: false,
    controlMode: 'manual',
    fighter: {
      position: { x: Math.cos(angle) * 3, z: Math.sin(angle) * 3 },
      movement: zero(),
      moveAt: -1000,
    },
    screen: { x: 0.25 + slot * 0.16, y: 0.77 },
    guardUntil: 0,
    dodgeUntil: 0,
    jumpUntil: 0,
    immuneUntil: 0,
    cooldowns: {},
    downedUntil: null,
    eliminated: false,
    renderReady: bot,
    damage: 0,
    revives: 0,
    threat: 0,
    reviving: null,
  };
}
export function createRaid(
  code: string,
  spec: BattleSpec,
  hostId: string,
  name: string,
  practice = false,
): RaidState {
  const s: RaidState = {
    ...createState(code, spec, practice),
    raid: {
      heroes: {},
      hostId,
      maxBossHp: spec.bossMaxHp * 3,
      vulnerableUntil: 0,
      recentHits: {},
      lastSpecial: null,
      bursts: 0,
      revives: 0,
      nextAttackAt: 0,
      aiTurn: 0,
      targetId: null,
      limit: 180000,
      endReason: '',
    },
  };
  s.fighters.boss.position = { x: 0, z: -0.5 };
  addHero(s, hostId, name);
  if (practice) addHero(s, 'training-ally', 'Echo · AI ally', true);
  s.bossHp = s.raid.maxBossHp;
  return s;
}
export function startRaid(s: RaidState, waitForRenderer = false): string | null {
  if (!['LOBBY', 'CALIBRATING'].includes(s.phase)) return 'The raid has already begun.';
  const heroes = Object.values(s.raid.heroes);
  if (heroes.length < 2)
    return 'Invite at least one teammate. The boss needs a team of 2–4 heroes.';
  if (heroes.some((h) => !h.connected || !h.ready))
    return 'Every teammate must be connected and ready.';
  s.raid.maxBossHp = Math.round(s.spec.bossMaxHp * (3 + (heroes.length - 2) * 1.25));
  s.bossHp = s.raid.maxBossHp;
  for (const h of heroes) h.renderReady = h.bot;
  setPhase(s, 'INTRO');
  s.renderPending = waitForRenderer;
  s.renderDeadline = waitForRenderer ? Date.now() + 60000 : null;
  return null;
}
function log(
  s: RaidState,
  role: 'hero' | 'boss',
  action: string,
  label: string,
  playerId?: string,
  damage = 0,
  move?: Action,
) {
  s.events.push({
    id: (s.events.at(-1)?.id ?? 0) + 1,
    at: s.clock,
    role,
    action,
    label,
    damage,
    playerId,
    move,
  });
  s.events = s.events.slice(-32);
}
function contain(p: WorldPosition) {
  const distance = Math.hypot(p.x, p.z);
  if (distance > ARENA_RADIUS) {
    p.x *= ARENA_RADIUS / distance;
    p.z *= ARENA_RADIUS / distance;
  }
}
export function moveHero(s: RaidState, id: string, movement: Movement): string | null {
  const h = s.raid.heroes[id];
  if (!isCombat(s.phase) || !h || !alive(h)) return 'Movement is paused or your hero is down.';
  const length = Math.max(1, Math.hypot(movement.x, movement.z));
  h.fighter.movement = { x: movement.x / length, z: movement.z / length, sprint: movement.sprint };
  h.fighter.moveAt = s.clock;
  return null;
}
export function heroIntent(s: RaidState, id: string, action: Action): string | null {
  const h = s.raid.heroes[id];
  if (!isCombat(s.phase) || !h || !alive(h)) return 'Combat is paused or your hero is down.';
  if (['swipe', 'power'].includes(action)) return 'The boss is controlled by the raid AI.';
  if ((h.cooldowns[action] ?? 0) > s.clock) return 'Move is recharging.';
  if (
    ['punch', 'kick', 'special', 'guard'].includes(action) &&
    s.pending.some((a) => a.playerId === id && a.role === 'hero')
  )
    return 'Finish your current attack first.';
  h.cooldowns[action] = s.clock + COOLDOWNS[action];
  h.reviving = null;
  if (['left', 'right', 'forward', 'back'].includes(action)) {
    const x = action === 'left' ? -1 : action === 'right' ? 1 : 0;
    const z = action === 'forward' ? -1 : action === 'back' ? 1 : 0;
    h.fighter.position.x += x * 0.65;
    h.fighter.position.z += z * 0.65;
    contain(h.fighter.position);
    h.screen.x = Math.max(0.08, Math.min(0.92, h.screen.x + x * 0.1));
    h.screen.y = Math.max(0.46, Math.min(0.91, h.screen.y + z * 0.07));
    return null;
  }
  if (action === 'guard') h.guardUntil = s.clock + 1100;
  else if (action === 'dodge') h.dodgeUntil = s.clock + 600;
  else if (action === 'jump') h.jumpUntil = s.clock + 800;
  else {
    h.guardUntil = 0;
    const warning = action === 'special' ? 1100 : action === 'kick' ? 300 : 170;
    s.pending.push({
      id: nextId(s),
      playerId: id,
      role: 'hero',
      action,
      startedAt: s.clock,
      resolvesAt: s.clock + warning,
      damage: action === 'special' ? 32 : action === 'kick' ? 12 : 8,
      target: { x: 0.5, y: 0.35 },
      radius: 1,
    });
  }
  log(s, 'hero', action, action.toUpperCase(), id);
  return null;
}
function nextId(s: RaidState) {
  return s.tick * 100 + (s.pending.length ? Math.max(...s.pending.map((a) => a.id % 100)) + 1 : 0);
}
function near(s: RaidState, a: RaidHero, b: RaidHero, range = 2.6) {
  return s.phase === 'REALITY'
    ? Math.hypot(a.screen.x - b.screen.x, (a.screen.y - b.screen.y) * 0.5625) < range * 0.055
    : Math.hypot(
        a.fighter.position.x - b.fighter.position.x,
        a.fighter.position.z - b.fighter.position.z,
      ) < range;
}
export function reviveHero(s: RaidState, id: string, targetId: string): string | null {
  const h = s.raid.heroes[id],
    target = s.raid.heroes[targetId];
  if (
    !isCombat(s.phase) ||
    !h ||
    !alive(h) ||
    !target ||
    !target.connected ||
    target.eliminated ||
    target.downedUntil === null
  )
    return 'Choose a downed teammate while your hero is standing.';
  if (!near(s, h, target)) return 'Move closer to your downed teammate to revive.';
  if (s.pending.some((a) => a.role === 'hero' && a.playerId === id))
    return 'Finish your attack before reviving.';
  h.fighter.movement = zero();
  h.reviving = {
    targetId,
    startedAt: s.clock,
    origin: { ...h.fighter.position },
    screen: { ...h.screen },
  };
  log(s, 'hero', 'revive', 'REVIVING', id);
  return null;
}
function down(s: RaidState, h: RaidHero) {
  h.hp = 0;
  h.downedUntil = s.clock + 20000;
  h.reviving = null;
  h.fighter.movement = zero();
  s.pending = s.pending.filter((a) => a.role !== 'hero' || a.playerId !== h.id);
  log(s, 'boss', 'downed', `${h.name.toUpperCase()} DOWN`, h.id);
}
function finish(s: RaidState, victory: boolean, reason: string) {
  s.raid.endReason = reason;
  setPhase(s, victory ? 'VICTORY' : 'DEFEAT');
  for (const h of Object.values(s.raid.heroes)) {
    h.reviving = null;
    h.fighter.movement = zero();
  }
}
function heroHit(s: RaidState, a: PendingAttack) {
  const h = s.raid.heroes[a.playerId ?? ''];
  if (!h || !alive(h)) return;
  const p = h.fighter.position,
    b = s.fighters.boss.position;
  if (
    s.phase === 'ARENA' &&
    a.action !== 'special' &&
    Math.hypot(p.x - b.x, p.z - b.z) > MELEE_RANGE[a.action === 'kick' ? 'kick' : 'punch']
  ) {
    log(s, 'hero', 'hit', 'MOVE CLOSER', h.id, 0, a.action);
    return;
  }
  s.raid.recentHits[h.id] = s.clock;
  const participants = Object.entries(s.raid.recentHits).filter(
    ([id, at]) => s.clock - at <= 2000 && alive(s.raid.heroes[id]),
  );
  if (participants.length >= 2 && s.raid.vulnerableUntil <= s.clock) {
    s.raid.vulnerableUntil = s.clock + 6000;
    s.raid.recentHits = {};
    log(s, 'hero', 'team', 'AEGIS BROKEN', h.id);
  }
  const open = s.raid.vulnerableUntil > s.clock;
  const damage = open ? Math.round(a.damage * (s.recoveryUntil > s.clock ? 1.25 : 1)) : 0;
  s.bossHp = Math.max(0, s.bossHp - damage);
  h.damage += damage;
  h.threat += damage;
  s.stats.damage += damage;
  s.stats.strikes++;
  log(s, 'hero', 'hit', open ? 'TEAM DAMAGE' : 'AEGIS · NEED ALLY', h.id, damage, a.action);
  if (a.action === 'special') {
    if (s.spec.heroPower === 'moon_shield') h.guardUntil = s.clock + 2200;
    const last = s.raid.lastSpecial;
    if (open && last && last.playerId !== h.id && s.clock - last.at <= 1800) {
      const burst = 40;
      s.bossHp = Math.max(0, s.bossHp - burst);
      s.stats.damage += burst;
      h.damage += burst;
      s.raid.bursts++;
      s.raid.lastSpecial = null;
      log(s, 'hero', 'hit', 'UNITY BURST', h.id, burst, 'special');
    } else s.raid.lastSpecial = { playerId: h.id, at: s.clock };
  }
}
function bossHit(s: RaidState, a: PendingAttack, hitHeroes: Set<string>) {
  for (const h of Object.values(s.raid.heroes).filter(alive)) {
    const hitKey = `${a.volley ?? a.id}:${h.id}`;
    if (hitHeroes.has(hitKey)) continue;
    const p = h.fighter.position;
    const missed =
      s.phase === 'REALITY'
        ? Math.hypot(h.screen.x - a.target.x, (h.screen.y - a.target.y) * 0.5625) > a.radius
        : !!a.worldTarget &&
          Math.hypot(p.x - a.worldTarget.x, p.z - a.worldTarget.z) > a.radius * 9;
    const jump = h.jumpUntil - s.clock;
    const evaded =
      missed || h.immuneUntil > s.clock || h.dodgeUntil > s.clock || (jump > 140 && jump < 660);
    const guarded = h.guardUntil > s.clock;
    const damage = evaded ? 0 : Math.round(a.damage * (guarded ? 0.2 : 1));
    if (!missed) hitHeroes.add(hitKey);
    if (damage) {
      h.hp = Math.max(0, h.hp - damage);
      h.reviving = null;
      if (!h.hp) down(s, h);
    }
    if (evaded) s.stats.dodged++;
    else if (guarded) s.stats.blocked++;
    log(s, 'boss', 'hit', evaded ? 'EVADED' : guarded ? 'BLOCKED' : 'HIT', h.id, damage, a.action);
  }
  s.recoveryUntil = s.clock + 1500;
}
function bossAI(s: RaidState) {
  const heroes = Object.values(s.raid.heroes).filter(alive);
  if (!heroes.length) return;
  const target = heroes.slice().sort((a, b) => b.threat - a.threat || a.id.localeCompare(b.id))[0];
  s.raid.targetId = target.id;
  const b = s.fighters.boss.position,
    p = target.fighter.position;
  const distance = Math.hypot(p.x - b.x, p.z - b.z);
  s.fighters.boss.movement =
    s.phase === 'ARENA' && distance > 3 && !s.pending.some((a) => a.role === 'boss')
      ? { x: (p.x - b.x) / distance, z: (p.z - b.z) / distance, sprint: false }
      : zero();
  if (s.clock < s.raid.nextAttackAt || s.pending.some((a) => a.role === 'boss')) return;
  s.raid.aiTurn++;
  const wave = s.raid.aiTurn % 4 === 0;
  const attackId = s.spec.bossAttacks[s.raid.aiTurn % 2];
  const attack = ATTACKS[attackId];
  for (const mark of wave ? heroes : [target]) {
    s.pending.push({
      id: nextId(s),
      role: 'boss',
      action: 'power',
      attackId,
      startedAt: s.clock,
      resolvesAt: s.clock + (wave ? 1600 : attack.warning + 300),
      damage: wave ? 18 : attack.damage + 3,
      volley: s.raid.aiTurn,
      radius: wave ? 0.17 : attack.radius * 0.8,
      target: { ...mark.screen },
      worldTarget: { ...mark.fighter.position },
    });
  }
  log(
    s,
    'boss',
    'power',
    wave ? 'CATACLYSM · SPREAD OUT' : `${attack.name.toUpperCase()} · ${target.name}`,
  );
  for (const h of heroes) h.threat *= 0.4;
  s.raid.nextAttackAt = s.clock + (s.phase === 'REALITY' ? 2800 : 3400);
}
function trainingAlly(s: RaidState, h: RaidHero) {
  const downed = Object.values(s.raid.heroes).find(
    (v) => v.id !== h.id && v.downedUntil !== null && !v.eliminated,
  );
  const p = h.fighter.position,
    target = downed?.fighter.position ?? s.fighters.boss.position;
  const distance = Math.hypot(p.x - target.x, p.z - target.z);
  if (h.reviving) return;
  if (downed) {
    if (s.phase === 'REALITY') {
      h.screen.x += (downed.screen.x - h.screen.x) * 0.12;
      h.screen.y += (downed.screen.y - h.screen.y) * 0.12;
    }
    if (near(s, h, downed)) {
      reviveHero(s, h.id, downed.id);
      return;
    }
  }
  moveHero(
    s,
    h.id,
    distance > (downed ? 2 : 2.8)
      ? { x: (target.x - p.x) / distance, z: (target.z - p.z) / distance, sprint: true }
      : zero(),
  );
  const incoming = s.pending.find((a) => a.role === 'boss' && a.resolvesAt - s.clock < 650);
  if (incoming) {
    heroIntent(s, h.id, 'guard');
    return;
  }
  if (!downed) heroIntent(s, h.id, (h.cooldowns.special ?? 0) <= s.clock ? 'special' : 'punch');
}
export function tickRaid(s: RaidState, delta: number) {
  if (
    ['VICTORY', 'DEFEAT', 'DISCONNECTED'].includes(s.phase) ||
    (s.phase === 'INTRO' && s.renderPending)
  )
    return;
  const dt = Math.max(0, Math.min(delta, 100));
  s.tick++;
  s.clock += dt;
  if (s.phase === 'INTRO' && s.clock - s.phaseAt >= 2800) {
    setPhase(s, 'ARENA');
    s.raid.nextAttackAt = s.clock + 1700;
  }
  if (s.phase === 'BREACH_TRANSITION' && s.clock - s.phaseAt >= 2600) {
    setPhase(s, 'REALITY');
    s.raid.nextAttackAt = s.clock + 1700;
  }
  if (!isCombat(s.phase)) return;
  s.elapsed += dt;
  if (s.elapsed >= s.raid.limit) {
    finish(s, false, 'The boss completed the Cataclysm. The squad ran out of time.');
    return;
  }
  const b = s.fighters.boss;
  b.position.x += ((b.movement.x * dt) / 1000) * 1.3;
  b.position.z += ((b.movement.z * dt) / 1000) * 1.3;
  contain(b.position);
  const completedRevives: string[] = [];
  for (const h of Object.values(s.raid.heroes)) {
    if (h.downedUntil !== null && s.clock >= h.downedUntil) {
      h.eliminated = true;
      h.downedUntil = null;
    }
    if (!alive(h)) continue;
    if (h.bot) trainingAlly(s, h);
    if (s.clock - h.fighter.moveAt > 350) h.fighter.movement = zero();
    const m = h.fighter.movement,
      speed = 3.4 * (m.sprint ? 1.65 : 1) * (h.dodgeUntil > s.clock ? 1.65 : 1);
    if (s.phase === 'REALITY') {
      h.screen.x = Math.max(
        0.08,
        Math.min(0.92, h.screen.x + ((m.x * dt) / 1000) * (m.sprint ? 0.29 : 0.19)),
      );
      h.screen.y = Math.max(
        0.46,
        Math.min(0.91, h.screen.y + ((m.z * dt) / 1000) * (m.sprint ? 0.2 : 0.13)),
      );
    } else {
      h.fighter.position.x += (m.x * speed * dt) / 1000;
      h.fighter.position.z += (m.z * speed * dt) / 1000;
      const p = h.fighter.position,
        distance = Math.hypot(p.x - b.position.x, p.z - b.position.z);
      if (distance < 1.8) {
        const angle = Math.atan2(p.z - b.position.z, p.x - b.position.x);
        p.x = b.position.x + Math.cos(angle) * 1.8;
        p.z = b.position.z + Math.sin(angle) * 1.8;
      }
      contain(p);
    }
    const channel = h.reviving;
    if (channel) {
      const target = s.raid.heroes[channel.targetId];
      const moved =
        s.phase === 'REALITY'
          ? Math.hypot(h.screen.x - channel.screen.x, h.screen.y - channel.screen.y) > 0.015
          : Math.hypot(
              h.fighter.position.x - channel.origin.x,
              h.fighter.position.z - channel.origin.z,
            ) > 0.2;
      if (
        !target ||
        target.downedUntil === null ||
        target.eliminated ||
        !near(s, h, target) ||
        moved
      )
        h.reviving = null;
      else if (s.clock - channel.startedAt >= 3000) {
        completedRevives.push(h.id);
      }
    }
  }
  const due = s.pending.filter((a) => a.resolvesAt <= s.clock);
  s.pending = s.pending.filter((a) => a.resolvesAt > s.clock);
  // An impact at the end of the channel must still interrupt a revive.
  const hitHeroes = new Set<string>();
  for (const a of due) {
    if (a.role === 'hero') heroHit(s, a);
    else bossHit(s, a, hitHeroes);
  }
  for (const id of completedRevives) {
    const h = s.raid.heroes[id],
      target = h.reviving && s.raid.heroes[h.reviving.targetId];
    if (!alive(h) || !target || target.eliminated || target.downedUntil === null) continue;
    target.hp = Math.ceil(s.spec.heroMaxHp * 0.4);
    target.downedUntil = null;
    target.immuneUntil = s.clock + 2000;
    h.reviving = null;
    h.revives++;
    s.raid.revives++;
    log(s, 'hero', 'revive', 'TEAMMATE REVIVED', target.id);
  }
  if (s.bossHp <= 0) {
    finish(s, true, 'Together, your squad brought down the colossus.');
    return;
  }
  if (!Object.values(s.raid.heroes).some(alive)) {
    finish(s, false, 'The entire squad fell. Stay together and revive your teammates.');
    return;
  }
  if (s.phase === 'ARENA' && s.bossHp <= s.raid.maxBossHp * 0.5) {
    setPhase(s, 'BREACH_TRANSITION');
    s.raid.vulnerableUntil = 0;
    s.raid.recentHits = {};
    s.raid.lastSpecial = null;
    for (const h of Object.values(s.raid.heroes)) h.reviving = null;
    return;
  }
  bossAI(s);
}
