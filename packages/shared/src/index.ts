import { z } from 'zod';
import { CreationSchema, type HeroDesign } from './creative';
export * from './creative';

export const BattleSpecSchema = z
  .object({
    version: z.literal(1),
    title: z.string().min(1).max(48),
    heroName: z.string().min(1).max(28),
    bossName: z.string().min(1).max(28),
    introLine: z.string().min(1).max(140),
    victoryLine: z.string().min(1).max(140),
    arena: z.enum(['storm', 'volcano', 'shadow_forest']),
    elementalTheme: z.enum(['lightning', 'fire', 'shadow']),
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    heroPower: z.enum(['thunder_strike', 'flame_slash', 'moon_shield']),
    bossAttacks: z
      .array(z.enum(['claw_sweep', 'fire_orb', 'lightning_burst', 'shadow_wave']))
      .length(2),
    bossMaxHp: z.number().int().min(80).max(150),
    heroMaxHp: z.number().int().min(70).max(120),
    phaseTwoAt: z.literal(0.5),
    creation: CreationSchema.optional(),
  })
  .strict();
export type BattleSpec = z.infer<typeof BattleSpecSchema>;
export const CreativeEncounterSchema = BattleSpecSchema.required({ creation: true });
export const PRESETS: Record<string, BattleSpec> = {
  ember: {
    version: 1,
    title: 'Storm Over Emberfall',
    heroName: 'Stormwarden',
    bossName: 'The Ember Colossus',
    introLine: 'You cannot extinguish a mountain with thunder.',
    victoryLine: 'Even mountains fall to the storm.',
    arena: 'volcano',
    elementalTheme: 'lightning',
    primaryColor: '#a7f3e0',
    secondaryColor: '#ff7448',
    heroPower: 'thunder_strike',
    bossAttacks: ['claw_sweep', 'fire_orb'],
    bossMaxHp: 120,
    heroMaxHp: 100,
    phaseTwoAt: 0.5,
  },
  shadow: {
    version: 1,
    title: 'The Hollow Moon',
    heroName: 'Moonblade',
    bossName: 'The Hollow Monarch',
    introLine: 'Every light leaves a shadow. Yours belongs to me.',
    victoryLine: 'The forest remembers the light.',
    arena: 'shadow_forest',
    elementalTheme: 'shadow',
    primaryColor: '#c9b6ff',
    secondaryColor: '#ad70ff',
    heroPower: 'moon_shield',
    bossAttacks: ['shadow_wave', 'claw_sweep'],
    bossMaxHp: 110,
    heroMaxHp: 100,
    phaseTwoAt: 0.5,
  },
  storm: {
    version: 1,
    title: 'Eye of the Tempest',
    heroName: 'Ashwalker',
    bossName: 'The Static Warden',
    introLine: 'The sky has no room for two gods.',
    victoryLine: 'Silence, at last, after the storm.',
    arena: 'storm',
    elementalTheme: 'fire',
    primaryColor: '#ffb55e',
    secondaryColor: '#5acfff',
    heroPower: 'flame_slash',
    bossAttacks: ['lightning_burst', 'claw_sweep'],
    bossMaxHp: 130,
    heroMaxHp: 110,
    phaseTwoAt: 0.5,
  },
};
export const ActionSchema = z.enum([
  'punch',
  'guard',
  'dodge',
  'special',
  'left',
  'right',
  'swipe',
  'power',
  'forward',
  'back',
  'jump',
  'kick',
]);
export type Action = z.infer<typeof ActionSchema>;
export type Role = 'hero' | 'boss';
export const WorldPositionSchema = z
  .object({ x: z.number().finite().min(-20).max(20), z: z.number().finite().min(-20).max(20) })
  .strict();
export type WorldPosition = z.infer<typeof WorldPositionSchema>;
export const MovementSchema = z
  .object({
    x: z.number().finite().min(-1).max(1),
    z: z.number().finite().min(-1).max(1),
    sprint: z.boolean(),
  })
  .strict();
