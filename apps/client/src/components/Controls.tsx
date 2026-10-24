import { ArrowRight, Flame, Shield, Swords, Wind, Zap } from 'lucide-react';
import {
  COOLDOWNS,
  GESTURE_LABELS,
  isCombat,
  type Action,
  type BattleState,
  type Role,
  type Movement,
} from '@ghostwire/shared';
import { MovementPad } from './MovementPad';
const heroMoves = [
  { action: 'punch', name: 'Strike', key: 'J', icon: Swords, detail: 'Extend arm' },
  { action: 'guard', name: 'Guard', key: 'K', icon: Shield, detail: 'Cross hands' },
  { action: 'dodge', name: 'Evade', key: 'L', icon: Wind, detail: 'Duck slightly' },
  { action: 'special', name: 'Overdrive', key: 'SPACE', icon: Zap, detail: '8 second charge' },
  { action: 'kick', name: 'Kick', key: 'I', icon: ArrowRight, detail: 'Lift one knee' },
  { action: 'jump', name: 'Jump', key: 'E', icon: Wind, detail: 'One hand above head' },
] as const;
const bossMoves = [
  { action: 'swipe', name: 'Swipe', key: 'J', icon: Swords, detail: 'Extend arm' },
  { action: 'guard', name: 'Guard', key: 'K', icon: Shield, detail: 'Cross hands' },
  { action: 'power', name: 'Power', key: 'SPACE', icon: Flame, detail: 'Raise both hands' },
] as const;
export function Controls({
  state,
  role,
  onAction,
  connected,
  onMove,
}: {
  state: BattleState;
  role: Role;
  onAction: (a: Action) => void;
  connected: boolean;
  onMove: (value: Movement) => void;
}) {
  const active = isCombat(state.phase) && connected;
  return (
    <div className="controls-section">
      <div className="controls-label">
        <span>YOUR {role === 'hero' ? 'HERO' : 'BOSS'} CONTROLS</span>
        <span>KEYBOARD · TOUCH · MOTION</span>
      </div>
      <div className={`action-controls ${role === 'boss' ? 'boss-controls' : ''}`}>
        {(role === 'hero' ? heroMoves : bossMoves).map((m) => {
          const ability = state.raid?.heroes[state.viewPlayerId ?? '']?.design?.abilities.find(
            (a) => a.action === m.action,
          );
          const remaining = Math.max(0, (state.cooldowns[role][m.action] ?? 0) - state.clock),
            Icon = m.icon;
          const remoteKick =
            m.action === 'kick' &&
            state.raid &&
            state.raid.heroes[state.viewPlayerId ?? '']?.regionId !== state.raid.bossRegionId;
          return (
            <button
              key={m.action}
              className={`action-button ${m.action === 'special' || m.action === 'power' ? 'power-button' : ''}`}
              aria-label={ability?.name ?? m.name}
              title={
                ability
                  ? `${ability.description} · ${GESTURE_LABELS[ability.gesture]} · ${ability.damage} damage · ${ability.cooldownMs / 1000}s recharge`
                  : m.detail
              }
              onClick={() => onAction(m.action)}
              disabled={!active || remaining > 0 || Boolean(remoteKick)}
            >
              <span
                className="cooldown-fill"
                style={{
                  width: `${Math.min(100, (remaining / (ability?.cooldownMs ?? COOLDOWNS[m.action])) * 100)}%`,
                }}
              />
              <Icon size={21} />
              <div>
                <strong>{ability?.name ?? m.name}</strong>
                <small>
                  {remoteKick
                    ? 'Travel to boss'
                    : remaining > 0
                      ? `${(remaining / 1000).toFixed(1)}s`
                      : 'Ready'}
                </small>
              </div>
              <kbd>
                {ability ? (ability.key === ' ' ? 'SPACE' : ability.key.toUpperCase()) : m.key}
              </kbd>
            </button>
          );
        })}
      </div>
      {state.raid?.heroes[state.viewPlayerId ?? '']?.design && (
        <details className="custom-control-guide">
          <summary>Your power and motion guide</summary>
          {state.raid.heroes[state.viewPlayerId!].design!.abilities.map((a) => (
            <p key={a.action}>
              <strong>{a.name}</strong> · {a.key === ' ' ? 'Space' : a.key.toUpperCase()} ·{' '}
              {GESTURE_LABELS[a.gesture]}
              <br />
              {a.description} · {a.damage} damage · {a.cooldownMs / 1000}s recharge
            </p>
          ))}
        </details>
      )}
      {(role === 'hero' || state.phase !== 'REALITY') && (
        <MovementPad disabled={!active} onMove={onMove} onStep={onAction} />
      )}
      {role === 'boss' && (
        <p className="boss-aim-tip">
          In Reality Breach, move your hand or touch the arena to aim, then strike.
        </p>
      )}
    </div>
  );
}
