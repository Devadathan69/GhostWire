import { useEffect, useRef, useState } from 'react';
import type { BattleState, Target } from '@ghostwire/shared';
import { BattleScene } from '../game/BattleScene';
import { Video, VideoOff, Crosshair, Box } from 'lucide-react';

export function GameStage({
  state,
  stream,
  onAim,
  role,
  onReady,
}: {
  state: BattleState;
  stream: MediaStream | null;
  onAim?: (t: Target) => void;
  role: 'hero' | 'boss';
  onReady: () => void;
}) {
  const mount = useRef<HTMLDivElement>(null),
    video = useRef<HTMLVideoElement>(null),
    scene = useRef<BattleScene | null>(null);
  const latest = useRef(state);
  latest.current = state;
  const [videoReady, setVideoReady] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [view, setView] = useState<'duel' | 'overlook'>('duel');
  const lastAim = useRef(0);
  useEffect(() => {
    let battle: BattleScene;
    try {
      battle = new BattleScene(mount.current!, latest.current, setRenderError, onReady);
      scene.current = battle;
      setRenderError(null);
    } catch {
      setRenderError(
        'The 3D arena needs WebGL 2. Enable hardware acceleration or open this raid in a current Chrome, Edge, or Safari browser.',
      );
      return;
    }
    return () => {
      scene.current = null;
      battle.destroy();
    };
  }, []);
  useEffect(() => {
    scene.current?.setState(state);
  }, [state]);
  useEffect(() => {
    // A surviving view can acknowledge immediately; a reloaded view waits for
    // its first actual frame, whose callback acknowledges after shader loading.
    if (state.renderPending && mount.current?.querySelector('canvas')?.dataset.ready === 'true')
      onReady();
  }, [state.renderPending, state.phase]);
  useEffect(() => {
    scene.current?.setLiveCamera(videoReady);
  }, [videoReady]);
  useEffect(() => {
    scene.current?.setView(view);
  }, [view]);
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    setVideoReady(false);
    v.srcObject = stream;
    if (stream) void v.play().catch(() => setVideoReady(false));
    return () => {
      v.srcObject = null;
    };
  }, [stream]);
  const reality =
    state.phase === 'REALITY' ||
    state.phase === 'BREACH_TRANSITION' ||
    (state.phase === 'DISCONNECTED' && state.resumePhase === 'REALITY') ||
    (['VICTORY', 'DEFEAT'].includes(state.phase) && state.bossHp <= state.spec.bossMaxHp * 0.5);
  const bossAttack = state.pending.find(
    (a) => a.role === 'boss' && (!state.raid || a.regionId === state.viewRegionId),
  );
  return (
    <div
      className={`game-stage theme-${state.spec.arena} ${reality ? 'is-reality' : ''} ${state.phase === 'BREACH_TRANSITION' ? 'is-breaching' : ''}`}
      data-testid="game-stage"
      data-impact-in={Math.min(
        99999,
        ...state.pending
          .filter((a) => a.role === 'boss' && (!state.raid || a.regionId === state.viewRegionId))
          .map((a) => a.resolvesAt - state.clock),
      )}
      onPointerMove={(e) => {
        if (role !== 'boss' || !onAim || performance.now() - lastAim.current < 70) return;
        lastAim.current = performance.now();
        const r = e.currentTarget.getBoundingClientRect();
        onAim({
          x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
          y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
          ...(state.phase === 'ARENA'
            ? {
                world: scene.current?.aimGround({
                  x: (e.clientX - r.left) / r.width,
                  y: (e.clientY - r.top) / r.height,
                }),
              }
            : {}),
        });
      }}
      onPointerDown={(e) => {
        if (role !== 'boss' || !onAim) return;
        const r = e.currentTarget.getBoundingClientRect();
        const point = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
        onAim({
          ...point,
          ...(state.phase === 'ARENA' ? { world: scene.current?.aimGround(point) } : {}),
        });
      }}
    >
      <video
        ref={video}
        className={`reality-video ${reality && videoReady ? 'visible' : ''}`}
        autoPlay
        playsInline
        muted
        onPlaying={() => setVideoReady(true)}
        onEmptied={() => setVideoReady(false)}
      />
      <div className="stage-vignette" />
      <div className="three-mount" ref={mount} />
      {renderError && (
        <div className="renderer-error" role="alert">
          <Box size={26} />
          <strong>3D view unavailable</strong>
          <p>{renderError}</p>
        </div>
      )}
      {!reality && !renderError && (
        <button
          className="arena-view"
          aria-label={view === 'duel' ? 'Switch to overlook view' : 'Switch to duel view'}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setView(view === 'duel' ? 'overlook' : 'duel');
          }}
        >
          <Box size={13} />
          {view === 'duel' ? 'DUEL VIEW' : 'OVERLOOK VIEW'}
        </button>
      )}
      <div className="stage-topline">
        <span>
          <span className="tiny-dot" />
          {reality ? '02 / REALITY BREACH' : '01 / THE RIFT ARENA'}
        </span>
        <span>
          {state.raid
            ? `${Object.keys(state.raid.heroes).length} HEROES · CO-OP RAID`
            : 'RAID ARENA'}
        </span>
      </div>
      {state.raid && (
        <div className="region-stage-label">
          <strong>{state.raid.regions[state.viewRegionId ?? '']?.name}</strong>
          <span>
            {state.raid.bossTransit?.to === state.viewRegionId
              ? 'RIFT WARNING · BOSS INCOMING'
              : state.raid.bossRegionId === state.viewRegionId
                ? 'BOSS IN THIS REALM'
                : 'BOSS IN ANOTHER REALM · RIFT STRIKES ACTIVE'}
          </span>
        </div>
      )}
      {reality && (
        <div className={`media-label ${videoReady ? 'live' : ''}`}>
          {videoReady ? <Video size={12} /> : <VideoOff size={12} />}{' '}
          {videoReady ? 'LIVE · YOUR CAMERA' : 'VIRTUAL ARENA · NO LIVE CAMERA'}
        </div>
      )}
      {bossAttack && (
        <div className="attack-warning">
          <Crosshair size={15} />
          {state.spec.bossAttacks.indexOf(bossAttack.attackId!) === 0
            ? 'INCOMING STRIKE'
            : 'HEAVY ATTACK'}{' '}
          <strong>GUARD OR EVADE</strong>
        </div>
      )}
      {state.phase === 'INTRO' && (
        <div className="cinematic-overlay">
          <span className="eyebrow">
            {state.renderPending ? 'PREPARING THE SQUAD’S 3D VIEWS…' : 'ANOMALY DETECTED'}
          </span>
          <h2>{state.spec.bossName}</h2>
          <p>“{state.spec.introLine}”</p>
          <div className="intro-line" />
        </div>
      )}
      {state.phase === 'BREACH_TRANSITION' && (
        <div className="cinematic-overlay breach-title">
          <span className="eyebrow">CONTAINMENT FAILURE</span>
          <h2>
            REALITY
            <br />
            <em>BREACH.</em>
          </h2>
          <p>The final arena is on the other side.</p>
        </div>
      )}
      {state.phase === 'DISCONNECTED' && (
        <div className="cinematic-overlay">
          <span className="eyebrow">RAID PAUSED</span>
          <h2>{state.renderPending ? 'Preparing the squad’s 3D views.' : 'Signal interrupted.'}</h2>
          <p>
            {state.renderPending
              ? 'Waiting for your teammate’s graphics to finish loading.'
              : 'Waiting up to 30 seconds for your teammate to reconnect.'}
            <br />
            Health, attacks, and cooldowns are frozen.
          </p>
        </div>
      )}
      <div className="stage-bottomline">
        <span>GHOSTWIRE // REALITY RAID</span>
        <span>
          {role === 'boss'
            ? 'MOVE POINTER OR HAND TO AIM'
            : 'WATCH THE TELEGRAPH. TIME YOUR STRIKE.'}
        </span>
      </div>
    </div>
  );
}
