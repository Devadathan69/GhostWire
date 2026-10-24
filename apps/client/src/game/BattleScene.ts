import * as THREE from 'three';
import { heroPosition, type BattleState, type PendingAttack } from '@ghostwire/shared';
import { createArena } from './arena';
import { createBoss, createHero, type Fighter } from './fighters';
import { disposeObject, luminous, mesh, screenToWorld, worldToScreen } from './geometry';
import { cue } from './audio';

const FLOOR = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const clamp = THREE.MathUtils.clamp;
type Effect = { object: THREE.Object3D; born: number; duration: number; velocity: THREE.Vector3 };
type AttackVisual = { root: THREE.Group; ring: THREE.Mesh; orb: THREE.Mesh; trail: THREE.Mesh };

/** Presentation only: hits, lanes, timing and health remain server authoritative. */
export class BattleScene {
  private renderer: THREE.WebGLRenderer;
  private world = new THREE.Scene();
  private overlay = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(43, 16 / 9, 0.1, 130);
  private overlayCamera = new THREE.OrthographicCamera(-640, 640, 360, -360, 0.1, 10);
  private hero: Fighter;
  private boss: Fighter;
  private arena: ReturnType<typeof createArena>;
  private shadow: THREE.Mesh;
  private reticle = new THREE.Group();
  private attacks = new Map<number, AttackVisual>();
  private effects: Effect[] = [];
  private state: BattleState;
  private received = performance.now();
  private lastEvent = 0;
  private lastPhase = '';
  private liveCamera = false;
  private view: 'duel' | 'overlook' = 'duel';
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private observer: ResizeObserver;
  private previous = performance.now();
  private hitAt = { hero: -1000, boss: -1000 };
  private disposed = false;
  private themeBackground: THREE.Color;
  private fog: THREE.FogExp2;
  private cameraGoal = new THREE.Vector3();
  private frames = 0;
  private sampleAt = performance.now();
  private lowDetail = false;
  private restoreListener = () => this.onError(null);
  private lossListener = (event: Event) => {
    event.preventDefault();
    delete this.renderer.domElement.dataset.ready;
    this.onError('The 3D view was interrupted. Waiting for your graphics to recover…');
  };

  constructor(
    private mount: HTMLDivElement,
    initial: BattleState,
    private onError: (message: string | null) => void,
  ) {
    this.state = initial;
    this.lastEvent = initial.events.at(-1)?.id ?? 0;
    this.lastPhase = initial.phase;
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    this.renderer.domElement.dataset.renderer = 'three';
    this.renderer.domElement.setAttribute('role', 'img');
    this.renderer.domElement.setAttribute(
      'aria-label',
      '3D battle arena with an armored hero and a horned colossus',
    );
    this.renderer.domElement.addEventListener('webglcontextlost', this.lossListener);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.restoreListener);
    mount.appendChild(this.renderer.domElement);
    this.themeBackground = new THREE.Color(
      initial.spec.arena === 'shadow_forest'
        ? '#141323'
        : initial.spec.arena === 'storm'
          ? '#101c2d'
          : '#19202b',
    );
    this.fog = new THREE.FogExp2(this.themeBackground, 0.026);
    this.world.background = this.themeBackground;
    this.world.fog = this.fog;
    this.camera.position.set(0, 6.6, 14.8);
    this.camera.lookAt(0, 1.4, 0);
    this.camera.updateMatrixWorld();
    this.overlayCamera.position.z = 5;
    this.world.add(new THREE.HemisphereLight('#c2deff', '#5c3840', 2.5));
    const sun = new THREE.DirectionalLight('#e6f3ff', 3.8);
    sun.position.set(-4, 9, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, {
      left: -10,
      right: 10,
      top: 10,
      bottom: -10,
      near: 0.5,
      far: 40,
    });
    sun.shadow.normalBias = 0.04;
    sun.shadow.bias = -0.0001;
    this.world.add(sun);
    const rim = new THREE.DirectionalLight(initial.spec.secondaryColor, 3.1);
    rim.position.set(3, 5, -7);
    this.world.add(rim);
    const portalLight = new THREE.PointLight(initial.spec.secondaryColor, 65, 20, 2);
    portalLight.position.set(0, 3, -4);
    this.world.add(portalLight);
    const heroLight = new THREE.PointLight(initial.spec.primaryColor, 15, 9, 2);
    heroLight.position.set(-4, 3, 3);
    this.world.add(heroLight);
    this.arena = createArena(initial.spec);
    this.world.add(this.arena.root);
    this.hero = createHero(initial.spec);
    this.boss = createBoss(initial.spec);
    this.world.add(this.hero.root, this.boss.root);
    this.boss.root.position.set(3.2, 0, -0.8);
    this.boss.root.rotation.y = -0.7;
    this.shadow = mesh(
      this.world,
      new THREE.PlaneGeometry(40, 40),
      new THREE.ShadowMaterial({ opacity: 0.24 }),
      [0, -0.01, 0],
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.castShadow = false;
    this.shadow.visible = false;
    const mat = new THREE.MeshBasicMaterial({
      color: initial.spec.secondaryColor,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
    });
    mesh(this.reticle, new THREE.TorusGeometry(19, 1.2, 5, 40), mat);
    for (let i = 0; i < 4; i++) {
      const bar = mesh(this.reticle, new THREE.BoxGeometry(10, 1.5, 1), mat, [
        Math.cos((i * Math.PI) / 2) * 28,
        Math.sin((i * Math.PI) / 2) * 28,
        0,
      ]);
      bar.rotation.z = (i * Math.PI) / 2;
    }
    this.overlay.add(this.reticle);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(mount);
    this.resize();
    this.renderer.setAnimationLoop(this.render);
  }

