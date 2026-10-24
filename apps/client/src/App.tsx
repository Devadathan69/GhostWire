import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Copy,
  Crosshair,
  Gamepad2,
  Globe,
  Link2,
  LoaderCircle,
  Maximize2,
  Radio,
  Shield,
  Sparkles,
  Swords,
  Users,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import {
  isCombat,
  type Action,
  type BattleState,
  type Role,
  type RoomReply,
} from '@ghostwire/shared';
import { request, useSession } from './networking/session';
import { usePeerVideo } from './networking/webrtc';
import { useCamera } from './cv/useCamera';
import { RiftArtwork } from './components/Artwork';
import { CameraPanel } from './components/CameraPanel';
import { Controls } from './components/Controls';
import { GameStage } from './components/GameStage';
import { Result } from './components/Result';
import { audioEnabled, setAudio, unlockAudio } from './game/audio';

const prompts: Record<string, string> = {
  ember: 'Thunder guardian versus a lava giant during a monsoon',
  shadow: 'Moonlit forest warrior versus an ancient shadow beast',
  storm: 'A fire knight faces the keeper of the storm in a shattered sky',
};
const names: Record<string, string> = {
  ember: 'Emberfall',
  shadow: 'Hollow Moon',
  storm: 'Tempest',
};
function Logo({ onClick }: { onClick: () => void }) {
  return (
    <button className="brand" onClick={onClick} aria-label="GHOSTWIRE home">
      <span className="brand-mark">
        <Zap size={21} fill="currentColor" />
      </span>
      <span>
        GHOSTWIRE<span className="brand-sub">REALITY RAID</span>
      </span>
    </button>
  );
}
function Health({ state, role }: { state: BattleState; role: Role }) {
  return (
    <div className="health-hud">
      {(['hero', 'boss'] as const).map((r) => (
        <div className={`health-block ${r}`} key={r}>
          <div className="health-title">
            <span>
              {r === role ? 'YOU / ' : ''}
              {r === 'hero' ? state.spec.heroName : state.spec.bossName}
            </span>
            <strong data-testid={`${r}-hp`}>
              {r === 'hero' ? state.heroHp : state.bossHp}
              <small> / {r === 'hero' ? state.spec.heroMaxHp : state.spec.bossMaxHp}</small>
            </strong>
          </div>
          <div className="health-track">
            <div
              style={{
                width: `${(r === 'hero' ? state.heroHp / state.spec.heroMaxHp : state.bossHp / state.spec.bossMaxHp) * 100}%`,
              }}
            />
            {r === 'boss' && <span className="breach-marker" />}
          </div>
          <span className="health-caption">
            {r === 'hero'
              ? 'HERO VITALS'
              : state.practice
                ? 'TRAINING COLOSSUS'
                : 'HUMAN-CONTROLLED BOSS'}
          </span>
        </div>
      ))}
      <div className="versus">VS</div>
    </div>
  );
}

