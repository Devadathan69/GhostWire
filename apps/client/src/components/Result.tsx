import { Download, RotateCcw, ArrowUpRight, Trophy, Skull } from 'lucide-react';
import type { BattleState, Role } from '@ghostwire/shared';
import { useEffect, useRef } from 'react';
export function Result({
  state,
  role,
  onRematch,
  onLeave,
}: {
  state: BattleState;
  role: Role;
  onRematch: () => void;
  onLeave: () => void;
}) {
  const heroWin = state.phase === 'VICTORY',
    won = role === 'hero' ? heroWin : !heroWin;
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    panel.current?.focus();
  }, []);
  const title =
    role === 'hero'
      ? heroWin
        ? 'Reality reclaimed.'
        : 'The rift remains.'
      : heroWin
        ? 'Your reign is over.'
        : 'The rift is yours.';
  function download() {
    const c = document.createElement('canvas');
    c.width = 1200;
    c.height = 630;
    const g = c.getContext('2d')!;
    g.fillStyle = '#0b1018';
    g.fillRect(0, 0, 1200, 630);
    g.strokeStyle = '#c2f970';
    g.lineWidth = 2;
    g.strokeRect(30, 30, 1140, 570);
    g.fillStyle = '#c2f970';
    g.font = 'bold 22px sans-serif';
    g.fillText(`GHOSTWIRE / ${won ? 'MISSION PASSED' : 'MISSION FAILED'}`, 70, 90);
    g.fillStyle = '#f0f4ec';
    g.font = 'bold 72px sans-serif';
    g.fillText(title.toUpperCase(), 70, 220);
    g.font = '28px sans-serif';
    g.fillText(state.spec.title, 70, 285);
    g.fillStyle = '#a2abae';
    g.font = '22px sans-serif';
    g.fillText(
      `${role.toUpperCase()} · ${Math.round(state.elapsed / 1000)}s · ${state.stats.damage} damage · ${state.stats.dodged} evades`,
      70,
      375,
    );
    g.fillText(heroWin ? state.spec.victoryLine : 'Another raid. Another chance.', 70, 460);
    g.fillStyle = '#c2f970';
    g.font = '18px monospace';
    g.fillText(state.practice ? 'SOLO TRAINING' : 'TWO-PLAYER RAID', 70, 550);
    const a = document.createElement('a');
    a.download = 'ghostwire-raid-recap.png';
    a.href = c.toDataURL('image/png');
    a.click();
  }
  return (
    <>
      <div className="outcome-backdrop" />
      <section
        ref={panel}
        tabIndex={-1}
        className={`result-card ${won ? 'won' : 'lost'}`}
        role="status"
        aria-label={won ? 'Mission passed' : 'Mission failed'}
      >
        <div className="outcome-stamp">{won ? 'MISSION PASSED' : 'MISSION FAILED'}</div>
        <div className="result-icon">{won ? <Trophy size={30} /> : <Skull size={30} />}</div>
        <span className="eyebrow">
          {won ? 'RAID COMPLETE' : 'RAID ENDED'} ·{' '}
          {state.practice ? 'TRAINING' : role.toUpperCase()}
        </span>
        <h2>{title}</h2>
        <p>
          {won
            ? role === 'hero'
              ? state.spec.victoryLine
              : 'You defended your reality. The hero has fallen.'
            : role === 'hero'
              ? 'The hero fell. Step through the rift and try again.'
              : 'The hero broke the breach. Challenge them again.'}
        </p>
        <div className="result-stats">
          <div>
            <strong>{Math.round(state.elapsed / 1000)}s</strong>
            <span>RAID TIME</span>
          </div>
          <div>
            <strong>{state.stats.damage}</strong>
            <span>HERO DAMAGE</span>
          </div>
          <div>
            <strong>{state.stats.dodged}</strong>
            <span>EVADES</span>
          </div>
          <div>
            <strong>{state.stats.blocked}</strong>
            <span>BLOCKS</span>
          </div>
        </div>
        <div className="result-actions">
          {role === 'hero' ? (
            <button className="button primary" onClick={onRematch}>
              <RotateCcw size={16} />
              Raid again
            </button>
          ) : (
            <span className="muted">Waiting for the hero to request a rematch.</span>
          )}
          <button className="button secondary" onClick={download}>
            <Download size={16} />
            Save recap
          </button>
          <button className="button subtle" onClick={onLeave}>
            Return home
            <ArrowUpRight size={16} />
          </button>
        </div>
      </section>
    </>
  );
}
