import * as THREE from 'three';
import type { BattleSpec, PendingAttack } from '@ghostwire/shared';
import { batchRigidMeshes, link, luminous, mesh } from './geometry';

export type SpellVisual = {
  root: THREE.Group;
  ring: THREE.Mesh;
  orb: THREE.Group;
  trail: THREE.Group;
  charge: THREE.Group;
  kind: string;
};
function bolt(parent: THREE.Group, color: string, offset = 0) {
  const mat = luminous(color, 3);
  let before = new THREE.Vector3(offset, 5.5, 0);
  for (let i = 1; i <= 11; i++) {
    const next = new THREE.Vector3(
      offset + Math.sin(i * 13.7) * 0.24,
      5.5 - i * 0.5,
      Math.cos(i * 7.3) * 0.13,
    );
    link(parent, before, next, 0.025, mat);
    before = next;
  }
  batchRigidMeshes(parent);
}
export function createSpell(spec: BattleSpec, a: PendingAttack): SpellVisual {
  const root = new THREE.Group(),
    orb = new THREE.Group(),
    trail = new THREE.Group(),
    charge = new THREE.Group();
  root.add(orb, trail, charge);
  const color = a.role === 'hero' ? spec.primaryColor : spec.secondaryColor;
  const kind =
    a.role === 'hero'
      ? a.regionId && a.targetRegionId && a.regionId !== a.targetRegionId && a.action === 'punch'
        ? 'fire_orb'
        : a.action === 'special'
          ? (a.effect ?? spec.heroPower)
          : a.action === 'kick'
            ? 'kick'
            : 'blade'
      : a.attackId!;
  const mat = luminous(color, 2);
  const ring = mesh(
    root,
    new THREE.TorusGeometry(1, 0.018, 6, 80),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  for (let i = 0; i < 2; i++) {
    const circle = mesh(charge, new THREE.TorusGeometry(0.6 + i * 0.25, 0.018, 6, 64), mat);
    circle.rotation.x = Math.PI / 2;
    circle.position.y = 0.03 + i * 0.05;
  }
  if (kind === 'thunder_strike' || kind === 'lightning_burst') {
    bolt(orb, color);
    if (kind === 'lightning_burst') {
      const left = new THREE.Group(),
        right = new THREE.Group();
      orb.add(left, right);
      bolt(left, color, -0.7);
      bolt(right, color, 0.7);
    }
    const flash = mesh(orb, new THREE.SphereGeometry(0.3, 16, 12), mat, [0, 0.2, 0], [1, 0.4, 1]);
    flash.castShadow = false;
  } else if (kind === 'fire_orb') {
    const shader = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: `varying vec3 p; varying vec3 n; void main(){p=position;n=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `uniform float time;varying vec3 p;varying vec3 n;void main(){float f=sin(p.x*17.0+time*7.0)*sin(p.y*14.0-time*5.0)*sin(p.z*15.0);vec3 c=mix(vec3(.65,.045,.004),vec3(1.0,.85,.2),smoothstep(-.5,.65,f));gl_FragColor=vec4(c*2.0,1.0);}`,
    });
    mesh(orb, new THREE.SphereGeometry(0.3, 24, 20), shader);
    for (let i = 0; i < 16; i++)
      mesh(trail, new THREE.SphereGeometry(0.035, 6, 4), mat, [
        Math.sin(i * 2.4) * 0.4,
        Math.cos(i * 2.4) * 0.4,
        -i * 0.08,
      ]);
    batchRigidMeshes(trail);
  } else if (kind === 'moon_shield') {
    mesh(orb, new THREE.IcosahedronGeometry(0.23, 2), mat);
    for (let i = 0; i < 3; i++) {
      const halo = mesh(orb, new THREE.TorusGeometry(0.4 + i * 0.1, 0.018, 6, 48), mat);
      halo.rotation.set(i * 1.1, i * 0.9, 0);
    }
  } else if (kind === 'shadow_wave') {
    for (let i = 0; i < 3; i++) {
      const wave = mesh(
        orb,
        new THREE.TorusGeometry(0.7 + i * 0.18, 0.1, 12, 64),
        new THREE.MeshBasicMaterial({
          color: i % 2 ? color : '#171225',
          transparent: true,
          opacity: 0.6,
          depthWrite: false,
        }),
      );
      wave.rotation.x = Math.PI / 2;
      wave.position.y = i * 0.1;
    }
    mesh(
      orb,
      new THREE.SphereGeometry(0.8, 20, 12),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, depthWrite: false }),
      [0, 0.4, 0],
      [1, 0.55, 1],
    );
  } else {
    const count = kind === 'claw_sweep' ? 3 : kind === 'flame_slash' ? 3 : 1;
    for (let i = 0; i < count; i++) {
      const slash = mesh(
        orb,
        new THREE.RingGeometry(
          0.55 + i * 0.07,
          0.75 + i * 0.07,
          40,
          1,
          -Math.PI * 0.25,
          Math.PI * 1.15,
        ),
        new THREE.MeshBasicMaterial({
          color: kind === 'flame_slash' ? (i === 0 ? '#ffe1a0' : '#ff6c25') : color,
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      slash.position.set((i - 1) * 0.2, 0.5, (i - 1) * 0.1);
      slash.rotation.z = -0.7 + i * 0.18;
    }
  }
  return { root, ring, orb, trail, charge, kind };
}
export function animateSpell(
  v: SpellVisual,
  p: number,
  from: THREE.Vector3,
  to: THREE.Vector3,
  time: number,
) {
  v.charge.position.copy(from).setY(0.06);
  v.charge.rotation.y = time / 250;
  v.charge.scale.setScalar(0.7 + Math.sin(p * Math.PI) * 0.6);
  v.charge.visible = v.kind !== 'blade' && v.kind !== 'kick';
  v.orb.position.copy(from).lerp(to, p);
  if (v.kind === 'thunder_strike' || v.kind === 'lightning_burst') {
    v.orb.position.copy(to);
    v.orb.visible = p > 0.35;
    v.orb.scale.setScalar(1);
    v.orb.scale.x = 0.6 + Math.abs(Math.sin(p * 40)) * 0.45;
  } else if (v.kind === 'fire_orb') {
    v.orb.position.y += Math.sin(p * Math.PI) * 2;
    v.orb.scale.setScalar(0.5 + p * 1.1);
    v.orb.rotation.y = time / 250;
    const core = v.orb.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
    core.material.uniforms.time.value = time / 1000;
  } else if (v.kind === 'shadow_wave') {
    v.orb.position.y = 0.3;
    v.orb.scale.setScalar(0.5 + p * 1.5);
    v.orb.rotation.y = p * 4;
  } else if (v.kind === 'moon_shield') {
    v.orb.rotation.set(time / 200, time / 300, 0);
    v.orb.position.y += Math.sin(p * Math.PI) * 0.8;
  } else {
    v.orb.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
    v.orb.rotation.z = -0.3 + Math.sin(p * Math.PI) * 0.6;
    v.orb.scale.setScalar(v.kind === 'flame_slash' ? 1 + p : 1);
  }
  v.trail.position.copy(v.orb.position);
  v.trail.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
  v.trail.scale.setScalar(1 - p * 0.5);
}
export function impact(color: string) {
  const root = new THREE.Group();
  root.userData.shock = true;
  for (let i = 0; i < 2; i++) {
    const ring = mesh(
      root,
      new THREE.TorusGeometry(0.5, 0.025, 6, 64),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05 + i * 0.08;
  }
  return root;
}
