import { ArrowRight, Flame, Shield, Swords, Wind, Zap } from 'lucide-react';
import {
  COOLDOWNS,
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
          const remaining = Math.max(0, (state.cooldowns[role][m.action] ?? 0) - state.clock),
            Icon = m.icon;
          return (
            <button
              key={m.action}
              className={`action-button ${m.action === 'special' || m.action === 'power' ? 'power-button' : ''}`}
              aria-label={m.name}
              onClick={() => onAction(m.action)}
              disabled={!active || remaining > 0}
            >
              <span
                className="cooldown-fill"
                style={{ width: `${(remaining / COOLDOWNS[m.action]) * 100}%` }}
              />
              <Icon size={21} />
              <div>
                <strong>{m.name}</strong>
                <small>{remaining > 0 ? `${(remaining / 1000).toFixed(1)}s` : 'Ready'}</small>
              </div>
              <kbd>{m.key}</kbd>
            </button>
          );
        })}
      </div>
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
