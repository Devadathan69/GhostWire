import {
  COOLDOWNS,
  type Action,
  type Movement,
  type Role,
  type Target,
  type HeroDesign,
} from '@ghostwire/shared';
export type Landmark = { x: number; y: number; z?: number; visibility?: number };
export type Reading = {
  action?: Action;
  target?: Target;
  confidence: number;
  calibrated: boolean;
  progress: number;
  landmarks: Landmark[];
  movement?: Movement;
};
const dist = (a: Landmark, b: Landmark) => Math.hypot(a.x - b.x, a.y - b.y);
export class GestureClassifier {
  private previous: Landmark[] = [];
  private previousAt = 0;
  private samples: { y: number; x: number; width: number }[] = [];
  private neutral: { y: number; x: number; width: number } | null = null;
  private held = '';
  private heldAt = 0;
  private emissions = new Map<string, number>();
  private extended = false;
  reset() {
    this.previous = [];
    this.samples = [];
    this.neutral = null;
    this.held = '';
    this.extended = false;
    this.previousAt = 0;
    this.emissions.clear();
  }
  read(
    raw: Landmark[],
    now: number,
    role: Role,
    mode: 'pose' | 'hand' = 'pose',
    design?: HeroDesign,
  ): Reading {
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
    let movement: Movement = { x: 0, z: 0, sprint: false };
    const axis = (value: number, dead = 0.2) =>
      Math.abs(value) < dead
        ? 0
        : Math.max(-1, Math.min(1, Math.sign(value) * (Math.abs(value) - dead) * 1.8));
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
        const indexUp =
          dist(points[8], points[0]) > dist(points[6], points[0]) * 1.2 &&
          points[8].y < points[6].y - size * 0.2;
        if (role === 'hero' && folded === 3 && indexUp) candidate = 'jump';
        else if (folded >= 3) candidate = 'guard';
        else if (pinch < 0.25) candidate = role === 'hero' ? 'special' : 'power';
        else if (speed > 2.6) candidate = role === 'hero' ? 'punch' : 'swipe';
        if (role === 'hero' && !candidate)
          movement = {
            x: axis((this.neutral.x - target.x) / size, 0.65),
            z: axis((target.y - this.neutral.y) / size, 0.65),
            sprint: false,
          };
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
        const aboveHead = Math.min(y - width * 0.5, points[0].y - width * 0.15);
        const raised = lw.y < aboveHead && rw.y < aboveHead;
        const guard =
          dist(lw, rs) < width * 1.15 &&
          dist(rw, ls) < width * 1.15 &&
          lw.y < y + width * 0.65 &&
          rw.y < y + width * 0.65;
        const speed = this.previous[16]
          ? Math.max(dist(rw, this.previous[16]), dist(lw, this.previous[15])) / dt / width
          : 0;
        const reach = Math.max(dist(lw, ls), dist(rw, rs)) / width;
        const oneRaised =
          (lw.y < aboveHead && rw.y > rs.y + width * 0.25) ||
          (rw.y < aboveHead && lw.y > ls.y + width * 0.25);
        const kneeUp = [
          [23, 25],
          [24, 26],
        ].some(
          ([hip, knee]) =>
            points[hip] &&
            points[knee] &&
            (points[hip].visibility ?? 1) >= 0.65 &&
            (points[knee].visibility ?? 1) >= 0.65 &&
            points[knee].y < points[hip].y - width * 0.18,
        );
        if (raised) candidate = role === 'hero' ? 'special' : 'power';
        else if (guard) candidate = 'guard';
        else if (role === 'hero' && y - this.neutral.y > this.neutral.width * 0.3)
          candidate = 'dodge';
        else if (role === 'hero' && kneeUp) candidate = 'kick';
        else if (role === 'hero' && oneRaised) candidate = 'jump';
        else if (reach > 1.45 && speed > 1.5 && !this.extended) {
          candidate = role === 'hero' ? 'punch' : 'swipe';
          this.extended = true;
        }
        if (reach < 1.15) this.extended = false;
        const widthRatio = width / this.neutral.width;
        movement = {
          x: axis((this.neutral.x - x) / this.neutral.width),
          z: axis((1 - widthRatio) * 3.5, 0.3),
          sprint: widthRatio > 1.32,
        };
        if (candidate === 'dodge' || candidate === 'kick' || candidate === 'jump')
          movement = { x: movement.x, z: 0, sprint: false };
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
    const mapped =
      role === 'hero' ? design?.abilities.find((a) => a.gesture === candidate) : undefined;
    const cooldown = mapped?.cooldownMs ?? (candidate ? COOLDOWNS[candidate as Action] : 650);
    const hold = candidate === 'special' || candidate === 'power' ? 450 : 220;
    if (
      candidate &&
      (instant || now - this.heldAt >= hold) &&
      now - (this.emissions.get(candidate) ?? -10000) >= cooldown
    ) {
      action = mapped?.action ?? (candidate as Action);
      this.emissions.set(candidate, now);
    }
    return {
      action,
      target,
      confidence,
      calibrated: !!this.neutral,
      progress: Math.min(1, this.samples.length / 20),
      landmarks: points,
      movement,
    };
  }
}
