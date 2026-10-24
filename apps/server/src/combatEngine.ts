import {
  ATTACKS,
  COOLDOWNS,
  heroPosition,
  isCombat,
  type Action,
  type BattleSpec,
  type BattleState,
  type Role,
  type Target,
  type Movement,
  ARENA_RADIUS,
  WALK_SPEED,
  MELEE_RANGE,
} from '@ghostwire/shared';

export function createState(code: string, spec: BattleSpec, practice = false): BattleState {
  return {
    code,
    spec,
    source: 'preset',
    sourceNote: 'Curated encounter',
    practice,
    phase: 'LOBBY',
    resumePhase: null,
    phaseAt: 0,
    clock: 0,
    tick: 0,
    heroHp: spec.heroMaxHp,
    bossHp: spec.bossMaxHp,
    heroLane: 1,
    fighters: {
      hero: {
        position: { x: -1.6, z: 1.4 },
        movement: { x: 0, z: 0, sprint: false },
        moveAt: -1000,
      },
      boss: {
        position: { x: 1.3, z: -0.4 },
        movement: { x: 0, z: 0, sprint: false },
        moveAt: -1000,
      },
    },
    heroScreen: { x: 0.5, y: 0.79 },
    jumpUntil: 0,
    bossTarget: { x: 0.5, y: 0.79 },
    heroGuardUntil: 0,
    bossGuardUntil: 0,
    dodgeUntil: 0,
    recoveryUntil: 0,
    cooldowns: { hero: {}, boss: {} },
    pending: [],
    players: {
      hero: { connected: true, ready: false, camera: false, controlMode: 'manual' },
      boss: { connected: practice, ready: practice, camera: false, controlMode: 'manual' },
    },
    events: [],
    elapsed: 0,
    stats: { damage: 0, blocked: 0, dodged: 0, strikes: 0 },
    reconnectUntil: null,
    renderPending: false,
    renderReady: { hero: false, boss: practice },
    renderDeadline: null,
  };
}
export function setPhase(s: BattleState, phase: BattleState['phase']) {
  s.phase = phase;
  s.phaseAt = s.clock;
  s.pending = [];
}
export function startBattle(s: BattleState, waitForRenderer = false): string | null {
  if (!['LOBBY', 'CALIBRATING'].includes(s.phase)) return 'The raid has already started.';
  if (
    !s.players.hero.ready ||
    !s.players.boss.ready ||
    !s.players.hero.connected ||
    !s.players.boss.connected
  )
    return 'Both players need to be connected and ready.';
  setPhase(s, 'INTRO');
  s.renderPending = waitForRenderer;
  s.renderDeadline = waitForRenderer ? Date.now() + 60000 : null;
  return null;
}
function event(
  s: BattleState,
  role: Role,
  action: string,
  damage: number,
  label: string,
  move?: Action,
) {
  const id = (s.events.at(-1)?.id ?? 0) + 1;
  s.events.push({ id, at: s.clock, role, action, damage, label, ...(move ? { move } : {}) });
  s.events = s.events.slice(-12);
}
export function applyIntent(
  s: BattleState,
  role: Role,
  action: Action,
  target?: Target,
): string | null {
  if (!isCombat(s.phase)) return 'Combat is paused.';
  if (
    role === 'hero'
      ? ['swipe', 'power'].includes(action)
      : !['swipe', 'power', 'guard', 'left', 'right', 'forward', 'back'].includes(action)
  )
    return 'That move belongs to the other role.';
  if ((s.cooldowns[role][action] ?? 0) > s.clock) return 'Move is recharging.';
  if (
    ['punch', 'kick', 'special', 'swipe', 'power'].includes(action) &&
    s.pending.some((a) => a.role === role)
  )
    return 'Finish the current attack first.';
  if (action === 'guard' && s.pending.some((a) => a.role === role))
    return 'Cannot guard while attacking.';
  s.cooldowns[role][action] = s.clock + COOLDOWNS[action];
  if (target && role === 'boss') s.bossTarget = target;
  if (['left', 'right', 'forward', 'back'].includes(action)) {
    if (s.phase === 'REALITY' && role === 'boss') return null;
    const dx = action === 'left' ? -1 : action === 'right' ? 1 : 0;
    const dz = action === 'forward' ? -1 : action === 'back' ? 1 : 0;
    const p = s.fighters[role].position;
    p.x += dx * 0.65;
    p.z += dz * 0.65;
    contain(p);
    if (s.phase === 'REALITY') {
      s.heroScreen.x = Math.max(0.08, Math.min(0.92, s.heroScreen.x + dx * 0.1));
      s.heroScreen.y = Math.max(0.46, Math.min(0.91, s.heroScreen.y + dz * 0.07));
    }
    if (role === 'hero' && (action === 'left' || action === 'right'))
      s.heroLane = Math.max(0, Math.min(2, s.heroLane + dx));
    return null;
  }
  if (action === 'jump') {
    s.jumpUntil = s.clock + 800;
    event(s, role, action, 0, 'JUMP');
    return null;
  }
  if (action === 'guard') {
    s[role === 'hero' ? 'heroGuardUntil' : 'bossGuardUntil'] = s.clock + 1100;
    event(s, role, action, 0, 'GUARD');
    return null;
  }
  if (action === 'dodge') {
    s.dodgeUntil = s.clock + 600;
    event(s, role, action, 0, 'EVADE');
    return null;
  }
  let damage = action === 'special' ? 20 : action === 'kick' ? 10 : 6,
    warning = action === 'special' ? 1100 : action === 'kick' ? 300 : 170,
    radius = 1;
  const attackId = role === 'boss' ? s.spec.bossAttacks[action === 'swipe' ? 0 : 1] : undefined;
  if (attackId) {
    const a = ATTACKS[attackId];
    damage = a.damage;
    warning = a.warning;
    radius = a.radius;
  }
  if (role === 'hero') s.heroGuardUntil = 0;
  else s.bossGuardUntil = 0;
  const id = s.tick * 100 + s.pending.length;
  s.pending.push({
    id,
    role,
    action,
    attackId,
    damage,
    startedAt: s.clock,
    resolvesAt: s.clock + warning,
    target: { ...(target ?? s.bossTarget) },
    radius,
    ...(role === 'boss' && s.phase === 'ARENA'
      ? {
          worldTarget: {
            ...(attackId === 'claw_sweep'
              ? s.fighters.hero.position
              : (target?.world ?? s.bossTarget.world ?? s.fighters.hero.position)),
          },
        }
      : {}),
  });
  event(
    s,
    role,
    action,
    0,
    role === 'boss'
      ? ATTACKS[attackId!].name.toUpperCase()
      : action === 'special'
        ? 'SPECIAL'
        : 'STRIKE',
  );
  return null;
}

