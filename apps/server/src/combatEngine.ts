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
  };
}
export function setPhase(s: BattleState, phase: BattleState['phase']) {
  s.phase = phase;
  s.phaseAt = s.clock;
  s.pending = [];
}
export function startBattle(s: BattleState): string | null {
  if (!['LOBBY', 'CALIBRATING'].includes(s.phase)) return 'The raid has already started.';
  if (
    !s.players.hero.ready ||
    !s.players.boss.ready ||
    !s.players.hero.connected ||
    !s.players.boss.connected
  )
    return 'Both players need to be connected and ready.';
  setPhase(s, 'INTRO');
  return null;
}
function event(s: BattleState, role: Role, action: string, damage: number, label: string) {
  const id = (s.events.at(-1)?.id ?? 0) + 1;
  s.events.push({ id, at: s.clock, role, action, damage, label });
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
      : !['swipe', 'power', 'guard'].includes(action)
  )
    return 'That move belongs to the other role.';
  if ((s.cooldowns[role][action] ?? 0) > s.clock) return 'Move is recharging.';
  if (
    ['punch', 'special', 'swipe', 'power'].includes(action) &&
    s.pending.some((a) => a.role === role)
  )
    return 'Finish the current attack first.';
  if (action === 'guard' && s.pending.some((a) => a.role === role))
    return 'Cannot guard while attacking.';
  s.cooldowns[role][action] = s.clock + COOLDOWNS[action];
  if (target && role === 'boss') s.bossTarget = target;
  if (action === 'left' || action === 'right') {
    s.heroLane = Math.max(0, Math.min(2, s.heroLane + (action === 'left' ? -1 : 1)));
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
  let damage = action === 'special' ? 20 : 6,
    warning = action === 'special' ? 480 : 170,
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
export function tickBattle(s: BattleState, dt: number) {
  s.tick++;
  if (s.phase === 'DISCONNECTED' || s.phase === 'VICTORY' || s.phase === 'DEFEAT') return;
  s.clock += Math.max(0, Math.min(dt, 100));
  if (s.phase === 'INTRO' && s.clock - s.phaseAt >= 2800) setPhase(s, 'ARENA');
  if (s.phase === 'BREACH_TRANSITION' && s.clock - s.phaseAt >= 2600) setPhase(s, 'REALITY');
  if (!isCombat(s.phase)) return;
  s.elapsed += Math.max(0, Math.min(dt, 100));
  const due = s.pending.filter((a) => a.resolvesAt <= s.clock);
  s.pending = s.pending.filter((a) => a.resolvesAt > s.clock);
  for (const a of due) {
    if (a.role === 'hero') {
      const guarded = s.bossGuardUntil > s.clock;
      const armored = s.pending.some((p) => p.role === 'boss');
      const damage = Math.round(
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
        guarded
          ? 'BOSS GUARDED'
          : armored
            ? 'ARMORED'
            : s.recoveryUntil > s.clock
              ? 'EXPOSED'
              : 'HIT',
      );
    } else {
      const pos = heroPosition(s);
      const areaMiss =
        s.phase === 'REALITY'
          ? Math.hypot(pos.x - a.target.x, (pos.y - a.target.y) * 0.5625) > a.radius
          : a.attackId !== 'claw_sweep' && Math.abs(pos.x - a.target.x) > a.radius;
      const dodged = s.dodgeUntil > s.clock || areaMiss;
      const guarded = s.heroGuardUntil > s.clock;
      const damage = dodged ? 0 : Math.round(a.damage * (guarded ? 0.2 : 1));
      s.heroHp = Math.max(0, s.heroHp - damage);
      s.recoveryUntil = s.clock + 1100;
      if (dodged) s.stats.dodged++;
      else if (guarded) s.stats.blocked++;
      event(s, 'boss', 'hit', damage, dodged ? 'EVADED' : guarded ? 'BLOCKED' : 'HIT');
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
