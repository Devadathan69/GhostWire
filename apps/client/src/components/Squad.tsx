import type { BattleState } from '@ghostwire/shared';
import { HeartHandshake, Shield, Users } from 'lucide-react';

export function Squad({
  state,
  playerId,
  onRevive,
}: {
  state: BattleState;
  playerId: string;
  onRevive: (id: string) => void;
}) {
  const raid = state.raid!,
    me = raid.heroes[playerId];
  return (
    <section className="squad-panel">
      <div className="section-heading">
        <h3>
          <Users size={17} /> Your squad
        </h3>
        <span>{Object.keys(raid.heroes).length}/4</span>
      </div>
      {Object.values(raid.heroes).map((h) => (
        <div
          className={`squad-member ${h.hp <= 0 ? 'is-down' : ''}`}
          key={h.id}
          data-testid={`squad-${h.id}`}
          data-self={h.id === playerId}
          data-world={`${h.fighter.position.x},${h.fighter.position.z}`}
          data-screen={`${h.screen.x},${h.screen.y}`}
          data-downed={h.downedUntil !== null && !h.eliminated}
          data-hp={h.hp}
          data-damage={h.damage}
          data-region={h.regionId}
        >
          <span className="squad-color" style={{ background: h.color }} />
          <div className="squad-info">
            <strong>
              {h.name}
              {h.id === playerId ? ' (you)' : ''}
              {h.id === raid.hostId ? ' · leader' : ''}
            </strong>
            <small>
              {!h.connected
                ? 'Reconnecting…'
                : h.eliminated
                  ? 'Out · spectating'
                  : h.downedUntil !== null
                    ? `DOWN · ${Math.max(0, Math.ceil((h.downedUntil - state.clock) / 1000))}s to rescue`
                    : h.bot
                      ? 'AI training ally'
                      : `${h.hp} / ${state.spec.heroMaxHp} HP`}
            </small>
            <small>
              {h.design?.name ? `${h.design.name} · ` : ''}
              {raid.regions[h.regionId]?.name}
              {h.travel ? ' · Crossing rift…' : ''}
            </small>
            <div className="squad-hp">
              <span
                style={{ width: `${(h.hp / state.spec.heroMaxHp) * 100}%`, background: h.color }}
              />
            </div>
          </div>
          {h.downedUntil !== null &&
            !h.eliminated &&
            h.connected &&
            h.id !== playerId &&
            me.hp > 0 && (
              <button
                className="button secondary small"
                disabled={
                  me.regionId !== h.regionId ||
                  Boolean(me.reviving) ||
                  state.phase === 'DISCONNECTED'
                }
                onClick={() => onRevive(h.id)}
                aria-label={`Revive ${h.name}`}
              >
                <HeartHandshake size={16} />
                Revive
              </button>
            )}
        </div>
      ))}
      {me.reviving && (
        <div className="revive-progress" role="status">
          <HeartHandshake size={18} />
          Reviving {raid.heroes[me.reviving.targetId]?.name} · stay still
          <progress max={3000} value={state.clock - me.reviving.startedAt} />
        </div>
      )}
      {me.hp <= 0 && (
        <p className="inline-notice" role="status">
          {me.eliminated
            ? 'You are spectating. Your team can still win.'
            : 'You are down! A teammate has 20 seconds to reach and revive you.'}
        </p>
      )}
    </section>
  );
}
export function RaidHealth({ state }: { state: BattleState }) {
  const raid = state.raid!,
    open = raid.vulnerableUntil > state.clock;
  const last = state.events
    .filter((e) => e.label === 'UNITY BURST' || e.label === 'AEGIS BROKEN')
    .at(-1);
  const hits = Object.values(raid.recentHits).filter((t) => state.clock - t <= 2000).length;
  return (
    <div className="raid-boss-hud">
      <div className="health-title">
        <span>
          <Shield size={17} /> {state.spec.bossName} <small>AI RAID BOSS</small>
        </span>
        <strong data-testid="boss-hp">
          {state.bossHp} / {raid.maxBossHp}
        </strong>
      </div>
      <div className="health-track">
        <div style={{ width: `${(state.bossHp / raid.maxBossHp) * 100}%` }} />
        <span className="breach-marker" />
      </div>
      <div
        className={`team-window ${open ? 'is-open' : ''}`}
        role="status"
        data-testid="team-window"
      >
        <strong>
          {open
            ? `AEGIS BROKEN · ${(Math.max(0, raid.vulnerableUntil - state.clock) / 1000).toFixed(1)}s`
            : `SOUL AEGIS · ${Math.min(hits, 1)}/2 HEROES LINKED`}
        </strong>
        <span>
          {open
            ? 'Attack together! Pair Overdrives for a Unity Burst.'
            : 'Two different heroes must land hits within 2 seconds. Solo hits deal no damage.'}
        </span>
      </div>
      {last && state.clock - last.at < 2200 && <div className="unity-flash">{last.label}</div>}
    </div>
  );
}
