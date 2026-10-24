import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  ArrowRight,
  Check,
  Copy,
  Maximize2,
  Shield,
  Sparkles,
  Users,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { isCombat, type Action, type RoomReply } from '@ghostwire/shared';
import { request, useSession } from './networking/session';
import { useCamera } from './cv/useCamera';
import { RiftArtwork } from './components/Artwork';
import { CameraPanel } from './components/CameraPanel';
import { Controls } from './components/Controls';
import { GameStage } from './components/GameStage';
import { Result } from './components/Result';
import { ControlsGuide } from './components/ControlsGuide';
import { RaidHealth, Squad } from './components/Squad';
import { useMovement } from './game/useMovement';
import { audioEnabled, setAudio, unlockAudio } from './game/audio';
import { WorldMap } from './components/WorldMap';
import { Forge } from './components/Forge';

const worlds = [
  ['ember', '◈ Emberfall', 'FIRE & THUNDER'],
  ['shadow', '☾ Hollow Moon', 'SHADOW & MOONLIGHT'],
  ['storm', 'ϟ Tempest', 'SKY & ASH'],
];
const noTarget = () => {};
export default function App() {
  const net = useSession(),
    camera = useCamera(),
    { state: receivedState, session } = net;
  const [watchRegion, setWatchRegion] = useState<string | null>(null);
  const state = receivedState
    ? {
        ...receivedState,
        viewRegionId:
          watchRegion && receivedState.raid?.regions[watchRegion]
            ? watchRegion
            : receivedState.viewRegionId,
      }
    : null;
  useEffect(
    () => setWatchRegion(null),
    [receivedState?.raid?.heroes[session?.playerId ?? '']?.regionId, session?.code],
  );
  const [tab, setTab] = useState(
    new URLSearchParams(location.search).has('join') ? 'join' : 'create',
  );
  const [code, setCode] = useState(new URLSearchParams(location.search).get('join') || '');
  const [name, setName] = useState(''),
    [prompt, setPrompt] = useState('A team of thunder guardians against a colossal lava giant');
  const [preset, setPreset] = useState<string | undefined>('ember'),
    [busy, setBusy] = useState(''),
    [error, setError] = useState('');
  const [qr, setQr] = useState(''),
    [copied, setCopied] = useState(false),
    [help, setHelp] = useState(false);
  const [sound, setSound] = useState(audioEnabled()),
    [motion, setMotion] = useState(true),
    [mode, setMode] = useState<'pose' | 'hand'>(window.innerWidth < 700 ? 'hand' : 'pose');
  const [controlMode, setControlMode] = useState<'manual' | 'motion'>('manual');
  const match = useRef<HTMLDivElement>(null),
    closeHelp = useRef<HTMLButtonElement>(null);
  const local = state?.raid?.heroes[session?.playerId ?? ''];
  const leader = Boolean(state?.raid && session?.playerId === state.raid.hostId);
  const lobby = Boolean(state && ['LOBBY', 'CALIBRATING'].includes(state.phase));
  const finished = Boolean(state && ['VICTORY', 'DEFEAT'].includes(state.phase));
  const active = Boolean(
    state &&
    isCombat(state.phase) &&
    local &&
    local.hp > 0 &&
    local.renderReady &&
    state.viewRegionId === local.regionId &&
    !local.travel &&
    !local.eliminated &&
    net.connected &&
    !help,
  );
  const status = useRef({ active, state, local });
  status.current = { active, state, local };
  const onAction = useCallback(
    (action: Action) => {
      if (status.current.active) {
        unlockAudio();
        net.intent(action);
      }
    },
    [net.intent],
  );
  const movement = useMovement(active, net.move);
  const setControl = useCallback((value: 'manual' | 'motion') => setControlMode(value), []);
  async function perform(task: () => Promise<unknown>) {
    setError('');
    try {
      await task();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const revive = useCallback((id: string) => {
    void request('raid:revive', { targetId: id }).catch((e) => setError((e as Error).message));
  }, []);
  useEffect(() => {
    if (finished) camera.stop();
  }, [finished, camera.stop]);
  useEffect(() => {
    if (!session || !net.connected) return;
    void request('room:ready', {
      ready: status.current.local?.ready ?? false,
      camera: Boolean(camera.stream),
      controlMode,
    }).catch(() => {});
  }, [camera.stream, controlMode, session, net.connected]);
  useEffect(() => {
    if (!session) camera.stop();
  }, [session, camera.stop]);
  useEffect(() => {
    if (net.joinUrl)
      void QRCode.toDataURL(net.joinUrl, { width: 208, margin: 2, errorCorrectionLevel: 'M' })
        .then(setQr)
        .catch(() => setQr(''));
  }, [net.joinUrl]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        !status.current.active ||
        e.repeat ||
        (e.target as HTMLElement).closest('input,textarea,select,[role="dialog"]')
      )
        return;
      const action =
        status.current.local?.design?.abilities.find((a) => a.key === e.key.toLowerCase())
          ?.action ??
        (!status.current.local?.design
          ? (
              {
                j: 'punch',
                i: 'kick',
                k: 'guard',
                l: 'dodge',
                e: 'jump',
                ' ': 'special',
              } as Record<string, Action>
            )[e.key.toLowerCase()]
          : undefined);
      if (action) {
        e.preventDefault();
        onAction(action);
      }
      if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        const { state: s, local: h } = status.current;
        if (!s?.raid || !h) return;
        const down = Object.values(s.raid.heroes)
          .filter(
            (v) =>
              v.regionId === h.regionId && v.downedUntil !== null && !v.eliminated && v.connected,
          )
          .sort((a, b) => {
            const distance = (v: typeof a) =>
              s.phase === 'REALITY'
                ? Math.hypot(h.screen.x - v.screen.x, h.screen.y - v.screen.y)
                : Math.hypot(
                    h.fighter.position.x - v.fighter.position.x,
                    h.fighter.position.z - v.fighter.position.z,
                  );
            return distance(a) - distance(b);
          })[0];
        if (down) revive(down.id);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onAction, revive]);
  useEffect(() => {
    if (!help) return;
    const prior = document.activeElement as HTMLElement;
    closeHelp.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHelp(false);
      if (e.key === 'Tab') {
        e.preventDefault();
        closeHelp.current?.focus();
      }
    };
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('keydown', key);
      prior?.focus();
    };
  }, [help]);
  async function create(practice: boolean) {
    if (busy) return;
    setBusy('create');
    setError('');
    unlockAudio();
    try {
      const response = await fetch('/api/encounters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, ...(preset ? { preset } : {}) }),
        signal: AbortSignal.timeout(55000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not prepare the raid.');
      net.accept(
        await request<RoomReply>('room:create', {
          encounterId: data.id,
          practice,
          ...(name.trim() ? { name: name.trim() } : {}),
        }),
      );
      window.scrollTo(0, 0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  }
  async function join() {
    setBusy('join');
    unlockAudio();
    await perform(async () => {
      net.accept(
        await request<RoomReply>('room:join', {
          code: code.trim().toUpperCase(),
          ...(name.trim() ? { name: name.trim() } : {}),
        }),
      );
      window.scrollTo(0, 0);
    });
    setBusy('');
  }
  async function leave() {
    await net.leave();
    camera.stop();
    setError('');
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(net.joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Select and copy the invite link below.');
    }
  }
  const cameraPanel = (
    <CameraPanel
      camera={camera}
      role="hero"
      onAction={onAction}
      onTarget={noTarget}
      onMode={setControl}
      motion={motion}
      onMotionChange={setMotion}
      mode={mode}
      onTrackingModeChange={setMode}
      onMove={movement.onMotion}
      design={local?.design}
    />
  );
  return (
    <div className={`app ${state ? 'in-room' : ''}`}>
      <header className="site-header">
        <button
          className="brand"
          aria-label="GHOSTWIRE home"
          onClick={() => {
            if (session) void leave();
            else window.scrollTo(0, 0);
          }}
        >
          <span className="brand-mark">
            <Zap size={21} fill="currentColor" />
          </span>
          <span>
            GHOSTWIRE<span className="brand-sub">COOPERATIVE REALITY RAID</span>
          </span>
        </button>
        <nav>
          <button className="nav-link" onClick={() => setHelp(true)}>
            How to play
          </button>
          <button
            className="icon-button"
            aria-label={sound ? 'Mute sound' : 'Enable sound'}
            onClick={() => {
              setAudio(!sound);
              setSound(!sound);
            }}
          >
            {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          {state ? (
            <button className="button subtle small" onClick={() => void leave()}>
              Leave raid
              <X size={14} />
            </button>
          ) : (
            <a className="button secondary small" href="#launch" onClick={() => setTab('join')}>
              Join a raid
              <ArrowRight size={14} />
            </a>
          )}
        </nav>
      </header>
      {!state || !session || !local ? (
        <main className="home-main">
          <section className="home-hero">
            <div className="hero-copy">
              <span className="eyebrow">
                <span className="tiny-dot green" />
                2–4 HEROES. ONE COLOSSUS.
              </span>
              <h1>
                NO HERO
                <br />
                WINS
                <br />
                <span>ALONE.</span>
                <span className="title-star">✳</span>
              </h1>
              <p className="hero-description">
                Your body is the controller.
                <br />
                Your friends are your squad.
                <br />
                <strong>Take down the impossible. Together.</strong>
              </p>
              <a className="text-link" href="#launch">
                Assemble your squad
                <ArrowRight size={18} />
              </a>
              <div className="hero-tags">
                <span>
                  <Users size={13} />
                  2–4 player co-op
                </span>
                <span>
                  <Shield size={13} />
                  AI boss
                </span>
                <span>
                  <Sparkles size={13} />
                  Motion controlled
                </span>
              </div>
            </div>
            <div className="hero-art">
              <div className="art-grid" />
              <span className="art-index">RAID TARGET // 001</span>
              <RiftArtwork theme={preset || 'ember'} />
              <div className="art-callout">
                <span className="tiny-dot green" />
                <div>
                  <strong>TOO POWERFUL FOR ONE.</strong>
                  <small>Break its shield with your team.</small>
                </div>
                <Users size={22} />
              </div>
            </div>
          </section>
          <section className="launch-section" id="launch">
            <div className="launch-intro">
              <span className="eyebrow">THE SQUAD STARTS HERE</span>
              <h2>
                One boss.
                <br />
                All of us.
              </h2>
              <p>
                Link your strikes, combine your powers, and bring your teammates back into the
                fight. Everyone plays a hero.
              </p>
            </div>
            <div className="launch-panel">
              <span className={`server-status ${net.connected ? 'online' : ''}`}>
                {net.connected ? 'RAID SERVER ONLINE' : 'CONNECTING TO RAID SERVER…'}
              </span>
              <div className="launch-tabs">
                <button
                  className={tab === 'create' ? 'active' : ''}
                  onClick={() => setTab('create')}
                >
                  Create a squad
                </button>
                <button className={tab === 'join' ? 'active' : ''} onClick={() => setTab('join')}>
                  Join a squad
                </button>
                <button className={tab === 'forge' ? 'active' : ''} onClick={() => setTab('forge')}>
                  Create a world
                </button>
              </div>
              <label className="field-label" htmlFor="hero-name">
                YOUR HERO NAME
              </label>
              <input
                id="hero-name"
                className="raid-input"
                aria-label="Your hero name"
                maxLength={20}
                placeholder="Optional · choose your callsign"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {tab === 'create' ? (
                <>
                  <label className="field-label" htmlFor="story">
                    SET THE SCENE
                  </label>
                  <textarea
                    id="story"
                    maxLength={500}
                    value={prompt}
                    onChange={(e) => {
                      setPrompt(e.target.value);
                      setPreset(undefined);
                    }}
                  />
                  <span className="field-label">OR CHOOSE A WORLD</span>
                  <div className="world-options">
                    {worlds.map(([id, title, detail]) => (
                      <button
                        key={id}
                        className={`world-option ${preset === id ? 'selected' : ''}`}
                        onClick={() => setPreset(id)}
                      >
                        <strong>{title}</strong>
                        <small>{detail}</small>
                      </button>
                    ))}
                  </div>
                  <button
                    className="button primary full"
                    disabled={Boolean(busy) || !net.connected || prompt.trim().length < 3}
                    onClick={() => void create(false)}
                  >
                    {busy ? 'Preparing encounter…' : 'Create a raid'}
                    <ArrowRight size={18} />
                  </button>
                  <button
                    className="button subtle full"
                    disabled={Boolean(busy) || !net.connected}
                    onClick={() => void create(true)}
                  >
                    Train with AI ally
                  </button>
                  <p className="launch-footnote">
                    Main raid: 2–4 human heroes. Training adds a clearly labeled AI teammate. Camera
                    optional.
                  </p>
                </>
              ) : tab === 'forge' ? (
                <Forge
                  connected={net.connected}
                  onCreate={async (encounterId) => {
                    unlockAudio();
                    net.accept(
                      await request<RoomReply>('room:create', {
                        encounterId,
                        practice: false,
                        ...(name.trim() ? { name: name.trim() } : {}),
                      }),
                    );
                    window.scrollTo(0, 0);
                  }}
                />
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void join();
                  }}
                >
                  <label className="field-label" htmlFor="raid-code">
                    SIX-CHARACTER RAID CODE
                  </label>
                  <input
                    id="raid-code"
                    className="code-input"
                    aria-label="Raid code"
                    maxLength={6}
                    autoComplete="off"
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ''))
                    }
                    placeholder="ABC234"
                  />
                  <button
                    className="button primary full"
                    disabled={Boolean(busy) || code.length !== 6 || !net.connected}
                  >
                    Join the squad
                    <ArrowRight size={18} />
                  </button>
                  <p className="launch-footnote">
                    You join as a hero. The boss is controlled by the game.
                  </p>
                </form>
              )}
              {error && (
                <p className="inline-error" role="alert">
                  {error}
                </p>
              )}
              {net.notice && (
                <p className="inline-notice" role="status">
                  {net.notice}
                </p>
              )}
            </div>
          </section>
          <section className="how-grid">
            {[
              [
                '01',
                'Break the Aegis.',
                'Two heroes hit within two seconds to open a six-second damage window.',
              ],
              [
                '02',
                'Fight as one.',
                'Coordinate Overdrives for a Unity Burst. Dodge marked attacks and rescue fallen allies.',
              ],
              [
                '03',
                'Breach reality.',
                'At half health, the final phase enters each hero’s optional live camera view.',
              ],
            ].map(([n, title, text]) => (
              <article key={n}>
                <span className="step-number">{n} /</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </section>
        </main>
      ) : (
        <main className="room-main" ref={match}>
          <div className="room-heading">
            <div>
              <span className="eyebrow">
                {state.practice ? 'TRAINING WITH AI ALLY' : `SQUAD ${state.code}`} /{' '}
                {local.name.toUpperCase()}
                {leader ? ' · SQUAD LEADER' : ''}
              </span>
              <h1>{state.spec.title}</h1>
            </div>
            <div className="room-heading-meta">
              <span className={`connection-pill ${net.connected ? 'online' : ''}`}>
                {net.connected ? 'Connected' : 'Reconnecting…'}
              </span>
              <button
                className="icon-button"
                aria-label="Fullscreen raid"
                onClick={() => {
                  if (document.fullscreenElement) void document.exitFullscreen();
                  else
                    void match.current
                      ?.requestFullscreen()
                      .catch(() => setError('Fullscreen is unavailable.'));
                }}
              >
                <Maximize2 size={17} />
              </button>
            </div>
          </div>
          {error && (
            <div className="inline-error" role="alert">
              {error}
              <button
                className="icon-button"
                aria-label="Dismiss error"
                onClick={() => setError('')}
              >
                <X size={14} />
              </button>
            </div>
          )}
          {lobby ? (
            <div className="lobby-grid">
              <section className="encounter-card">
                <div className="encounter-meta">
                  <span className="eyebrow">COOPERATIVE RAID BRIEF</span>
                  <span className="source-chip">
                    {state.source === 'ai'
                      ? 'AI DIRECTED'
                      : state.source === 'custom'
                        ? 'CUSTOM BLUEPRINT'
                        : 'CURATED ENCOUNTER'}
                  </span>
                </div>
                <RiftArtwork
                  theme={
                    state.spec.arena === 'storm'
                      ? 'storm'
                      : state.spec.arena === 'shadow_forest'
                        ? 'shadow'
                        : 'ember'
                  }
                />
                <div className="encounter-details">
                  <span className="eyebrow">ONE BOSS · YOUR WHOLE SQUAD</span>
                  <h2>{state.spec.bossName}</h2>
                  <p>“{state.spec.introLine}”</p>
                  <div className="encounter-traits">
                    <span>2–4 HEROES</span>
                    <span>TEAM SHIELD BREAK</span>
                    <span>3 MINUTE RAID</span>
                  </div>
                  <p className="source-note">{state.sourceNote}</p>
                  <p>
                    Solo damage is blocked by Soul Aegis. Two different heroes must land hits within
                    two seconds. Then attack during the six-second opening.
                  </p>
                </div>
              </section>
              <div className="lobby-right">
                <section className="room-invite">
                  <div className="section-heading">
                    <h3>{state.practice ? 'Training squad' : 'Invite your teammates'}</h3>
                    <Users size={18} />
                  </div>
                  {!state.practice && (
                    <>
                      <div className="invite-content">
                        {qr && (
                          <img
                            src={qr}
                            alt={`Scan to join raid ${state.code}`}
                            width={126}
                            height={126}
                          />
                        )}
                        <div>
                          <span className="field-label">RAID CODE</span>
                          <strong className="room-code">{state.code}</strong>
                          <button className="text-link" onClick={() => void copy()}>
                            <Copy size={14} />
                            {copied ? 'Link copied' : 'Copy invite link'}
                          </button>
                        </div>
                      </div>
                      <input
                        className="invite-url"
                        aria-label="Invite URL"
                        value={net.joinUrl}
                        readOnly
                        onFocus={(e) => e.target.select()}
                      />
                    </>
                  )}
                  <div className="players-list">
                    {Object.values(state.raid!.heroes).map((h) => (
                      <div key={h.id}>
                        <span className="squad-color" style={{ background: h.color }} />
                        <span>
                          <strong>
                            {h.name}
                            {h.id === local.id ? ' (you)' : ''}
                            {h.id === state.raid!.hostId ? ' · leader' : ''}
                          </strong>
                          <small>
                            {!h.connected
                              ? 'Reconnecting…'
                              : h.ready
                                ? 'Ready to raid'
                                : h.bot
                                  ? 'AI teammate'
                                  : 'Preparing controls'}
                          </small>
                        </span>
                        {h.ready ? (
                          <Check size={16} className="ready-check" />
                        ) : (
                          <span className="waiting-dot" />
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="coop-lobby-note">
                    {state.practice
                      ? 'Echo is an AI teammate. The same teamwork rules apply.'
                      : `${Object.keys(state.raid!.heroes).length}/4 heroes joined. At least two connected, ready heroes are required.`}
                  </p>
                  {state.spec.creation && (
                    <label className="field-label">
                      CHOOSE YOUR HERO
                      <select
                        className="raid-input"
                        aria-label="Choose your hero"
                        value={state.spec.creation.heroes.findIndex(
                          (h) => h.name === local.design?.name,
                        )}
                        onChange={(e) =>
                          void perform(() =>
                            request('hero:design', { index: Number(e.target.value) }),
                          )
                        }
                      >
                        {state.spec.creation.heroes.map((h, i) => (
                          <option key={i} value={i}>
                            {h.name} · {h.appearance.archetype}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <p className="source-note">
                    Every connected device adds its own realm. The boss can invade any realm. Travel
                    through rifts to fight together.
                  </p>
                  <button
                    className={`button ${local.ready ? 'secondary' : 'primary'} full`}
                    disabled={!net.connected}
                    onClick={() =>
                      void perform(() =>
                        request('room:ready', {
                          ready: !local.ready,
                          camera: Boolean(camera.stream),
                          controlMode,
                        }),
                      )
                    }
                  >
                    {local.ready ? 'Ready · click to unready' : 'I’m ready'}
                    <Check size={17} />
                  </button>
                  {leader ? (
                    <button
                      className="button primary full begin-button"
                      disabled={
                        !net.connected ||
                        Object.keys(state.raid!.heroes).length < 2 ||
                        Object.values(state.raid!.heroes).some((h) => !h.ready || !h.connected)
                      }
                      onClick={() => {
                        unlockAudio();
                        void perform(() => request('battle:start', { waitForRenderer: true }));
                      }}
                    >
                      Begin raid
                      <ArrowRight size={18} />
                    </button>
                  ) : (
                    <p className="waiting-caption">
                      The squad leader begins when everyone is ready.
                    </p>
                  )}
                </section>
                {cameraPanel}
              </div>
            </div>
          ) : (
            <>
              <RaidHealth state={state} />
              <WorldMap
                state={state}
                invite={net.joinUrl}
                onView={setWatchRegion}
                onTravel={(id) =>
                  void perform(async () => {
                    await request('world:travel', { regionId: id });
                    setWatchRegion(null);
                  })
                }
              />
              <div className="battle-layout">
                <div className="battle-main">
                  <GameStage
                    state={state}
                    role="hero"
                    stream={camera.stream}
                    onReady={() => {
                      void request('battle:render-ready').catch(() => {});
                    }}
                  />
                  {finished ? (
                    <Result
                      state={state}
                      role="hero"
                      onRematch={() => void perform(() => request('battle:rematch'))}
                      onLeave={() => void leave()}
                    />
                  ) : (
                    <Controls
                      state={state}
                      role="hero"
                      onAction={onAction}
                      connected={active}
                      onMove={movement.onTouch}
                    />
                  )}
                </div>
                <aside className="battle-sidebar">
                  <Squad state={state} playerId={local.id} onRevive={revive} />
                  <div className="mission-card">
                    <span className="eyebrow">
                      {state.phase === 'REALITY' ? 'FINAL PHASE' : 'TEAM OBJECTIVE'}
                    </span>
                    <h3>Bring it down. Together.</h3>
                    <p>
                      Link two heroes’ hits. Pair Overdrives within 1.8 seconds for a 40-damage
                      Unity Burst. Reach a downed ally and press F to revive; stay still for 3
                      seconds.
                    </p>
                    <div className="raid-clock">
                      <span>BEFORE CATACLYSM</span>
                      <strong>
                        {Math.max(0, Math.ceil((state.raid!.limit - state.elapsed) / 1000))}s
                      </strong>
                    </div>
                  </div>
                  {cameraPanel}
                </aside>
              </div>
            </>
          )}
        </main>
      )}
      <footer className="site-footer">
        <span>GHOSTWIRE / REALITY RAID</span>
        <span>NO HERO WINS ALONE.</span>
        <span className="footer-track">
          <span className="tiny-dot green" />
          2–4 PLAYER CO-OP
        </span>
      </footer>
      {help && (
        <div className="modal-backdrop" onClick={() => setHelp(false)}>
          <section
            className="help-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              ref={closeHelp}
              className="icon-button close-modal"
              aria-label="Close instructions"
              onClick={() => setHelp(false)}
            >
              <X size={20} />
            </button>
            <span className="eyebrow">SQUAD FIELD GUIDE</span>
            <h2 id="help-title">Team up. Break the Aegis.</h2>
            <p>
              Everyone controls a hero. Create a raid, invite 1–3 teammates, ready up, and let the
              leader begin. No player controls the boss.
            </p>
            <p>
              Two different heroes must land hits within 2 seconds to open Soul Aegis for 6 seconds.
              Pair Overdrives within 1.8 seconds for a Unity Burst. You cannot damage each other.
            </p>
            <p>
              A downed hero has 20 seconds to be rescued. Move close and press <kbd>F</kbd> or their
              Revive button; stay still for 3 seconds. Movement, attacking, or taking damage
              interrupts the revive. A total squad wipe or the 180-second Cataclysm means defeat.
            </p>
            <ControlsGuide />
            <p>
              At half boss health, all heroes enter Reality Breach. Your optional local camera
              becomes your backdrop; shared hero positions and attack zones stay synchronized.
              Camera video stays on your device.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