  setState(state: BattleState) {
    if (state.clock !== this.state.clock) this.received = performance.now();
    this.state = state;
  }
  setLiveCamera(live: boolean) {
    this.liveCamera = live;
  }
  setView(view: 'duel' | 'overlook') {
    this.view = view;
  }

  private resize() {
    const { width, height } = this.mount.getBoundingClientRect();
    if (!width || !height) return;
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, this.lowDetail ? 0.85 : width < 700 ? 1.35 : 1.5),
    );
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
  private ground(x: number, y = 0.79) {
    return screenToWorld(this.camera, { x, y }, FLOOR) ?? new THREE.Vector3();
  }

  private burst(position: THREE.Vector3, color: string, at: number, count = 16) {
    if (this.reduced) count = 5;
    const geo = new THREE.OctahedronGeometry(0.065),
      mat = luminous(color, 2);
    const group = new THREE.Group();
    this.world.add(group);
    group.position.copy(position);
    for (let i = 0; i < count; i++) {
      const bit = mesh(group, geo, mat);
      bit.castShadow = false;
      bit.userData.velocity = new THREE.Vector3(
        Math.sin(i * 2.4) * 2.7,
        1 + (i % 4) * 0.75,
        Math.cos(i * 2.4) * 2.7,
      );
    }
    this.effects.push({ object: group, born: at, duration: 650, velocity: new THREE.Vector3() });
  }
  private label(position: THREE.Vector3, label: string, color: string, at: number) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#0b1320';
    ctx.strokeText(label, 256, 64);
    ctx.fillStyle = color;
    ctx.fillText(label, 256, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }),
    );
    sprite.position.copy(position);
    sprite.scale.set(3.6, 0.9, 1);
    this.world.add(sprite);
    this.effects.push({
      object: sprite,
      born: at,
      duration: 950,
      velocity: new THREE.Vector3(0, 0.7, 0),
    });
  }
  private events(s: BattleState, now: number) {
    if (s.phase !== this.lastPhase) {
      if (s.phase === 'BREACH_TRANSITION') {
        cue('breach');
        this.burst(new THREE.Vector3(0, 3, 0), s.spec.primaryColor, now, 45);
      }
      if (s.phase === 'VICTORY') {
        cue('win');
        this.burst(
          this.boss.root.position.clone().add(new THREE.Vector3(0, 2, 0)),
          s.spec.secondaryColor,
          now,
          40,
        );
      }
      this.lastPhase = s.phase;
    }
    for (const e of s.events) {
      if (e.id <= this.lastEvent) continue;
      if (e.action === 'hit') {
        const victim = e.role === 'hero' ? this.boss : this.hero;
        const location = victim.root.position
          .clone()
          .add(new THREE.Vector3(0, victim.height * victim.root.scale.y * 0.55, 0));
        if (e.role === 'hero' && !this.boss.root.visible)
          location
            .copy(this.ground(s.bossTarget.x, Math.max(0.45, s.bossTarget.y)))
            .add(new THREE.Vector3(0, 1.4, 0));
        this.burst(
          location,
          e.role === 'hero' ? s.spec.primaryColor : s.spec.secondaryColor,
          now,
          e.damage ? 18 : 6,
        );
        this.label(
          location.clone().add(new THREE.Vector3(0, 0.7, 0)),
          e.damage ? `−${e.damage}${e.label === 'HIT' ? '' : ' ' + e.label}` : e.label,
          e.role === 'hero' ? s.spec.primaryColor : '#ffba9a',
          now,
        );
        if (e.damage) {
          cue('hit');
          this.hitAt[e.role === 'hero' ? 'boss' : 'hero'] = now;
        }
      }
      if (e.action === 'special') cue('special');
      if (e.action === 'guard') cue('guard');
      this.lastEvent = e.id;
    }
  }
  private animateFighter(f: Fighter, role: 'hero' | 'boss', now: number, reality: boolean) {
    const s = this.state,
      hero = role === 'hero',
      seconds = now / 1000;
    const pending = s.pending.find((a) => a.role === role);
    const p = pending
      ? clamp((now - pending.startedAt) / (pending.resolvesAt - pending.startedAt), 0, 1)
      : 0;
    const guard = (hero ? s.heroGuardUntil : s.bossGuardUntil) > now,
      dodge = hero && s.dodgeUntil > now;
    const dead = hero ? s.phase === 'DEFEAT' : s.phase === 'VICTORY';
    const idle = this.reduced ? 0 : Math.sin(seconds * (hero ? 3 : 1.9)) * 0.025;
    const hit = clamp(1 - (now - this.hitAt[role]) / 280, 0, 1);
    f.body.position.y = idle - (dodge ? 0.45 : 0);
    f.body.rotation.set(
      dodge ? 0.5 : -hit * 0.14,
      pending ? Math.sin(p * Math.PI) * (hero ? -0.55 : 0.3) : 0,
      dead ? (hero ? -1.35 : 0.95) : 0,
    );
    f.head.rotation.y = Math.sin(seconds * 0.7) * (this.reduced ? 0 : 0.06);
    f.arms.forEach((arm, i) => {
      arm.rotation.set(guard ? -1.15 : hero ? -0.12 : -0.16, 0, (i ? 1 : -1) * (hero ? 0.1 : 0.15));
      if (pending) {
        if (hero) {
          arm.rotation.x = -Math.sin(p * Math.PI) * 1.8;
          arm.rotation.z += (i ? 1 : -1) * Math.sin(p * Math.PI) * 0.5;
        } else {
          arm.rotation.x = -p * 2.1;
          arm.rotation.z += (i ? 1 : -1) * Math.sin(p * Math.PI) * 0.75;
        }
      }
    });
    f.legs[0].rotation.x = dodge ? -0.45 : 0.08;
    f.legs[1].rotation.x = dodge ? 0.6 : -0.1;
    f.shield.visible = guard;
    f.shield.rotation.y = seconds * 0.4;
    f.aura.visible = !dead;
    f.aura.scale.setScalar(hero ? 1 : 1.6);
    if (f.cape) f.cape.rotation.x = this.reduced ? 0 : Math.sin(seconds * 3) * 0.09 - 0.12;
    if (hero) {
      f.root.rotation.y = reality ? 0.25 : 0.8;
      f.root.scale.setScalar(reality ? 0.66 : 1);
    } else f.root.scale.setScalar(dead ? Math.max(0.05, 1 - (now - s.phaseAt) / 1800) : 1);
  }
  private createAttack(a: PendingAttack): AttackVisual {
    const root = new THREE.Group(),
      color = a.role === 'hero' ? this.state.spec.primaryColor : this.state.spec.secondaryColor;
    const ring = mesh(
      root,
      new THREE.TorusGeometry(1, 0.025, 6, 64),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    const orb = mesh(root, new THREE.IcosahedronGeometry(0.2, 1), luminous(color, 3));
    const trail = mesh(root, new THREE.TorusGeometry(0.35, 0.02, 6, 32), luminous(color));
    this.world.add(root);
    return { root, ring, orb, trail };
  }
  private animateAttacks(s: BattleState, now: number, reality: boolean) {
    const live = new Set(s.pending.map((a) => a.id));
    for (const [id, v] of this.attacks)
      if (!live.has(id)) {
        // A reality telegraph is parented to the screen-space overlay.
        if (v.ring.parent !== v.root) {
          v.ring.removeFromParent();
          disposeObject(v.ring);
        }
        v.root.removeFromParent();
        disposeObject(v.root);
        this.attacks.delete(id);
      }
    for (const a of s.pending) {
      let v = this.attacks.get(a.id);
      if (!v) {
        v = this.createAttack(a);
        this.attacks.set(a.id, v);
      }
      const p = clamp((now - a.startedAt) / (a.resolvesAt - a.startedAt), 0, 1);
      if (a.role === 'boss') {
        const target = this.ground(
          !reality && a.attackId === 'claw_sweep' ? heroPosition(s).x : a.target.x,
        );
        const radius = this.ground(a.target.x + a.radius).distanceTo(this.ground(a.target.x));
        (v.ring.material as THREE.MeshBasicMaterial).opacity = 0.35 + p * 0.6;
        if (reality) {
          // Exact normalized radius: the server measures vertical distance in stage-width units.
          if (v.ring.parent !== this.overlay) this.overlay.add(v.ring);
          v.ring.rotation.x = 0;
          v.ring.position.set((a.target.x - 0.5) * 1280, (0.5 - a.target.y) * 720, 0);
          v.ring.scale.setScalar(a.radius * 1280);
        } else {
          v.ring.position.copy(target).setY(0.07);
          v.ring.scale.setScalar(radius);
        }
        const end = reality ? this.ground(a.target.x, Math.max(0.45, a.target.y)) : target;
        v.orb.position
          .copy(this.boss.root.position)
          .add(new THREE.Vector3(-0.8, 2.6, 0.4))
          .lerp(end.clone().setY(0.3), p * p);
        v.orb.position.y += Math.sin(p * Math.PI) * 2;
        v.orb.scale.setScalar(a.action === 'power' ? 2.4 : 1.2);
      } else {
        const from = this.hero.root.position
          .clone()
          .add(new THREE.Vector3(0, 1.3 * this.hero.root.scale.y, 0));
        const to =
          reality && this.liveCamera
            ? this.ground(s.bossTarget.x, Math.max(0.45, s.bossTarget.y)).add(
                new THREE.Vector3(0, 1.3, 0),
              )
            : this.boss.root.position.clone().add(new THREE.Vector3(0, 2, 0));
        v.orb.position.copy(from).lerp(to, p);
        v.orb.position.y += Math.sin(p * Math.PI) * 0.6;
        v.orb.scale.setScalar(a.action === 'special' ? 2.8 : 1);
        v.ring.position.copy(from).setY(0.08);
        v.ring.scale.setScalar(a.action === 'special' ? 1 + p * 2 : 0.7);
      }
      v.orb.rotation.set(now / 200, now / 300, 0);
      v.trail.position.copy(v.orb.position);
      v.trail.rotation.set(now / 400, now / 300, 0);
      v.trail.scale.setScalar(0.8 + p);
    }
  }
  private render = (frame: number) => {
    if (this.disposed || document.hidden || this.renderer.getContext().isContextLost()) return;
    if (frame - this.previous > 500) {
      this.frames = 0;
      this.sampleAt = performance.now();
    }
    const s = this.state,
      dt = Math.min((frame - this.previous) / 1000, 0.05);
    this.previous = frame;
    this.frames++;
    if (this.frames >= 10 && performance.now() - this.sampleAt > 1500) {
      if (!this.lowDetail && (performance.now() - this.sampleAt) / this.frames > 35) {
        this.lowDetail = true;
        this.renderer.shadowMap.enabled = false;
        this.resize();
      }
      this.frames = 0;
      this.sampleAt = performance.now();
    }
    const paused = s.phase === 'DISCONNECTED';
    const finished = s.phase === 'VICTORY' || s.phase === 'DEFEAT';
    const now =
      s.clock +
      (paused
        ? 0
        : finished
          ? performance.now() - this.received
          : Math.min(performance.now() - this.received, 75));
    const reality =
      s.phase === 'REALITY' ||
      (paused && s.resumePhase === 'REALITY') ||
      (['VICTORY', 'DEFEAT'].includes(s.phase) && s.bossHp <= s.spec.bossMaxHp * 0.5);
    const live = reality && this.liveCamera;
    this.world.background = live ? null : this.themeBackground;
    this.world.fog = live ? null : this.fog;
    this.arena.root.visible = !live;
    this.shadow.visible = live;
    this.boss.root.visible = !live;
    if (this.view === 'overlook' && !reality) this.cameraGoal.set(3.5, 10, 16);
    else this.cameraGoal.set(0, 6.6, 14.8);
    this.camera.position.lerp(this.cameraGoal, this.reduced ? 1 : 1 - Math.exp(-dt * 4));
    this.camera.lookAt(0, 1.4, 0);
    this.camera.updateMatrixWorld();
    const pos = heroPosition({ ...s, phase: reality ? 'REALITY' : s.phase });
    this.hero.root.position.copy(this.ground(pos.x, pos.y));
    this.animateFighter(this.hero, 'hero', now, reality);
    this.animateFighter(this.boss, 'boss', now, reality);
    this.reticle.visible = reality;
    this.reticle.position.set((s.bossTarget.x - 0.5) * 1280, (0.5 - s.bossTarget.y) * 720, 0.1);
    this.arena.inner.rotation.z = this.reduced ? 0 : now / 18000;
    this.arena.vortex.uniforms.time.value = this.reduced ? 0 : now / 1000;
    this.arena.debris.children.forEach((object, i) => {
      object.position.y =
        object.userData.baseY + (this.reduced ? 0 : Math.sin(now / 1500 + i) * 0.18);
      object.rotation.y = this.reduced ? i : now / 9000 + i;
    });
    this.arena.stars.rotation.y = this.reduced ? 0 : now / 140000;
    if (s.phase === 'BREACH_TRANSITION' && !this.reduced) {
      const p = clamp((now - s.phaseAt) / 2600, 0, 1);
      this.arena.portal.scale.setScalar(1 + p * 1.8);
      this.arena.portal.rotation.z = p * 0.3;
    } else {
      this.arena.portal.scale.setScalar(1);
      this.arena.portal.rotation.z = 0;
    }
    this.events(s, now);
    this.animateAttacks(s, now, reality);
    this.effects = this.effects.filter((effect) => {
      const age = (now - effect.born) / 1000;
      if (age * 1000 > effect.duration) {
        effect.object.removeFromParent();
        disposeObject(effect.object);
        return false;
      }
      if (effect.object instanceof THREE.Sprite) {
        effect.object.position.addScaledVector(effect.velocity, paused ? 0 : dt);
        effect.object.material.opacity = Math.max(0, 1 - (age * 1000) / effect.duration);
      } else
        effect.object.children.forEach((bit) => {
          bit.position.copy(bit.userData.velocity as THREE.Vector3).multiplyScalar(age);
          bit.position.y -= age * age * 2.5;
          bit.scale.setScalar(Math.max(0.01, 1 - (age * 1000) / effect.duration));
        });
      return true;
    });
    this.renderer.autoClear = true;
    this.renderer.render(this.world, this.camera);
    this.renderer.autoClear = false;
    this.renderer.clearDepth();
    this.renderer.render(this.overlay, this.overlayCamera);
    this.renderer.domElement.dataset.ready = 'true';
    const anchor = worldToScreen(this.camera, this.hero.root.position);
    this.renderer.domElement.dataset.heroAnchor = `${anchor.x.toFixed(3)},${anchor.y.toFixed(3)}`;
  };
  destroy() {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.observer.disconnect();
    this.renderer.domElement.removeEventListener('webglcontextlost', this.lossListener);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.restoreListener);
    disposeObject(this.world);
    disposeObject(this.overlay);
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