export type Movement = z.infer<typeof MovementSchema>;
export const TargetSchema = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    world: WorldPositionSchema.optional(),
  })
  .strict();
export type Target = z.infer<typeof TargetSchema>;
export const IntentSchema = z
  .object({
    action: ActionSchema,
    sequence: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    target: TargetSchema.optional(),
  })
  .strict();
export const COOLDOWNS: Record<Action, number> = {
  punch: 440,
  guard: 1450,
  dodge: 1700,
  special: 8000,
  left: 200,
  right: 200,
  swipe: 1800,
  power: 3600,
  forward: 180,
  back: 180,
  jump: 1400,
  kick: 950,
};
export const ARENA_RADIUS = 6.25;
export const WALK_SPEED = { hero: 3.4, boss: 2.25 };
export const MELEE_RANGE = { punch: 4.3, kick: 3.8 };
export type FighterState = { position: WorldPosition; movement: Movement; moveAt: number };
export const ATTACKS = {
  claw_sweep: { name: 'Claw sweep', damage: 10, warning: 800, radius: 0.27 },
  fire_orb: { name: 'Ember fall', damage: 16, warning: 1150, radius: 0.22 },
  lightning_burst: { name: 'Thunder mark', damage: 15, warning: 1000, radius: 0.2 },
  shadow_wave: { name: 'Hollow wave', damage: 12, warning: 950, radius: 0.28 },
};
export type Phase =
  | 'LOBBY'
  | 'CALIBRATING'
  | 'INTRO'
  | 'ARENA'
  | 'BREACH_TRANSITION'
  | 'REALITY'
  | 'VICTORY'
  | 'DEFEAT'
  | 'DISCONNECTED';
