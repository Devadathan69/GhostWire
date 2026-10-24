import { z } from 'zod';
import type { BattleSpec } from './index';

export const HeroActionSchema = z.enum(['punch', 'kick', 'guard', 'dodge', 'jump', 'special']);
export type HeroAction = z.infer<typeof HeroActionSchema>;
export const EffectSchema = z.enum([
  'thunder_strike',
  'flame_slash',
  'moon_shield',
  'fire_orb',
  'lightning_burst',
  'shadow_wave',
]);
export const ControlKeySchema = z.enum([
  'j',
  'k',
  'l',
  'i',
  'e',
  ' ',
  'u',
  'o',
  'p',
  'h',
  'b',
  'n',
  'm',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
]);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const AppearanceSchema = z
  .object({
    archetype: z.enum(['knight', 'mage', 'tech', 'beast', 'colossus', 'specter']),
    bodyColor: color,
    trimColor: color,
    accentColor: color,
    head: z.enum(['helmet', 'hood', 'mask', 'hair']),
    weapon: z.enum(['blade', 'staff', 'hammer', 'fists']),
    cape: z.boolean(),
    size: z.number().min(0.85).max(1.3),
  })
  .strict();
export const AbilitySchema = z
  .object({
    action: HeroActionSchema,
    name: z.string().min(1).max(28),
    description: z.string().min(1).max(140),
    key: ControlKeySchema,
    gesture: HeroActionSchema,
    effect: EffectSchema,
    damage: z.number().int().min(0).max(40),
    cooldownMs: z.number().int().min(200).max(12000),
  })
  .strict();
export type Ability = z.infer<typeof AbilitySchema>;
export const HeroDesignSchema = z
  .object({
    name: z.string().min(1).max(28),
    description: z.string().min(1).max(180),
    appearance: AppearanceSchema,
    abilities: z.array(AbilitySchema).length(6),
  })
  .strict();
export type HeroDesign = z.infer<typeof HeroDesignSchema>;
export const BossDesignSchema = z
  .object({
    name: z.string().min(1).max(28),
    description: z.string().min(1).max(180),
    appearance: AppearanceSchema,
    attacks: z
      .array(
        z
          .object({
            mechanic: z.enum(['claw_sweep', 'fire_orb', 'lightning_burst', 'shadow_wave']),
            name: z.string().min(1).max(28),
            damage: z.number().int().min(8).max(24),
            warning: z.number().int().min(900).max(2200),
            radius: z.number().min(0.12).max(0.3),
          })
          .strict(),
      )
      .length(2),
  })
  .strict();
export const EnvironmentSchema = z
  .object({
    name: z.string().min(1).max(40),
    description: z.string().min(1).max(180),
    biome: z.enum(['volcano', 'storm', 'shadow_forest', 'city', 'ice', 'desert', 'space']),
    skyColor: color,
    fogColor: color,
    groundColor: color,
    propColor: color,
    weather: z.enum(['embers', 'rain', 'snow', 'stars', 'mist']),
    groundMaterial: z.enum(['stone', 'metal', 'sand', 'ice']),
    props: z
      .array(
        z
          .object({
            kind: z.enum(['tower', 'tree', 'crystal', 'ruin', 'torch']),
            x: z.number().min(-14).max(14),
            z: z.number().min(-14).max(14),
            scale: z.number().min(0.5).max(3),
          })
          .strict(),
      )
      .min(2)
      .max(16),
  })
  .strict();
export const CreationSchema = z
  .object({
    context: z.string().min(1).max(500),
    explanation: z.string().min(1).max(500),
    heroes: z.array(HeroDesignSchema).min(2).max(4),
    boss: BossDesignSchema,
    environment: EnvironmentSchema,
  })
  .strict();
export type Creation = z.infer<typeof CreationSchema>;
export const ForgeBriefSchema = z
  .object({
    story: z.string().trim().min(3).max(1200),
    heroes: z.string().trim().max(240),
    boss: z.string().trim().max(120),
    environment: z.string().trim().max(400),
    powers: z.string().trim().max(500),
    controls: z.string().trim().max(400),
  })
  .strict();
export type ForgeBrief = z.infer<typeof ForgeBriefSchema>;
export const ACTION_LABELS: Record<HeroAction, string> = {
  punch: 'Strike',
  kick: 'Kick',
  guard: 'Guard',
  dodge: 'Evade',
  jump: 'Jump',
  special: 'Overdrive',
};
export const GESTURE_LABELS: Record<HeroAction, string> = {
  punch: 'Quick arm extension / palm swipe',
  kick: 'Knee above hip',
  guard: 'Cross wrists / fist',
  dodge: 'Small duck',
  jump: 'One hand overhead / index up',
  special: 'Both hands overhead / pinch',
};
export const HERO_ACTIONS: HeroAction[] = ['punch', 'kick', 'guard', 'dodge', 'jump', 'special'];
export function defaultHeroDesign(
  spec: Pick<BattleSpec, 'heroName' | 'heroPower' | 'primaryColor'>,
): HeroDesign {
  const keys = ['j', 'i', 'k', 'l', 'e', ' '] as const,
    damages = [8, 12, 0, 0, 0, 32],
    cooldowns = [440, 950, 1450, 1700, 1400, 8000];
  return {
    name: spec.heroName,
    description: 'An agile rift guardian with a complete playable hero loadout.',
    appearance: {
      archetype: 'knight',
      bodyColor: '#4a626b',
      trimColor: '#a7afb0',
      accentColor: spec.primaryColor,
      head: 'helmet',
      weapon: 'blade',
      cape: true,
      size: 1,
    },
    abilities: HERO_ACTIONS.map((action, i) => ({
      action,
      name: ACTION_LABELS[action],
      description: GESTURE_LABELS[action],
      key: keys[i],
      gesture: action,
      effect: spec.heroPower,
      damage: damages[i],
      cooldownMs: cooldowns[i],
    })),
  };
}
export function validateHeroDesign(hero: HeroDesign): string | null {
  if (new Set(hero.abilities.map((a) => a.action)).size !== 6)
    return 'Each of the six action slots must appear once.';
  if (new Set(hero.abilities.map((a) => a.key)).size !== 6)
    return 'Give each power its own keyboard key.';
  if (new Set(hero.abilities.map((a) => a.gesture)).size !== 6)
    return 'Give each power its own physical gesture.';
  for (const a of hero.abilities) {
    const min = { punch: 400, kick: 800, guard: 1200, dodge: 1500, jump: 1200, special: 6000 }[
      a.action
    ];
    const max = { punch: 12, kick: 18, guard: 0, dodge: 0, jump: 0, special: 40 }[a.action];
    if (
      a.cooldownMs < min ||
      a.damage > max ||
      (['punch', 'kick', 'special'].includes(a.action) && a.damage < 1)
    )
      return `${a.name}: damage or recharge time is outside this action's balanced limits.`;
  }
  return null;
}
export function validateCreation(creation: Creation): string | null {
  for (const hero of creation.heroes) {
    const error = validateHeroDesign(hero);
    if (error) return error;
  }
  if (creation.boss.attacks[0].mechanic === creation.boss.attacks[1].mechanic)
    return 'Give the boss two distinct attack mechanics.';
  return null;
}
