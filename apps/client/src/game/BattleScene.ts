import * as THREE from 'three';
import {
  heroPosition,
  MELEE_RANGE,
  type BattleState,
  type PendingAttack,
  type Target,
} from '@ghostwire/shared';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createArena } from './arena';
import { createBoss, createHero, type Fighter } from './fighters';
import { disposeObject, luminous, mesh, screenToWorld, worldToScreen } from './geometry';
import { cue } from './audio';
import { createSpell, animateSpell, impact, type SpellVisual } from './powers';

const FLOOR = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const clamp = THREE.MathUtils.clamp;
type Effect = { object: THREE.Object3D; born: number; duration: number; velocity: THREE.Vector3 };

/** Presentation only: movement, hits, timing and health remain server authoritative. */
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
  private attacks = new Map<number, SpellVisual>();
  private environment!: THREE.WebGLRenderTarget;
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
  private shadersReady = false;
  private restoreListener = () => {
    this.shadersReady = false;
    this.rebuildEnvironment();
    this.prepareShaders();
  };
  private lossListener = (event: Event) => {
    event.preventDefault();
    delete this.renderer.domElement.dataset.ready;
    this.onError('The 3D view was interrupted. Waiting for your graphics to recover…');
  };

  constructor(
    private mount: HTMLDivElement,
    initial: BattleState,
    private onError: (message: string | null) => void,
    private onReady: () => void,
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
    const gl = this.renderer.getContext(),
      info = gl.getExtension('WEBGL_debug_renderer_info');
    this.lowDetail = Boolean(
      info &&
      /SwiftShader|llvmpipe|software|basic render/i.test(
        String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)),
      ),
    );
    this.renderer.shadowMap.enabled = !this.lowDetail;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.rebuildEnvironment();
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
    this.world.add(new THREE.HemisphereLight('#b5d2ef', '#30231e', 1.3));
    const sun = new THREE.DirectionalLight('#fff1d8', 3.2);
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
    const rim = new THREE.DirectionalLight(initial.spec.secondaryColor, 2.4);
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
    this.hero.root.position.set(
      initial.fighters.hero.position.x,
      0,
      initial.fighters.hero.position.z,
    );
    this.boss.root.position.set(
      initial.fighters.boss.position.x,
      0,
      initial.fighters.boss.position.z,
    );
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
    if (this.lowDetail) this.reduceDetail();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(mount);
    this.resize();
    this.prepareShaders();
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
  aimGround(target: Target) {
    const point = screenToWorld(this.camera, target, FLOOR);
    return point ? { x: clamp(point.x, -20, 20), z: clamp(point.z, -20, 20) } : undefined;
  }

  private rebuildEnvironment() {
    this.environment?.dispose();
    const room = new RoomEnvironment(),
      generator = new THREE.PMREMGenerator(this.renderer);
    this.environment = generator.fromScene(room, 0.04);
    this.world.environment = this.environment.texture;
    this.world.environmentIntensity = 0.65;
    room.dispose();
    generator.dispose();
  }
  private prepareShaders() {
    const warmup = new THREE.Group();
    const template: PendingAttack = {
      id: -1,
      role: 'hero',
      action: 'special',
      startedAt: 0,
      resolvesAt: 1100,
      damage: 0,
      radius: 0.2,
      target: { x: 0.5, y: 0.79 },
    };
    const templates = [
      template,
      { ...template, action: 'punch' as const },
      { ...template, action: 'kick' as const },
      ...this.state.spec.bossAttacks.map((attackId, index) => ({
        ...template,
        role: 'boss' as const,
        action: index === 0 ? ('swipe' as const) : ('power' as const),
        attackId,
      })),
    ];
    for (const attack of templates) warmup.add(createSpell(this.state.spec, attack).root);
    this.world.add(warmup);
    this.hero.shield.visible = this.boss.shield.visible = true;
    void this.renderer
      .compileAsync(this.world, this.camera)
      .then(() => {
        if (this.disposed) return;
        warmup.removeFromParent();
        disposeObject(warmup);
        this.hero.shield.visible = this.boss.shield.visible = false;
        this.shadersReady = true;
        this.onError(null);
      })
      .catch(() => {
        if (!this.disposed)
          this.onError('The 3D effects could not finish loading. Reload the raid to retry.');
      });
  }
  private reduceDetail() {
    this.world.traverse((object) => {
      if (object instanceof THREE.Mesh)
        for (const mat of Array.isArray(object.material) ? object.material : [object.material])
          if (mat instanceof THREE.MeshStandardMaterial && mat.bumpMap) {
            mat.bumpMap.dispose();
            mat.bumpMap = null;
            mat.needsUpdate = true;
          }
    });
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
          const shock = impact(e.role === 'hero' ? s.spec.primaryColor : s.spec.secondaryColor);
          shock.position.copy(victim.root.position);
          this.world.add(shock);
          this.effects.push({
            object: shock,
            born: now,
            duration: 700,
            velocity: new THREE.Vector3(),
          });
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
      seconds = now / 1000,
      motion = s.fighters[role].movement;
    const moving = Math.min(1, Math.hypot(motion.x, motion.z)),
      cycle = seconds * (motion.sprint ? 13 : 8);
    const pending = s.pending.find((a) => a.role === role),
      p = pending
        ? clamp((now - pending.startedAt) / (pending.resolvesAt - pending.startedAt), 0, 1)
        : 0;
    const guard = (hero ? s.heroGuardUntil : s.bossGuardUntil) > now,
      dodge = hero && s.dodgeUntil > now;
    const dead = hero ? s.phase === 'DEFEAT' : s.phase === 'VICTORY',
      fall = dead ? clamp((now - s.phaseAt) / 1200, 0, 1) : 0;
    const jumping =
      hero && s.jumpUntil > now
        ? Math.sin(clamp((800 - s.jumpUntil + now) / 800, 0, 1) * Math.PI) * 1.1
        : 0;
    const hit = clamp(1 - (now - this.hitAt[role]) / 280, 0, 1);
    f.body.position.y =
      (this.reduced
        ? 0
        : Math.sin(seconds * 2) * 0.018 + Math.abs(Math.sin(cycle)) * 0.055 * moving) +
      jumping -
      (dodge ? 0.35 : 0) -
      fall * 0.35;
    f.body.rotation.set(
      dodge ? 0.45 : -hit * 0.18,
      pending ? Math.sin(p * Math.PI) * (hero ? -0.45 : 0.35) : 0,
      fall * (hero ? -1.45 : 1.25),
    );
    f.head.rotation.y = Math.sin(seconds * 0.7) * (this.reduced ? 0 : 0.035);
    f.legs.forEach((leg, i) => {
      leg.rotation.x = Math.sin(cycle + i * Math.PI) * 0.5 * moving;
      f.shins[i].rotation.x = Math.max(0, -Math.sin(cycle + i * Math.PI)) * 0.65 * moving;
    });
    f.arms.forEach((arm, i) => {
      arm.rotation.set(
        -0.08 - Math.sin(cycle + i * Math.PI) * 0.27 * moving,
        0,
        (i ? 1 : -1) * 0.08,
      );
      f.forearms[i].rotation.set(-0.18, 0, 0);
      if (guard) {
        arm.rotation.x = -1.0;
        arm.rotation.z = (i ? -1 : 1) * 0.7;
        f.forearms[i].rotation.x = -1.15;
      }
      if (pending) {
        if (hero && pending.action === 'kick') {
          f.legs[1].rotation.x = -Math.sin(p * Math.PI) * 1.5;
          f.shins[1].rotation.x = 0.18;
          arm.rotation.x = -0.45;
        } else if (hero) {
          arm.rotation.x = -Math.sin(p * Math.PI) * (pending.action === 'special' ? 2.3 : 1.65);
          arm.rotation.y = (i ? 1 : -1) * Math.sin(p * Math.PI) * 0.5;
          arm.rotation.z += (i ? 1 : -1) * Math.sin(p * Math.PI) * 0.35;
          f.forearms[i].rotation.x = -0.6 * Math.sin(p * Math.PI);
        } else {
          arm.rotation.x = -Math.sin(p * Math.PI) * 2.0;
          arm.rotation.z += (i ? 1 : -1) * Math.sin(p * Math.PI) * 0.6;
          f.forearms[i].rotation.x = -0.5 * Math.sin(p * Math.PI);
        }
      }
    });
    f.shield.visible = guard;
    f.shield.position.y = f.height * 0.47 + jumping;
    f.shield.rotation.y = seconds * 0.15;
    if (f.shield.material instanceof THREE.ShaderMaterial)
      f.shield.material.uniforms.time.value = seconds;
    f.aura.visible = !dead;
    f.aura.scale.setScalar(hero ? 1 : 1.6);
    if (f.cape && !this.reduced) {
      const points = f.cape.geometry.getAttribute('position');
      for (let i = 0; i < points.count; i++) {
        const y = points.getY(i);
        points.setZ(
          i,
          -0.1 -
            y * y * 0.18 +
            Math.sin(seconds * 4 + points.getX(i) * 4 + y * 3) * y * y * 0.045 -
            moving * y * y * 0.1,
        );
      }
      points.needsUpdate = true;
      f.cape.geometry.computeVertexNormals();
    }
    const other = s.fighters[hero ? 'boss' : 'hero'].position,
      own = s.fighters[role].position;
    const facing = reality && hero ? 0.2 : Math.atan2(other.x - own.x, other.z - own.z);
    const difference = Math.atan2(
      Math.sin(facing - f.root.rotation.y),
      Math.cos(facing - f.root.rotation.y),
    );
    f.root.rotation.y += difference * 0.22;
    f.root.scale.setScalar(hero && reality ? 0.66 : 1);
  }
  private createAttack(a: PendingAttack): SpellVisual {
    const visual = createSpell(this.state.spec, a);
    this.world.add(visual.root);
    return visual;
  }
  private animateAttacks(s: BattleState, now: number, reality: boolean) {
    const active = new Set(s.pending.map((a) => a.id));
    for (const [id, v] of this.attacks)
      if (!active.has(id)) {
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
      const p = clamp((now - a.startedAt) / (a.resolvesAt - a.startedAt), 0, 1),
        caster = a.role === 'hero' ? this.hero : this.boss;
      const from = caster.root.position
        .clone()
        .add(new THREE.Vector3(0, (a.role === 'hero' ? 1.45 : 2.6) * caster.root.scale.y, 0));
      let to: THREE.Vector3;
      if (a.role === 'boss') {
        to = reality
          ? (screenToWorld(
              this.camera,
              a.target,
              new THREE.Plane(new THREE.Vector3(0, 0, 1), -3),
            ) ?? this.hero.root.position.clone())
          : new THREE.Vector3(
              a.worldTarget?.x ?? s.fighters.hero.position.x,
              0.15,
              a.worldTarget?.z ?? s.fighters.hero.position.z,
            );
        (v.ring.material as THREE.MeshBasicMaterial).opacity = 0.3 + p * 0.65;
        if (reality) {
          if (v.ring.parent !== this.overlay) this.overlay.add(v.ring);
          v.ring.rotation.x = 0;
          v.ring.position.set((a.target.x - 0.5) * 1280, (0.5 - a.target.y) * 720, 0);
          v.ring.scale.setScalar(a.radius * 1280);
        } else {
          v.ring.position.copy(to).setY(0.07);
          v.ring.scale.setScalar(a.radius * 9);
        }
      } else {
        to =
          reality && this.liveCamera
            ? (screenToWorld(
                this.camera,
                s.bossTarget,
                new THREE.Plane(new THREE.Vector3(0, 0, 1), -1),
              ) ?? this.boss.root.position.clone())
            : this.boss.root.position.clone().add(new THREE.Vector3(0, 2, 0));
        if (!reality && a.action !== 'special') {
          const reach = MELEE_RANGE[a.action === 'kick' ? 'kick' : 'punch'];
          const distance = from.distanceTo(to);
          if (distance > reach)
            to = from.clone().add(to.clone().sub(from).normalize().multiplyScalar(reach));
        }
        v.ring.position.copy(caster.root.position).setY(caster.root.position.y + 0.05);
        v.ring.scale.setScalar(a.action === 'special' ? 1.2 : 0.55);
      }
      animateSpell(v, p, from, to, now);
      v.charge.position.copy(caster.root.position);
      v.charge.position.y += 0.05;
    }
  }
  private render = (frame: number) => {
    if (
      this.disposed ||
      !this.shadersReady ||
      document.hidden ||
      this.renderer.getContext().isContextLost()
    )
      return;
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
        this.reduceDetail();
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
    if (reality)
      this.hero.root.position.copy(
        screenToWorld(this.camera, pos, new THREE.Plane(new THREE.Vector3(0, 0, 1), -3)) ??
          this.ground(pos.x, pos.y),
      );
    else
      this.hero.root.position.lerp(
        new THREE.Vector3(s.fighters.hero.position.x, 0, s.fighters.hero.position.z),
        1 - Math.exp(-dt * 22),
      );
    this.boss.root.position.lerp(
      new THREE.Vector3(s.fighters.boss.position.x, 0, s.fighters.boss.position.z),
      1 - Math.exp(-dt * 18),
    );
    this.shadow.position.y = this.hero.root.position.y - 0.015;
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
      } else if (effect.object.userData.shock) {
        effect.object.scale.setScalar(1 + age * 4);
        effect.object.children.forEach((child) => {
          ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = Math.max(
            0,
            1 - (age * 1000) / effect.duration,
          );
        });
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
    if (this.renderer.domElement.dataset.ready !== 'true') {
      this.renderer.domElement.dataset.ready = 'true';
      this.onReady();
    }
    this.renderer.domElement.dataset.heroWorld = `${s.fighters.hero.position.x.toFixed(2)},${s.fighters.hero.position.z.toFixed(2)}`;
    this.renderer.domElement.dataset.activeEffect = s.pending
      .map((a) =>
        a.role === 'hero' && a.action === 'special' ? s.spec.heroPower : (a.attackId ?? a.action),
      )
      .join(',');
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
    this.environment.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
