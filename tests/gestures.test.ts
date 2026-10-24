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
