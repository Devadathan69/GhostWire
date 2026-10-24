import type { Action, Role, Target } from '@ghostwire/shared';
export type Landmark = { x: number; y: number; z?: number; visibility?: number };
export type Reading = {
  action?: Action;
  target?: Target;
  confidence: number;
  calibrated: boolean;
  progress: number;
  landmarks: Landmark[];
};
const dist = (a: Landmark, b: Landmark) => Math.hypot(a.x - b.x, a.y - b.y);
export class GestureClassifier {
  private previous: Landmark[] = [];
  private previousAt = 0;
  private samples: { y: number; x: number; width: number }[] = [];
  private neutral: { y: number; x: number; width: number } | null = null;
  private held = '';
  private heldAt = 0;
  private lastEmit = -10000;
  private extended = false;
  reset() {
    this.previous = [];
    this.samples = [];
    this.neutral = null;
    this.held = '';
    this.extended = false;
    this.previousAt = 0;
    this.lastEmit = -10000;
  }
  read(raw: Landmark[], now: number, role: Role, mode: 'pose' | 'hand' = 'pose'): Reading {
    const required = mode === 'pose' ? [0, 11, 12, 13, 14, 15, 16] : [0, 4, 8, 9, 12, 16, 20];
    const confidence = required.every((i) => raw[i])
      ? Math.min(...required.map((i) => raw[i].visibility ?? 1))
      : 0;
    if (confidence < 0.55) {
      this.previous = [];
      this.held = '';
      this.extended = false;
      if (!this.neutral) this.samples = [];
      return {
        confidence,
        calibrated: !!this.neutral,
        progress: this.samples.length / 20,
        landmarks: [],
      };
    }
    const points = raw.map((p, i) => {
      const old = this.previous[i];
      return old ? { ...p, x: old.x * 0.45 + p.x * 0.55, y: old.y * 0.45 + p.y * 0.55 } : p;
    });
    const dt = Math.max(0.03, Math.min(0.2, (now - this.previousAt) / 1000));
    let candidate = '',
      target: Target | undefined;
    if (mode === 'hand') {
      const size = Math.max(0.05, dist(points[0], points[9]));
      target = { x: points[9].x, y: points[9].y };
      if (!this.neutral) {
        this.samples.push({ x: target.x, y: target.y, width: size });
        if (this.samples.length >= 20) this.neutral = { x: target.x, y: target.y, width: size };
      } else {
        const folded = [8, 12, 16, 20].filter(
          (i) => dist(points[i], points[0]) < dist(points[i - 2], points[0]) * 1.05,
        ).length;
        const pinch = dist(points[4], points[8]) / size;
        const speed = this.previous[9] ? Math.abs(points[9].x - this.previous[9].x) / dt / size : 0;
        if (folded >= 3) candidate = 'guard';
        else if (pinch < 0.25) candidate = 'power';
        else if (speed > 2.6) candidate = 'swipe';
      }
    } else {
      const [ls, rs, lw, rw] = [points[11], points[12], points[15], points[16]];
      const width = Math.max(0.06, dist(ls, rs)),
        y = (ls.y + rs.y) / 2,
        x = (ls.x + rs.x) / 2;
      target = { x: rw.x, y: rw.y };
      if (!this.neutral) {
        this.samples.push({ x, y, width });
        if (this.samples.length >= 20)
          this.neutral = this.samples.reduce(
            (a, b) => ({ x: a.x + b.x / 20, y: a.y + b.y / 20, width: a.width + b.width / 20 }),
            { x: 0, y: 0, width: 0 },
          );
      } else {
        const raised = lw.y < ls.y - width * 0.5 && rw.y < rs.y - width * 0.5;
        const guard =
          dist(lw, rs) < width * 1.15 &&
          dist(rw, ls) < width * 1.15 &&
          lw.y < y + width * 0.65 &&
          rw.y < y + width * 0.65;
        const speed = this.previous[16]
          ? Math.max(dist(rw, this.previous[16]), dist(lw, this.previous[15])) / dt / width
          : 0;
        const reach = Math.max(dist(lw, ls), dist(rw, rs)) / width;
        if (role === 'boss' && raised) candidate = 'power';
        else if (guard) candidate = 'guard';
        else if (role === 'hero' && y - this.neutral.y > this.neutral.width * 0.3)
          candidate = 'dodge';
        else if (reach > 1.45 && speed > 1.5 && !this.extended) {
          candidate = role === 'hero' ? 'punch' : 'swipe';
          this.extended = true;
        }
        if (reach < 1.15) this.extended = false;
      }
    }
    this.previous = points;
    this.previousAt = now;
    let action: Action | undefined;
    if (candidate !== this.held) {
      this.held = candidate;
      this.heldAt = now;
    }
    const instant = ['punch', 'swipe'].includes(candidate);
    const cooldown =
      candidate === 'guard'
        ? 1500
        : candidate === 'power'
          ? 3600
          : candidate === 'dodge'
            ? 1700
            : 650;
    if (candidate && (instant || now - this.heldAt >= 220) && now - this.lastEmit >= cooldown) {
      action = candidate as Action;
      this.lastEmit = now;
    }
    return {
      action,
      target,
      confidence,
      calibrated: !!this.neutral,
      progress: Math.min(1, this.samples.length / 20),
      landmarks: points,
    };
  }
}