function contain(p: { x: number; z: number }) {
  const distance = Math.hypot(p.x, p.z);
  if (distance > ARENA_RADIUS) {
    p.x *= ARENA_RADIUS / distance;
    p.z *= ARENA_RADIUS / distance;
  }
}
export function applyMovement(s: BattleState, role: Role, input: Movement): string | null {
  if (!isCombat(s.phase)) return 'Combat is paused.';
  if (s.phase === 'REALITY' && role === 'boss')
    return 'Aim your hand or pointer during Reality Breach.';
  const length = Math.max(1, Math.hypot(input.x, input.z));
  s.fighters[role].movement = { x: input.x / length, z: input.z / length, sprint: input.sprint };
  s.fighters[role].moveAt = s.clock;
  return null;
}
function moveFighters(s: BattleState, dt: number) {
  for (const role of ['hero', 'boss'] as const) {
    const fighter = s.fighters[role];
    if (s.clock - fighter.moveAt > 350 || (s.phase === 'REALITY' && role === 'boss')) {
      fighter.movement = { x: 0, z: 0, sprint: false };
    }
    const input = fighter.movement;
    const speed =
      WALK_SPEED[role] *
      (input.sprint ? 1.65 : 1) *
      (role === 'hero' && s.dodgeUntil > s.clock ? 1.65 : 1);
    if (s.phase === 'REALITY') {
      if (role === 'hero') {
        s.heroScreen.x = Math.max(
          0.08,
          Math.min(0.92, s.heroScreen.x + input.x * dt * (input.sprint ? 0.29 : 0.19)),
        );
        s.heroScreen.y = Math.max(
          0.46,
          Math.min(0.91, s.heroScreen.y + input.z * dt * (input.sprint ? 0.2 : 0.13)),
        );
      }
    } else {
      fighter.position.x += input.x * speed * dt;
      fighter.position.z += input.z * speed * dt;
      contain(fighter.position);
    }
  }
  if (s.phase === 'ARENA') {
    const h = s.fighters.hero.position,
      b = s.fighters.boss.position;
    const dx = h.x - b.x,
      dz = h.z - b.z,
      distance = Math.hypot(dx, dz);
    if (distance < 1.7) {
      const angle = Math.atan2(dz, dx);
      h.x = b.x + Math.cos(angle) * 1.7;
      h.z = b.z + Math.sin(angle) * 1.7;
      contain(h);
    }
  }
}
export function tickBattle(s: BattleState, dt: number) {
  s.tick++;
  if (s.phase === 'DISCONNECTED' || s.phase === 'VICTORY' || s.phase === 'DEFEAT') return;
  if (s.phase === 'INTRO' && s.renderPending) return;
  s.clock += Math.max(0, Math.min(dt, 100));
  if (s.phase === 'INTRO' && s.clock - s.phaseAt >= 2800) setPhase(s, 'ARENA');
  if (s.phase === 'BREACH_TRANSITION' && s.clock - s.phaseAt >= 2600) setPhase(s, 'REALITY');
  if (!isCombat(s.phase)) return;
  s.elapsed += Math.max(0, Math.min(dt, 100));
  moveFighters(s, Math.max(0, Math.min(dt, 100)) / 1000);
  const due = s.pending.filter((a) => a.resolvesAt <= s.clock);
  s.pending = s.pending.filter((a) => a.resolvesAt > s.clock);
  for (const a of due) {
    if (a.role === 'hero') {
      const guarded = s.bossGuardUntil > s.clock;
      const armored = s.pending.some((p) => p.role === 'boss');
      const h = s.fighters.hero.position,
        b = s.fighters.boss.position;
      const missed =
        s.phase === 'ARENA' &&
        a.action !== 'special' &&
        Math.hypot(h.x - b.x, h.z - b.z) > MELEE_RANGE[a.action === 'kick' ? 'kick' : 'punch'];
      const damage = missed
        ? 0
        : Math.round(
            a.damage * (guarded ? 0.2 : armored ? 0.5 : s.recoveryUntil > s.clock ? 1.25 : 1),
          );
      s.bossHp = Math.max(0, s.bossHp - damage);
      s.stats.damage += damage;
      s.stats.strikes++;
      if (a.action === 'special' && s.spec.heroPower === 'moon_shield')
        s.heroGuardUntil = s.clock + 2200;
      event(
        s,
        'hero',
        'hit',
        damage,
        missed
          ? 'MOVE CLOSER'
          : guarded
            ? 'BOSS GUARDED'
            : armored
              ? 'ARMORED'
              : s.recoveryUntil > s.clock
                ? 'EXPOSED'
                : 'HIT',
        a.action,
      );
    } else {
      const pos = heroPosition(s);
      const areaMiss =
        s.phase === 'REALITY'
          ? Math.hypot(pos.x - a.target.x, (pos.y - a.target.y) * 0.5625) > a.radius
          : !!a.worldTarget &&
            Math.hypot(
              s.fighters.hero.position.x - a.worldTarget.x,
              s.fighters.hero.position.z - a.worldTarget.z,
            ) >
              a.radius * 9;
      const jumpProgress = (800 - (s.jumpUntil - s.clock)) / 800;
      const airborne = s.jumpUntil > s.clock && jumpProgress > 0.18 && jumpProgress < 0.82;
      const dodged = s.dodgeUntil > s.clock || airborne || areaMiss;
      const guarded = s.heroGuardUntil > s.clock;
      const damage = dodged ? 0 : Math.round(a.damage * (guarded ? 0.2 : 1));
      s.heroHp = Math.max(0, s.heroHp - damage);
      s.recoveryUntil = s.clock + 1100;
      if (dodged) s.stats.dodged++;
      else if (guarded) s.stats.blocked++;
      event(
        s,
        'boss',
        'hit',
        damage,
        airborne ? 'JUMP EVADE' : dodged ? 'EVADED' : guarded ? 'BLOCKED' : 'HIT',
        a.action,
      );
    }
    if (s.bossHp <= 0) {
      setPhase(s, 'VICTORY');
      return;
    }
    if (s.heroHp <= 0) {
      setPhase(s, 'DEFEAT');
      return;
    }
    if (s.phase === 'ARENA' && s.bossHp <= s.spec.bossMaxHp * s.spec.phaseTwoAt) {
      setPhase(s, 'BREACH_TRANSITION');
      return;
    }
  }
}
