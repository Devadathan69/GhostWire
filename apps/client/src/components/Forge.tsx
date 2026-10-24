import { useEffect, useState } from 'react';
import {
  AppearanceSchema,
  ControlKeySchema,
  EffectSchema,
  GESTURE_LABELS,
  HERO_ACTIONS,
  validateCreation,
  CreativeEncounterSchema,
  type BattleSpec,
  type ForgeBrief,
  type HeroDesign,
} from '@ghostwire/shared';
import { ForgePreview } from './ForgePreview';

const initial: ForgeBrief = {
  story: 'A squad of cosmic guardians defend a fractured city from an invading titan.',
  heroes: 'Thunder guardian, Arc mage',
  boss: 'The Rift Titan',
  environment: 'A rain-soaked futuristic city with ruined towers and glowing crystals',
  powers: 'Lightning hammer and arcane shields',
  controls: 'Arm extension to strike, both hands overhead for ultimate power',
};
async function post(path: string, data: unknown, signal?: AbortSignal) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal,
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'The creator could not complete that request.');
  return result;
}
export function Forge({
  connected,
  onCreate,
}: {
  connected: boolean;
  onCreate: (id: string) => Promise<void>;
}) {
  const [brief, setBrief] = useState(initial),
    [spec, setSpec] = useState<BattleSpec | null>(null),
    [selected, setSelected] = useState(0),
    [busy, setBusy] = useState(''),
    [error, setError] = useState(''),
    [note, setNote] = useState(''),
    [config, setConfig] = useState<{ aiConfigured: boolean; model: string } | null>(null),
    [raw, setRaw] = useState('');
  useEffect(() => {
    void fetch('/api/config')
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setError('Could not read creator configuration.'));
  }, []);
  const [controller, setController] = useState<AbortController | null>(null);
  useEffect(() => () => controller?.abort(), [controller]);
  const creation = spec?.creation,
    hero = creation?.heroes[selected];
  function editHero(edit: (h: HeroDesign) => void) {
    setSpec((old) => {
      if (!old?.creation) return old;
      const next = structuredClone(old);
      edit(next.creation!.heroes[selected]);
      return next;
    });
  }
  function editWorld(edit: (c: NonNullable<BattleSpec['creation']>) => void) {
    setSpec((old) => {
      if (!old?.creation) return old;
      const next = structuredClone(old);
      edit(next.creation!);
      return next;
    });
  }
  async function generate(mode: 'ai' | 'local') {
    setBusy(mode);
    setError('');
    const ctrl = new AbortController();
    setController(ctrl);
    const timer = setTimeout(() => ctrl.abort(), 90000);
    try {
      const data = await post('/api/forge', { mode, brief }, ctrl.signal);
      setSpec(data.spec);
      setSelected(0);
      setNote(data.sourceNote);
      setRaw('');
    } catch (e) {
      setError(
        (e as Error).name === 'AbortError'
          ? 'Generation stopped. Your previous blueprint is still editable.'
          : (e as Error).message,
      );
    } finally {
      clearTimeout(timer);
      setBusy('');
    }
  }
  async function create() {
    if (!spec?.creation) return;
    setError('');
    const issue = validateCreation(spec.creation);
    if (issue) {
      setError(issue);
      return;
    }
    setBusy('save');
    try {
      const result = await post('/api/forge/save', spec);
      await onCreate(result.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  }
  return (
    <div className="forge">
      <div className="forge-intro">
        <span className="eyebrow">PROMPT → EDIT → PLAY</span>
        <h3>Your characters. Your world.</h3>
        <p>
          Describe a movie, story, characters, and the fight you imagine. Build playable 3D heroes
          and a final boss, then fine-tune their powers and controls.
        </p>
        <small>
          {config
            ? `${config.aiConfigured ? 'AI key configured' : 'AI key not configured'} · ${config.model}`
            : 'Checking AI setup…'}
        </small>
      </div>
      <div className="forge-brief">
        {(
          [
            ['story', 'MOVIE / STORY & FIGHT CONTEXT', 1200],
            ['heroes', 'HERO NAMES · COMMA SEPARATED (2–4)', 240],
            ['boss', 'FINAL BOSS', 120],
            ['environment', 'FIGHTING ENVIRONMENT', 400],
            ['powers', 'POWERS & MOVEMENTS', 500],
            ['controls', 'DESIRED KEYS / PHYSICAL GESTURES', 400],
          ] as const
        ).map(([key, label, max]) => (
          <label className={`field-label ${key === 'story' ? 'wide' : ''}`} key={key}>
            {label}
            <textarea
              aria-label={label}
              maxLength={max}
              value={brief[key]}
              onChange={(e) => setBrief({ ...brief, [key]: e.target.value })}
            />
          </label>
        ))}
      </div>
      <div className="forge-actions">
        <button
          className="button primary"
          disabled={Boolean(busy) || brief.story.trim().length < 3}
          onClick={() => void generate('ai')}
        >
          {busy === 'ai' ? 'Creating your world…' : 'Generate with AI'}
        </button>
        <button
          className="button secondary"
          disabled={Boolean(busy) || brief.story.trim().length < 3}
          onClick={() => void generate('local')}
        >
          Build local blueprint
        </button>
        {busy === 'ai' && (
          <button className="button subtle" onClick={() => controller?.abort()}>
            Cancel generation
          </button>
        )}
      </div>
      <p className="source-note">
        AI generation needs a server API key and sends this brief to OpenAI. Local blueprints use
        editable templates and make no AI call. Both use animated procedural 3D parts and supported
        power effects; exact movie assets and actor likenesses are outside this creator.
      </p>
      {creation && spec && hero && (
        <div className="forge-editor">
          <div className="section-heading">
            <h3>REVIEW YOUR PLAYABLE BLUEPRINT</h3>
            <span>{note}</span>
          </div>
          <ForgePreview spec={spec} />
          <p>{creation.explanation}</p>
          <div className="forge-hero-tabs">
            {creation.heroes.map((h, i) => (
              <button
                className={`button ${selected === i ? 'primary' : 'secondary'} small`}
                key={i}
                onClick={() => setSelected(i)}
              >
                {h.name}
              </button>
            ))}
          </div>
          <div className="forge-fields">
            <label className="field-label">
              HERO NAME
              <input
                className="raid-input"
                value={hero.name}
                maxLength={28}
                onChange={(e) =>
                  editHero((h) => {
                    h.name = e.target.value;
                  })
                }
              />
            </label>
            {(['archetype', 'head', 'weapon'] as const).map((field) => (
              <label key={field} className="field-label">
                {field.toUpperCase()}
                <select
                  aria-label={`Hero ${field}`}
                  value={hero.appearance[field]}
                  onChange={(e) =>
                    editHero((h) => {
                      (h.appearance[field] as string) = e.target.value;
                    })
                  }
                >
                  {AppearanceSchema.shape[field].options.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            ))}
            {(['bodyColor', 'trimColor', 'accentColor'] as const).map((field) => (
              <label key={field} className="field-label">
                {field.replace('Color', ' COLOR').toUpperCase()}
                <input
                  type="color"
                  value={hero.appearance[field]}
                  onChange={(e) =>
                    editHero((h) => {
                      h.appearance[field] = e.target.value;
                    })
                  }
                />
              </label>
            ))}
            <label className="field-label">
              CAPE
              <input
                type="checkbox"
                checked={hero.appearance.cape}
                onChange={(e) =>
                  editHero((h) => {
                    h.appearance.cape = e.target.checked;
                  })
                }
              />
            </label>
          </div>
          <div className="ability-editor">
            {hero.abilities.map((ability, i) => (
              <fieldset key={ability.action}>
                <legend>{ability.action.toUpperCase()}</legend>
                <label>
                  Power name
                  <input
                    className="raid-input"
                    value={ability.name}
                    maxLength={28}
                    onChange={(e) =>
                      editHero((h) => {
                        h.abilities[i].name = e.target.value;
                      })
                    }
                  />
                </label>
                <label>
                  Keyboard
                  <select
                    aria-label={`${ability.action} key`}
                    value={ability.key}
                    onChange={(e) =>
                      editHero((h) => {
                        h.abilities[i].key = e.target.value as typeof ability.key;
                      })
                    }
                  >
                    {ControlKeySchema.options.map((key) => (
                      <option key={key} value={key}>
                        {key === ' ' ? 'Space' : key.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Physical gesture
                  <select
                    aria-label={`${ability.action} gesture`}
                    value={ability.gesture}
                    onChange={(e) =>
                      editHero((h) => {
                        h.abilities[i].gesture = e.target.value as typeof ability.gesture;
                      })
                    }
                  >
                    {HERO_ACTIONS.map((a) => (
                      <option key={a} value={a}>
                        {GESTURE_LABELS[a]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Effect
                  <select
                    value={ability.effect}
                    onChange={(e) =>
                      editHero((h) => {
                        h.abilities[i].effect = e.target.value as typeof ability.effect;
                      })
                    }
                  >
                    {EffectSchema.options.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Damage
                  <input
                    type="number"
                    min={0}
                    max={40}
                    value={ability.damage}
                    onChange={(e) =>
                      editHero((h) => {
                        h.abilities[i].damage = Number(e.target.value);
                      })
                    }
                  />
                </label>
                <label>
                  Recharge (ms)
                  <input
                    type="number"
                    min={200}
                    max={12000}
                    step={50}
                    value={ability.cooldownMs}
                    onChange={(e) =>
                      editHero((h) => {
                        h.abilities[i].cooldownMs = Number(e.target.value);
                      })
                    }
                  />
                </label>
                <small>{ability.description}</small>
              </fieldset>
            ))}
          </div>
          <p className="source-note">
            Six distinct keys and gestures are required. Movement: WASD / arrows, Shift to sprint, F
            to revive. Body mode: lean sideways, lean closer to move forward, straighten to move
            back; widen shoulders in camera view to sprint. Touch: hold the direction pad. Power
            effects animate on Overdrive; basic attacks retain their melee or rift animation.
          </p>
          <h3>Final boss</h3>
          <div className="forge-fields">
            <label className="field-label">
              BOSS NAME
              <input
                className="raid-input"
                value={creation.boss.name}
                maxLength={28}
                onChange={(e) =>
                  editWorld((c) => {
                    c.boss.name = e.target.value;
                  })
                }
              />
            </label>
            <label className="field-label">
              BOSS FORM
              <select
                value={creation.boss.appearance.archetype}
                onChange={(e) =>
                  editWorld((c) => {
                    c.boss.appearance.archetype = e.target
                      .value as typeof c.boss.appearance.archetype;
                  })
                }
              >
                {AppearanceSchema.shape.archetype.options.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            {(['bodyColor', 'trimColor', 'accentColor'] as const).map((field) => (
              <label key={field} className="field-label">
                {field.replace('Color', ' COLOR').toUpperCase()}
                <input
                  type="color"
                  value={creation.boss.appearance[field]}
                  onChange={(e) =>
                    editWorld((c) => {
                      c.boss.appearance[field] = e.target.value;
                    })
                  }
                />
              </label>
            ))}
          </div>
          <div className="ability-editor">
            {creation.boss.attacks.map((a, i) => (
              <fieldset key={i}>
                <legend>BOSS ATTACK {i + 1}</legend>
                <label>
                  Name
                  <input
                    className="raid-input"
                    value={a.name}
                    maxLength={28}
                    onChange={(e) =>
                      editWorld((c) => {
                        c.boss.attacks[i].name = e.target.value;
                      })
                    }
                  />
                </label>
                <label>
                  Pattern
                  <select
                    value={a.mechanic}
                    onChange={(e) =>
                      editWorld((c) => {
                        c.boss.attacks[i].mechanic = e.target.value as typeof a.mechanic;
                      })
                    }
                  >
                    {['claw_sweep', 'fire_orb', 'lightning_burst', 'shadow_wave'].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Damage
                  <input
                    type="number"
                    min={8}
                    max={24}
                    value={a.damage}
                    onChange={(e) =>
                      editWorld((c) => {
                        c.boss.attacks[i].damage = Number(e.target.value);
                      })
                    }
                  />
                </label>
                <label>
                  Warning (ms)
                  <input
                    type="number"
                    min={900}
                    max={2200}
                    step={50}
                    value={a.warning}
                    onChange={(e) =>
                      editWorld((c) => {
                        c.boss.attacks[i].warning = Number(e.target.value);
                      })
                    }
                  />
                </label>
              </fieldset>
            ))}
          </div>
          <h3>Fighting environment</h3>
          <div className="forge-fields">
            <label className="field-label">
              WORLD NAME
              <input
                className="raid-input"
                value={creation.environment.name}
                maxLength={40}
                onChange={(e) =>
                  editWorld((c) => {
                    c.environment.name = e.target.value;
                  })
                }
              />
            </label>
            <label className="field-label">
              WEATHER
              <select
                value={creation.environment.weather}
                onChange={(e) =>
                  editWorld((c) => {
                    c.environment.weather = e.target.value as typeof c.environment.weather;
                  })
                }
              >
                {['rain', 'snow', 'embers', 'stars', 'mist'].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="field-label">
              GROUND
              <select
                value={creation.environment.groundMaterial}
                onChange={(e) =>
                  editWorld((c) => {
                    c.environment.groundMaterial = e.target
                      .value as typeof c.environment.groundMaterial;
                  })
                }
              >
                {['stone', 'metal', 'sand', 'ice'].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            {(['skyColor', 'groundColor', 'propColor'] as const).map((field) => (
              <label key={field} className="field-label">
                {field.replace('Color', ' COLOR').toUpperCase()}
                <input
                  type="color"
                  value={creation.environment[field]}
                  onChange={(e) =>
                    editWorld((c) => {
                      c.environment[field] = e.target.value;
                    })
                  }
                />
              </label>
            ))}
          </div>
          <details>
            <summary>Advanced full blueprint editor</summary>
            <p>
              Edit prop layout, descriptions and other design details. Changes are validated before
              play.
            </p>
            <button
              className="button subtle small"
              onClick={() => setRaw(JSON.stringify(spec, null, 2))}
            >
              Load current blueprint
            </button>
            <textarea
              className="blueprint-json"
              aria-label="Full blueprint JSON"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
            />
            <button
              className="button secondary small"
              onClick={() => {
                try {
                  const p = CreativeEncounterSchema.safeParse(JSON.parse(raw));
                  if (!p.success)
                    throw new Error(p.error.issues[0]?.message || 'Invalid blueprint');
                  const issue = validateCreation(p.data.creation);
                  if (issue) throw new Error(issue);
                  setSpec(p.data);
                  setNote('Imported blueprint · validated and ready for review.');
                  setSelected(0);
                  setError('');
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Apply validated blueprint
            </button>
          </details>
          <button
            className="button primary full"
            disabled={Boolean(busy) || !connected}
            onClick={() => void create()}
          >
            {busy === 'save' ? 'Creating your lobby…' : 'Create lobby with this world'}
          </button>
        </div>
      )}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
