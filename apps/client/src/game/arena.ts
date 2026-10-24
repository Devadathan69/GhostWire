import * as THREE from 'three';
import type { BattleSpec } from '@ghostwire/shared';
import { batchRigidMeshes, link, luminous, material, mesh } from './geometry';

export function createArena(spec: BattleSpec) {
  const root = new THREE.Group(),
    portal = new THREE.Group(),
    debris = new THREE.Group();
  const stone = material('#26333e', 0.3, 0.9),
    trim = material('#46535d', 0.65, 0.55);
  const glow = luminous(spec.secondaryColor, 1.6),
    pale = luminous(spec.primaryColor, 1.4);
  const floor = mesh(root, new THREE.CylinderGeometry(7.7, 7.2, 0.65, 64), stone, [0, -0.4, 0]);
  floor.receiveShadow = true;
  const edge = mesh(root, new THREE.TorusGeometry(7.55, 0.1, 6, 96), trim, [0, -0.03, 0]);
  edge.rotation.x = Math.PI / 2;
  for (const radius of [7.4, 6.7]) {
    const ring = mesh(root, new THREE.TorusGeometry(radius, 0.023, 5, 96), glow, [0, -0.015, 0]);
    ring.rotation.x = Math.PI / 2;
  }
  // One instanced draw for the entire hexagonal paving, with real bevel-like gaps.
  const tilePoints: THREE.Vector3[] = [];
  for (let z = -8; z <= 8; z++)
    for (let x = -8; x <= 8; x++) {
      const p = new THREE.Vector3(x * 0.98 + (z % 2) * 0.49, -0.035, z * 0.85);
      if (p.length() < 7.1) tilePoints.push(p);
    }
  const tiles = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.55, 0.55, 0.07, 6),
    stone,
    tilePoints.length,
  );
  const dummy = new THREE.Object3D();
  tilePoints.forEach((p, i) => {
    dummy.position.copy(p);
    dummy.updateMatrix();
    tiles.setMatrixAt(i, dummy.matrix);
    tiles.setColorAt(
      i,
      new THREE.Color().setHSL(0.59, 0.12, 0.33 + (Math.sin(i * 19.1) + 1) * 0.055),
    );
  });
  tiles.receiveShadow = true;
  root.add(tiles);
  const abyss = mesh(
    root,
    new THREE.PlaneGeometry(240, 240),
    material(spec.arena === 'volcano' ? '#291820' : '#101b2b', 0.25, 0.8),
    [0, -2, 0],
  );
  abyss.rotation.x = -Math.PI / 2;
  for (let i = 0; i < 32; i++) {
    const angle = (i * Math.PI * 2) / 32;
    const rune = mesh(root, new THREE.BoxGeometry(0.06, 0.025, i % 4 === 0 ? 0.5 : 0.18), pale, [
      Math.sin(angle) * 7.05,
      0.03,
      Math.cos(angle) * 7.05,
    ]);
    rune.rotation.y = angle;
  }
  portal.position.set(-0.7, 3.05, -6.5);
  root.add(portal);
  const arch = mesh(portal, new THREE.TorusGeometry(2.8, 0.26, 5, 32), trim);
  arch.rotation.z = Math.PI / 32;
  for (const radius of [2.51, 2.65])
    mesh(portal, new THREE.TorusGeometry(radius, 0.025, 5, 96), glow);
  const vortex = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, tint: { value: new THREE.Color(spec.secondaryColor) } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform float time; uniform vec3 tint;
      void main() { vec2 p = (vUv - 0.5) * 2.0; float r = length(p); float a = atan(p.y, p.x);
        float spiral = pow(0.5 + 0.5 * sin(a * 5.0 + r * 21.0 - time * 1.2), 5.0);
        float edge = pow(r, 3.0) * (0.6 + spiral * 0.4);
        float haze = spiral * smoothstep(0.04, 0.5, r) * 0.22;
        gl_FragColor = vec4(tint * (edge + haze) * 1.5, (edge + haze) * (1.0 - smoothstep(0.91, 1.0, r))); }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const veil = mesh(portal, new THREE.CircleGeometry(2.5, 64), vortex);
  veil.castShadow = false;
  veil.position.z = -0.05;
  const inner = new THREE.Group();
  portal.add(inner);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const block = mesh(inner, new THREE.BoxGeometry(0.14, 0.36, 0.19), pale, [
      Math.sin(a) * 2.37,
      Math.cos(a) * 2.37,
      0,
    ]);
    block.rotation.z = -a;
  }
  // Silhouettes at several depths establish scale and parallax without remote assets.
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  for (let i = 0; i < 22; i++) {
    const a = i * 2.39996,
      radius = 10 + (i % 5) * 2.2;
    const x = Math.cos(a) * radius,
      z = Math.sin(a) * radius - 4;
    if (z > 2 && Math.abs(x) < 9) continue;
    const height = 2.3 + ((i * 7) % 6);
    const rock = mesh(
      root,
      rockGeo,
      stone,
      [x, height * 0.28 - 1.5, z],
      [1.3 + (i % 3), height, 1.4],
    );
    rock.rotation.set(i * 0.1, a, i % 2 ? 0.13 : -0.12);
    if (spec.arena === 'volcano') {
      link(
        root,
        new THREE.Vector3(x, -1.4, z + 0.6),
        new THREE.Vector3(x + 0.5, height * 0.9, z),
        0.025,
        glow,
        0.05,
      );
    }
    if (spec.arena === 'shadow_forest') {
      const trunk = new THREE.Group();
      trunk.position.set(x, -0.5, z);
      root.add(trunk);
      link(trunk, new THREE.Vector3(), new THREE.Vector3(0.3, height, 0), 0.3, stone, 0.06);
      for (let j = 1; j <= 3; j++) {
        const side = j % 2 ? 1 : -1;
        link(
          trunk,
          new THREE.Vector3(j * 0.04, height * 0.28 * j, 0),
          new THREE.Vector3(side * 1.6, height * (0.3 * j + 0.18), 0.3),
          0.15,
          stone,
          0.01,
        );
      }
      rock.scale.y *= 0.3;
    }
  }
  root.add(debris);
  for (let i = 0; i < 13; i++) {
    const a = i * 2.4;
    const shard = mesh(
      debris,
      new THREE.OctahedronGeometry(0.22 + (i % 3) * 0.14),
      trim,
      [Math.sin(a) * (8.5 + (i % 3)), 0.7 + (i % 5), Math.cos(a) * 7 - 5],
      [1, 1.5, 1],
    );
    shard.userData.baseY = shard.position.y;
  }
  const starPositions = new Float32Array(180 * 3);
  for (let i = 0; i < 180; i++) {
    starPositions[i * 3] = Math.sin(i * 127.1) * 24;
    starPositions[i * 3 + 1] = 0.4 + ((i * 17) % 97) / 8;
    starPositions[i * 3 + 2] = Math.cos(i * 311.7) * 15 - 10;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({
      color: spec.secondaryColor,
      size: 0.045,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    }),
  );
  root.add(stars);
  batchRigidMeshes(root);
  batchRigidMeshes(portal, [veil]);
  batchRigidMeshes(inner);
  return { root, portal, inner, debris, stars, vortex };
}