export default function App() {
  const net = useSession(),
    camera = useCamera();
  const { state, session } = net;
  const [tab, setTab] = useState<'create' | 'join'>(
    new URLSearchParams(location.search).has('join') ? 'join' : 'create',
  );
  const [code, setCode] = useState(new URLSearchParams(location.search).get('join') || '');
  const [prompt, setPrompt] = useState(prompts.ember),
    [preset, setPreset] = useState<string | undefined>('ember');
  const [busy, setBusy] = useState(''),
    [error, setError] = useState(''),
    [qr, setQr] = useState(''),
    [copied, setCopied] = useState(false);
  const [sound, setSound] = useState(audioEnabled()),
    [controlMode, setControlMode] = useState<'manual' | 'motion'>('manual');
  const [help, setHelp] = useState(false);
  const [motion, setMotion] = useState(true);
  const [trackingMode, setTrackingMode] = useState<'pose' | 'hand'>();
  const helpClose = useRef<HTMLButtonElement>(null);
  const codeRef = useRef<string | undefined>(undefined);
  const match = useRef<HTMLDivElement>(null);
  const peer = usePeerVideo(
    session?.role,
    session?.code,
    session?.role === 'boss' ? camera.stream : null,
    state?.players[session?.role === 'boss' ? 'hero' : 'boss'].connected ?? false,
    net.connected,
  );
  const setMode = useCallback((m: 'manual' | 'motion') => setControlMode(m), []);
  useEffect(() => {
    if (codeRef.current !== session?.code) {
      camera.stop();
      codeRef.current = session?.code;
    }
  }, [session?.code, camera.stop]);
  useEffect(() => {
    if (net.joinUrl)
      void QRCode.toDataURL(net.joinUrl, {
        width: 208,
        margin: 2,
        color: { dark: '#0b1118', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      })
        .then(setQr)
        .catch(() => setQr(''));
  }, [net.joinUrl]);
  useEffect(() => {
    if (session && state && net.connected)
      void request('room:ready', {
        ready: state.players[session.role].ready,
        camera: Boolean(camera.stream),
        controlMode,
      }).catch(() => {});
  }, [camera.stream, controlMode, session, net.connected]);
  useEffect(() => {
    if (!help) return;
    const prior = document.activeElement as HTMLElement | null;
    helpClose.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHelp(false);
      if (e.key === 'Tab') {
        e.preventDefault();
        helpClose.current?.focus();
      }
    };
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('keydown', key);
      prior?.focus();
    };
  }, [help]);
  const onAction = useCallback(
    (action: Action) => {
      unlockAudio();
      net.intent(action);
    },
    [net.intent],
  );
  useEffect(() => {
    if (!session || !state || !isCombat(state.phase)) return;
    const key = (e: KeyboardEvent) => {
      if (help || e.repeat || (e.target as HTMLElement).closest('input,textarea,select')) return;
      const keys: Record<string, Action> =
        session.role === 'hero'
          ? {
              j: 'punch',
              k: 'guard',
              l: 'dodge',
              ' ': 'special',
              a: 'left',
              d: 'right',
              ArrowLeft: 'left',
              ArrowRight: 'right',
            }
          : { j: 'swipe', k: 'guard', ' ': 'power' };
      const a = keys[e.key] || keys[e.key.toLowerCase()];
      if (a) {
        e.preventDefault();
        onAction(a);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [session, state?.phase, onAction, help]);
  async function perform(task: () => Promise<unknown>) {
    setError('');
    try {
      await task();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function create(practice: boolean) {
    if (busy) return;
    setBusy(practice ? 'training' : 'create');
    setError('');
    unlockAudio();
    try {
      const response = await fetch('/api/encounters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, ...(preset ? { preset } : {}) }),
        signal: AbortSignal.timeout(18000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not create the encounter.');
      net.accept(await request<RoomReply>('room:create', { encounterId: data.id, practice }));
      window.scrollTo(0, 0);
    } catch (e) {
      setError(
        (e as Error).name === 'TimeoutError'
          ? 'The director timed out. Select a preset and retry.'
          : (e as Error).message,
      );
    } finally {
      setBusy('');
    }
  }
  async function join() {
    setBusy('join');
    unlockAudio();
    await perform(async () => {
      net.accept(await request<RoomReply>('room:join', { code: code.trim().toUpperCase() }));
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
      setError('Copy is unavailable here. Select and copy the invite link below.');
    }
  }
  const lobby = state && ['LOBBY', 'CALIBRATING'].includes(state.phase),
    finished = state && ['VICTORY', 'DEFEAT'].includes(state.phase);
  const theme =
    state?.spec.arena === 'shadow_forest'
      ? 'shadow'
      : state?.spec.arena === 'storm'
        ? 'storm'
        : 'ember';
  return (
    <div className={`app ${state ? 'in-room' : ''}`}>
      <header className="site-header">
        <Logo
          onClick={() => {
            if (!session) {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else void leave();
          }}
        />
        <nav>
          {!state && (
            <span className="nav-edition">
              AN EXPERIMENT IN HUMAN PLAY <span>001</span>
            </span>
          )}
          <button className="nav-link" onClick={() => setHelp(true)}>
            How to play
            <ArrowUpRight size={14} />
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
            <button
              className="button secondary small"
              onClick={() => {
                setTab('join');
                document.getElementById('launch')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Join a raid
              <ArrowRight size={14} />
            </button>
          )}
        </nav>
      </header>
      {!state || !session ? (
        <main className="home-main">
          <section className="home-hero">
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="tiny-dot green" /> TWO PLAYERS. ZERO CONTROLLERS.
              </div>
              <h1>
                BREAK THE
                <br />
                FOURTH
                <br />
                <span>WALL.</span>
                <span className="title-star">✳</span>
              </h1>
              <p className="hero-description">
                Your body is the controller.
                <br />
                Your friend is the boss.
                <br />
                <strong>Reality is the final arena.</strong>
              </p>
              <a className="text-link" href="#launch">
                Step into the rift
                <ArrowRight size={18} />
              </a>
              <div className="hero-tags">
                <span>
                  <Users size={13} />
                  2-player 3D battles
                </span>
                <span>
                  <ScanIcon />
                  Motion controlled
                </span>
                <span>
                  <Sparkles size={13} />
                  AI directed
                </span>
              </div>
            </div>
            <div className="hero-art">
              <div className="art-grid" />
              <div className="art-corner top-left" />
              <div className="art-corner bottom-right" />
              <span className="art-index">ANOMALY // 001</span>
              <RiftArtwork theme={preset || 'ember'} />
              <div className="art-callout">
                <span className="tiny-dot green" />
                <div>
                  <strong>THIS COULD BE YOUR FRIEND.</strong>
                  <small>One camera. One very unfair advantage.</small>
                </div>
                <Crosshair size={22} />
              </div>
              <div className="art-coordinates">
                25.04° N<br />
                76.28° E<br />
                <span>RIFT ACTIVE</span>
              </div>
            </div>
          </section>
          <section className="launch-section" id="launch">
            <div className="launch-intro">
              <span className="eyebrow">THE NEXT WORLD STARTS HERE</span>
              <h2>
                A story.
                <br /> A friend.
                <br /> <em>A fight.</em>
              </h2>
              <p>
                Build your encounter, invite your rival, and watch the game break into their room.
              </p>
              <div className="online-note">
                <span className={`tiny-dot ${net.connected ? 'green' : ''}`} />
                {net.connected ? 'RAID SERVER ONLINE' : 'CONNECTING TO RAID SERVER…'}
              </div>
            </div>
            <div className="launch-panel">
              <div className="launch-tabs">
                <button
                  className={tab === 'create' ? 'selected' : ''}
                  onClick={() => setTab('create')}
                >
                  <Swords size={16} />
                  Create a battle
                </button>
                <button className={tab === 'join' ? 'selected' : ''} onClick={() => setTab('join')}>
                  <Link2 size={16} />
                  Join as boss
                </button>
              </div>
              {tab === 'create' ? (
                <>
                  <label className="field-label" htmlFor="story">
                    SET THE SCENE <span>YOUR STORY, PLAYABLE</span>
                  </label>
                  <div className="prompt-field">
                    <Sparkles size={18} />
                    <textarea
                      id="story"
                      maxLength={500}
                      value={prompt}
                      onChange={(e) => {
                        setPrompt(e.target.value);
                        setPreset(undefined);
                      }}
                      placeholder="A thunder knight faces a volcanic titan…"
                    />
                    <span>{prompt.length}/500</span>
                  </div>
                  <div className="preset-label">OR CHOOSE A WORLD</div>
                  <div className="preset-cards">
                    {Object.keys(prompts).map((key, i) => (
                      <button
                        key={key}
                        className={`preset-card preset-${key} ${preset === key ? 'selected' : ''}`}
                        onClick={() => {
                          setPreset(key);
                          setPrompt(prompts[key]);
                        }}
                      >
                        <span className="preset-symbol">{i === 0 ? '◈' : i === 1 ? '☾' : 'ϟ'}</span>
                        <span>
                          <strong>{names[key]}</strong>
                          <small>
                            {i === 0
                              ? 'FIRE & THUNDER'
                              : i === 1
                                ? 'SHADOW & MOONLIGHT'
                                : 'SKY & ASH'}
                          </small>
                        </span>
                        {preset === key && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                  <button
                    className="button primary full create-button"
                    onClick={() => void create(false)}
                    disabled={!!busy || !net.connected || prompt.trim().length < 3}
                  >
                    {busy === 'create' ? (
                      <>
                        <LoaderCircle className="spin" size={18} />
                        Building your encounter…
                      </>
                    ) : (
                      <>
                        Create a raid
                        <ArrowUpRight size={20} />
                      </>
                    )}
                  </button>
                  <div className="training-row">
                    <span>No opponent yet?</span>
                    <button
                      onClick={() => void create(true)}
                      disabled={!!busy || !net.connected || prompt.trim().length < 3}
                    >
                      {busy === 'training' ? 'Opening training…' : 'Try solo training'}
                      <ArrowRight size={14} />
                    </button>
                  </div>
                  <p className="launch-footnote">
                    No downloads. No account. Camera optional. Curated encounters always available.
                  </p>
                </>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void join();
                  }}
                  className="join-form"
                >
                  <span className="eyebrow">THE OTHER SIDE OF THE SCREEN</span>
                  <h3>Become the boss.</h3>
                  <p>
                    Ask your hero for their six-character raid code, or scan their QR code with your
                    phone.
                  </p>
                  <label className="field-label" htmlFor="room-code">
                    RAID CODE
                  </label>
                  <input
                    id="room-code"
                    className="code-input"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={6}
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ''))
                    }
                    placeholder="ABC234"
                  />
                  <button
                    className="button primary full"
                    type="submit"
                    disabled={!!busy || code.length !== 6 || !net.connected}
                  >
                    {busy === 'join' ? (
                      <LoaderCircle className="spin" size={18} />
                    ) : (
                      <Gamepad2 size={18} />
                    )}
                    Possess the boss
                    <ArrowRight size={18} />
                  </button>
                  <p className="launch-footnote">
                    Your camera starts only when you enable it. Touch controls work from the start.
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
          <section className="how-grid" id="how-to-play">
            {[
              {
                n: '01',
                icon: Sparkles,
                title: 'Imagine the impossible.',
                text: 'Describe a showdown. The director assembles an encounter from battle-tested mechanics.',
              },
              {
                n: '02',
                icon: Users,
                title: 'Give your friend the power.',
                text: 'They join on their phone. Their movements become the monster’s attacks. Yours keep you alive.',
              },
              {
                n: '03',
                icon: Globe,
                title: 'Let reality in.',
                text: 'At half health, the arena fractures. Their live room becomes the final battlefield.',
              },
            ].map((c) => (
              <article key={c.n}>
                <span className="step-number">{c.n} /</span>
                <c.icon size={22} />
                <h3>{c.title}</h3>
                <p>{c.text}</p>
              </article>
            ))}
          </section>
        </main>
      ) : (
        <main className="room-main" ref={match}>
          <div className="room-heading">
            <div>
              <span className="eyebrow">
                {state.practice ? 'SOLO TRAINING' : `RAID ${state.code}`}{' '}
                <span className="separator">/</span>{' '}
                {session.role === 'hero' ? 'YOU ARE THE HERO' : 'YOU ARE THE BOSS'}
              </span>
              <h1>{state.spec.title}</h1>
            </div>
            <div className="room-heading-meta">
              <span className={`connection-pill ${net.connected ? 'online' : ''}`}>
                <Radio size={13} />
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
                      .catch(() => setError('Fullscreen is unavailable in this browser.'));
                }}
              >
                <Maximize2 size={17} />
              </button>
            </div>
          </div>
          {!net.connected && (
            <p className="inline-error" role="status">
              Connection interrupted. Reconnecting automatically; the server pauses the raid.
            </p>
          )}
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
              <section className={`encounter-card encounter-${theme}`}>
                <div className="encounter-meta">
                  <span className="eyebrow">ENCOUNTER BRIEF</span>
                  <span className="source-chip">
                    <Sparkles size={12} />
                    {state.source === 'ai' ? 'AI DIRECTED' : 'CURATED ENCOUNTER'}
                  </span>
                </div>
                <RiftArtwork theme={theme} />
                <div className="encounter-details">
                  <span className="eyebrow">YOUR OPPONENT</span>
                  <h2>{state.spec.bossName}</h2>
                  <p>“{state.spec.introLine}”</p>
                  <div className="encounter-traits">
                    <span>
                      <Shield size={14} />
                      {state.spec.bossMaxHp} HP
                    </span>
                    <span>
                      <Zap size={14} />
                      BREACH AT 50%
                    </span>
                    <span>{state.spec.arena.replace('_', ' ').toUpperCase()}</span>
                  </div>
                  <p className="source-note">{state.sourceNote}</p>
                </div>
              </section>
              <div className="lobby-right">
                <section className="room-invite">
                  <div className="section-heading">
                    <h3>
                      {state.practice
                        ? 'Your training room'
                        : session.role === 'hero'
                          ? 'Invite your rival'
                          : 'You’re in. Take control.'}
                    </h3>
                    <Users size={18} />
                  </div>
                  {!state.practice && session.role === 'hero' && (
                    <div className="invite-content">
                      {qr && (
                        <img
                          src={qr}
                          alt={`Scan to join raid ${state.code}`}
                          width="126"
                          height="126"
                        />
                      )}
                      <div>
                        <span className="field-label">RAID CODE</span>
                        <strong className="room-code">{state.code}</strong>
                        <button className="text-link" onClick={() => void copy()}>
                          {copied ? <Check size={14} /> : <Copy size={14} />}{' '}
                          {copied ? 'Link copied' : 'Copy invite link'}
                        </button>
                      </div>
                    </div>
                  )}
                  {!state.practice && session.role === 'hero' && (
                    <input
                      className="invite-url"
                      aria-label="Invite URL"
                      value={net.joinUrl}
                      readOnly
                      onFocus={(e) => e.target.select()}
                    />
                  )}
                  {state.practice && (
                    <p>
                      A training opponent controls the boss. Play the complete raid, learn the
                      timing, then bring a friend.
                    </p>
                  )}
                  {session.role === 'boss' && (
                    <p>
                      Your hero is waiting. Enable a camera for motion controls, or get straight
                      into the fight with the touch buttons.
                    </p>
                  )}
                  <div className="players-list">
                    {(['hero', 'boss'] as const).map((r) => (
                      <div key={r}>
                        <span className={`player-avatar ${r}`}>
                          {r === 'hero' ? <Swords size={16} /> : <Crosshair size={16} />}
                        </span>
                        <span>
                          <strong>
                            {r === 'hero' ? 'Hero' : state.practice ? 'Training boss' : 'Boss'}
                            {session.role === r ? ' (you)' : ''}
                          </strong>
                          <small>
                            {state.players[r].connected
                              ? state.players[r].ready
                                ? 'Ready to raid'
                                : 'Preparing controls'
                              : 'Waiting to join…'}
                          </small>
                        </span>
                        {state.players[r].ready ? (
                          <Check className="ready-check" size={16} />
                        ) : (
                          <span className="waiting-dot" />
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    className={`button ${state.players[session.role].ready ? 'secondary' : 'primary'} full`}
                    onClick={() =>
                      void perform(() =>
                        request('room:ready', {
                          ready: !state.players[session.role].ready,
                          camera: Boolean(camera.stream),
                          controlMode,
                        }),
                      )
                    }
                    disabled={!net.connected}
                  >
                    {state.players[session.role].ready ? (
                      <>
                        <Check size={17} />
                        Ready · click to unready
                      </>
                    ) : (
                      <>
                        I’m ready
                        <Check size={17} />
                      </>
                    )}
                  </button>
                  {session.role === 'hero' ? (
                    <button
                      className="button primary full begin-button"
                      onClick={() => {
                        unlockAudio();
                        void perform(() => request('battle:start'));
                      }}
                      disabled={
                        !net.connected || !state.players.hero.ready || !state.players.boss.ready
                      }
                    >
                      Begin raid
                      <ArrowRight size={18} />
                    </button>
                  ) : (
                    <p className="waiting-caption">The hero starts when you’re both ready.</p>
                  )}
                </section>
                <CameraPanel
                  camera={camera}
                  role={session.role}
                  onAction={onAction}
                  onTarget={net.aim}
                  onMode={setMode}
                  motion={motion}
                  onMotionChange={setMotion}
                  mode={
                    trackingMode ??
                    (session.role === 'boss' && window.innerWidth < 700 ? 'hand' : 'pose')
                  }
                  onTrackingModeChange={setTrackingMode}
                />
              </div>
            </div>
          ) : (
            <>
              <Health state={state} role={session.role} />
              <div className="battle-layout">
                <div className="battle-main">
                  <GameStage
                    state={state}
                    role={session.role}
                    stream={session.role === 'boss' ? camera.stream : peer.remote}
                    onAim={net.aim}
                  />
                  {finished ? (
                    <Result
                      state={state}
                      role={session.role}
                      onRematch={() => void perform(() => request('battle:rematch'))}
                      onLeave={() => void leave()}
                    />
                  ) : (
                    <Controls
                      state={state}
                      role={session.role}
                      onAction={onAction}
                      connected={net.connected}
                    />
                  )}
                </div>
                <aside className="battle-sidebar">
                  <div className="mission-card">
                    <span className="eyebrow">
                      {state.phase === 'REALITY' ? 'FINAL PHASE' : 'YOUR OBJECTIVE'}
                    </span>
                    <h3>
                      {session.role === 'hero' ? 'Break the colossus.' : 'Defend your reality.'}
                    </h3>
                    <p>
                      {session.role === 'hero'
                        ? 'Guard or evade the glowing attack zones. Strike after the boss attacks for bonus damage. Overdrive recharges every 8 seconds.'
                        : 'Use swipe and power attacks to pressure the hero. Guard to reduce damage. In the breach, aim your hand or touch the arena before striking.'}
                    </p>
                    <div className="raid-clock">
                      <span>RAID TIME</span>
                      <strong>
                        {Math.floor(state.elapsed / 60000)
                          .toString()
                          .padStart(2, '0')}
                        :
                        {Math.floor((state.elapsed / 1000) % 60)
                          .toString()
                          .padStart(2, '0')}
                      </strong>
                    </div>
                  </div>
                  <CameraPanel
                    camera={camera}
                    role={session.role}
                    onAction={onAction}
                    onTarget={net.aim}
                    onMode={setMode}
                    motion={motion}
                    onMotionChange={setMotion}
                    mode={
                      trackingMode ??
                      (session.role === 'boss' && window.innerWidth < 700 ? 'hand' : 'pose')
                    }
                    onTrackingModeChange={setTrackingMode}
                  />
                  {!state.practice && (
                    <div className="peer-status">
                      <VideoIcon />
                      {peer.status}
                      <button className="text-link" onClick={peer.retry}>
                        Retry link
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  )}
                </aside>
              </div>
            </>
          )}
        </main>
      )}
      <footer className="site-footer">
        <span>
          GHOSTWIRE <span className="muted">/</span> REALITY RAID
        </span>
        <span>MADE FOR THE WAY HUMANS PLAY.</span>
        <span className="footer-track">
          <span className="tiny-dot green" />
          MAKE ROOM FOR PLAY
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
              ref={helpClose}
              className="icon-button close-modal"
              aria-label="Close instructions"
              onClick={() => setHelp(false)}
            >
              <X size={20} />
            </button>
            <span className="eyebrow">A QUICK FIELD GUIDE</span>
            <h2 id="help-title">Enter. Fight. Breach.</h2>
            <ol>
              <li>
                <strong>Choose a world.</strong>Create a raid and invite a friend using the QR code.
                Or choose solo training.
              </li>
              <li>
                <strong>Get ready.</strong>Camera is optional. If enabled, hold still with your
                shoulders and wrists visible until calibrated.
              </li>
              <li>
                <strong>Play the hero.</strong>
                <kbd>J</kbd> strike, <kbd>K</kbd> guard, <kbd>L</kbd> evade, <kbd>Space</kbd>{' '}
                overdrive, <kbd>A</kbd>/<kbd>D</kbd> change lane.
              </li>
              <li>
                <strong>Be the boss.</strong>
                <kbd>J</kbd> swipe, <kbd>K</kbd> guard, <kbd>Space</kbd> power. All controls are
                also touch buttons.
              </li>
              <li>
                <strong>Break reality.</strong>At 50% boss health the arena fractures. With a live
                boss camera, the room becomes the backdrop. Aim your hand or pointer, then attack.
              </li>
            </ol>
            <p>
              Attack zones lock when a move starts. Time your defense before the ring fills. Boss
              armor is weaker just after an attack.
            </p>
            <p className="muted">
              Play seated or standing with small, comfortable movements. No audio or video is
              recorded.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
function ScanIcon() {
  return <Crosshair size={13} />;
}
function VideoIcon() {
  return <Radio size={13} />;
}