export type Player = {
  connected: boolean;
  ready: boolean;
  camera: boolean;
  controlMode: 'manual' | 'motion';
};
export type HitEvent = {
  id: number;
  at: number;
  role: Role;
  action: string;
  damage: number;
  label: string;
  move?: Action;
  playerId?: string;
};
export type PendingAttack = {
  id: number;
  role: Role;
  action: Action;
  attackId?: keyof typeof ATTACKS;
  resolvesAt: number;
  startedAt: number;
  damage: number;
  target: Target;
  radius: number;
  worldTarget?: WorldPosition;
  playerId?: string;
  volley?: number;
  regionId?: string;
  targetRegionId?: string;
  effect?: import('./creative').Ability['effect'];
};
export type BattleState = {
  code: string;
  spec: BattleSpec;
  source: 'ai' | 'preset' | 'custom';
  sourceNote: string;
  practice: boolean;
  phase: Phase;
  resumePhase: Phase | null;
  phaseAt: number;
  clock: number;
  tick: number;
  heroHp: number;
  bossHp: number;
  heroLane: number;
  fighters: Record<Role, FighterState>;
  heroScreen: Target;
  jumpUntil: number;
  bossTarget: Target;
  heroGuardUntil: number;
  bossGuardUntil: number;
  dodgeUntil: number;
  recoveryUntil: number;
  cooldowns: Record<Role, Partial<Record<Action, number>>>;
  pending: PendingAttack[];
  players: Record<Role, Player>;
  events: HitEvent[];
  elapsed: number;
  stats: { damage: number; blocked: number; dodged: number; strikes: number };
  reconnectUntil: number | null;
  renderPending: boolean;
  renderReady: Record<Role, boolean>;
  renderDeadline: number | null;
  raid?: RaidData;
  viewPlayerId?: string;
  viewRegionId?: string;
};
export type Session = { code: string; role: Role; token: string; playerId?: string };
export const MAX_RAID_PLAYERS = 4;
export const RAID_COLORS = ['#a7f3e0', '#c9b6ff', '#ffb55e', '#5acfff'];
export type RaidHero = Player & {
  id: string;
  name: string;
  color: string;
  bot: boolean;
  hp: number;
  fighter: FighterState;
  screen: Target;
  guardUntil: number;
  dodgeUntil: number;
  jumpUntil: number;
  immuneUntil: number;
  cooldowns: Partial<Record<Action, number>>;
  downedUntil: number | null;
  eliminated: boolean;
  renderReady: boolean;
  damage: number;
  revives: number;
  threat: number;
  design?: HeroDesign;
  regionId: string;
  travel: { from: string; to: string; arrivesAt: number; origin: WorldPosition } | null;
  travelReadyAt: number;
  reviving: { targetId: string; startedAt: number; origin: WorldPosition; screen: Target } | null;
};
export type RaidData = {
  heroes: Record<string, RaidHero>;
  hostId: string;
  maxBossHp: number;
  vulnerableUntil: number;
  recentHits: Record<string, number>;
  lastSpecial: { playerId: string; at: number } | null;
  bursts: number;
  revives: number;
  nextAttackAt: number;
  aiTurn: number;
  targetId: string | null;
  limit: number;
  endReason: string;
  regions: Record<string, RaidRegion>;
  bossRegionId: string;
  bossTransit: { from: string; to: string; arrivesAt: number; startedAt: number } | null;
  nextRoamAt: number;
};
export type RaidRegion = {
  id: string;
  ownerId: string;
  name: string;
  color: string;
  index: number;
  createdAt: number;
};
export type RaidState = BattleState & { raid: RaidData };
/** Project the shared raid onto this hero's existing input and rendering contract. */
export function heroView(s: BattleState, playerId?: string): BattleState {
  const hero = s.raid?.heroes[playerId ?? ''];
  if (!hero) return s;
  return {
    ...s,
    viewPlayerId: hero.id,
    viewRegionId: hero.regionId,
    spec: { ...s.spec, bossMaxHp: s.raid!.maxBossHp },
    heroHp: hero.hp,
    heroScreen: hero.screen,
    heroGuardUntil: hero.guardUntil,
    dodgeUntil: hero.dodgeUntil,
    jumpUntil: hero.jumpUntil,
    fighters: { ...s.fighters, hero: hero.fighter },
    cooldowns: { ...s.cooldowns, hero: hero.cooldowns },
    players: { ...s.players, hero },
  };
}
export type Ack<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
export type RoomReply = { session: Session; state: BattleState; joinUrl: string };
export type Signal = {
  type: 'offer' | 'answer' | 'ice' | 'request' | 'stop';
  sdp?: string;
  candidate?: RTCIceCandidateInit;
  generation?: string;
};
export function heroPosition(
  s: Pick<BattleState, 'phase' | 'resumePhase' | 'heroLane'> &
    Partial<Pick<BattleState, 'heroScreen'>>,
): Target {
  const phase = s.phase === 'DISCONNECTED' ? s.resumePhase : s.phase;
  if (phase === 'REALITY' && s.heroScreen) return s.heroScreen;
  return { x: phase === 'REALITY' ? 0.25 + s.heroLane * 0.25 : 0.21 + s.heroLane * 0.135, y: 0.79 };
}
export function isCombat(phase: Phase) {
  return phase === 'ARENA' || phase === 'REALITY';
}
/** Mirrored, object-fit:cover mapping shared by inference, rendering, and tests. */
export function cameraToStage(
  point: Target,
  width: number,
  height: number,
  mirrored = true,
): Target {
  const scale = Math.max(1280 / width, 720 / height);
  return {
    x: Math.max(
      0,
      Math.min(
        1,
        ((mirrored ? 1 - point.x : point.x) * width * scale - (width * scale - 1280) / 2) / 1280,
      ),
    ),
    y: Math.max(0, Math.min(1, (point.y * height * scale - (height * scale - 720) / 2) / 720)),
  };
}
