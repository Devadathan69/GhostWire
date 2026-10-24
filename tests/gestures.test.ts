import { describe, it, expect } from 'vitest';
import { GestureClassifier, type Landmark } from '../apps/client/src/cv/gestures';
function neutral(): Landmark[] {
  const p = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.8, visibility: 1 }));
  p[0] = { x: 0.5, y: 0.2, visibility: 1 };
  p[11] = { x: 0.4, y: 0.4, visibility: 1 };
  p[12] = { x: 0.6, y: 0.4, visibility: 1 };
  p[13] = { x: 0.37, y: 0.55, visibility: 1 };
  p[14] = { x: 0.63, y: 0.55, visibility: 1 };
  p[15] = { x: 0.4, y: 0.6, visibility: 1 };
  p[16] = { x: 0.6, y: 0.6, visibility: 1 };
  return p;
}
const calibrate = (c: GestureClassifier) => {
  for (let i = 0; i < 25; i++) c.read(neutral(), i * 70, 'hero');
};
describe('motion safeguards', () => {
  it('supports hero one-hand jump and pinch-overdrive without turning a fist into a jump', () => {
    const open = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.6, visibility: 1 }));
    open[0] = { x: 0.5, y: 0.8, visibility: 1 };
    open[9] = { x: 0.5, y: 0.6, visibility: 1 };
    open[4] = { x: 0.3, y: 0.55, visibility: 1 };
    for (const [tip, x] of [
      [8, 0.43],
      [12, 0.5],
      [16, 0.57],
      [20, 0.64],
    ]) {
      open[tip] = { x, y: 0.3, visibility: 1 };
      open[tip - 2] = { x, y: 0.57, visibility: 1 };
    }
    for (const name of ['jump', 'special', 'guard']) {
      const c = new GestureClassifier();
      for (let i = 0; i < 25; i++) c.read(open, i * 70, 'hero', 'hand');
      const pose = open.map((p) => ({ ...p }));
      if (name === 'special') pose[4] = { ...pose[8] };
      else
        for (const tip of name === 'jump' ? [12, 16, 20] : [8, 12, 16, 20])
          pose[tip] = { x: 0.51, y: 0.76, visibility: 1 };
      const actions = [];
      for (let i = 0; i < 20; i++) {
        const a = c.read(pose, 1800 + i * 70, 'hero', 'hand').action;
        if (a) actions.push(a);
      }
      expect(actions).toContain(name);
      if (name === 'guard') expect(actions).not.toContain('jump');
    }
  });
  it('recognizes hero overdrive, one-hand jump and knee kick after calibration', () => {
    for (const [name, change] of [
      [
        'special',
        (p: Landmark[]) => {
          p[15].y = 0.1;
          p[16].y = 0.1;
        },
      ],
      [
        'jump',
        (p: Landmark[]) => {
          p[15].y = 0.03;
        },
      ],
      [
        'kick',
        (p: Landmark[]) => {
          p[23].y = 0.72;
          p[25].y = 0.58;
        },
      ],
    ] as const) {
      const c = new GestureClassifier();
      calibrate(c);
      const p = neutral();
      change(p);
      const found = [];
      for (let i = 0; i < 15; i++) {
        const action = c.read(p, 1800 + i * 70, 'hero').action;
        if (action) found.push(action);
      }
      expect(found).toContain(name);
    }
  });
  it('maps mirrored body lean and calibrated depth to continuous movement', () => {
    const c = new GestureClassifier();
    calibrate(c);
    const p = neutral().map((point) => ({ ...point, x: point.x + 0.12 }));
    let reading = c.read(p, 1800, 'hero');
    for (let i = 1; i < 12; i++) reading = c.read(p, 1800 + i * 70, 'hero');
    expect(reading.movement!.x).toBeLessThan(-0.3);
    c.reset();
    calibrate(c);
    const near = neutral().map((point) => ({ ...point, x: 0.5 + (point.x - 0.5) * 1.4 }));
    for (let i = 0; i < 12; i++) reading = c.read(near, 1800 + i * 70, 'hero');
    expect(reading.movement!.z).toBeLessThan(-0.3);
    expect(reading.movement!.sprint).toBe(true);
    expect(c.read([], 3000, 'hero').movement).toBeUndefined();
  });
  it('requires neutral calibration and ignores missing or low-confidence wrists', () => {
    const c = new GestureClassifier();
    expect(c.read(neutral(), 0, 'hero').calibrated).toBe(false);
    calibrate(c);
    expect(c.read(neutral(), 1800, 'hero').calibrated).toBe(true);
    const p = neutral();
    p[16].visibility = 0.1;
    expect(c.read(p, 1900, 'hero').action).toBeUndefined();
    expect(c.read([], 2000, 'hero').confidence).toBe(0);
  });
  it('emits a single punch for an extended arm and requires release', () => {
    const c = new GestureClassifier();
    calibrate(c);
    const p = neutral();
    p[16] = { x: 0.99, y: 0.4, visibility: 1 };
    const actions = [];
    for (let i = 0; i < 20; i++) {
      const a = c.read(p, 1800 + i * 70, 'hero').action;
      if (a) actions.push(a);
    }
    expect(actions).toEqual(['punch']);
  });
  it('detects held guard and duck after a stable interval', () => {
    const c = new GestureClassifier();
    calibrate(c);
    const p = neutral();
    p[15] = { x: 0.56, y: 0.42, visibility: 1 };
    p[16] = { x: 0.44, y: 0.42, visibility: 1 };
    const guard = [];
    for (let i = 0; i < 10; i++) {
      const a = c.read(p, 1800 + i * 70, 'hero').action;
      if (a) guard.push(a);
    }
    expect(guard).toEqual(['guard']);
    c.reset();
    calibrate(c);
    const duck = neutral().map((p) => ({ ...p, y: p.y + 0.13 }));
    const moves = [];
    for (let i = 0; i < 10; i++) {
      const a = c.read(duck, 1800 + i * 70, 'hero').action;
      if (a) moves.push(a);
    }
    expect(moves).toContain('dodge');
  });
});
