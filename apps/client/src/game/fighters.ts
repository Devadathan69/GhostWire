import * as THREE from 'three';
import type { BattleSpec } from '@ghostwire/shared';
import { batchRigidMeshes, link, luminous, material, mesh } from './geometry';

export type Fighter = {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  arms: [THREE.Group, THREE.Group];
  legs: [THREE.Group, THREE.Group];
  weapon: THREE.Group;
  shield: THREE.Mesh;
  aura: THREE.Mesh;
  cape: THREE.Mesh | null;
  height: number;
};

function shield(root: THREE.Group, color: string, height: number) {
  const bubble = mesh(
    root,
    new THREE.SphereGeometry(1, 20, 12),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.17,
      wireframe: true,
      depthWrite: false,
    }),
    [0, height * 0.47, 0],
    [height * 0.56, height * 0.59, height * 0.56],
  );
  bubble.visible = false;
  const aura = mesh(
    root,
    new THREE.TorusGeometry(0.72, 0.025, 6, 40),
    luminous(color),
    [0, 0.04, 0],
  );
  aura.rotation.x = -Math.PI / 2;
  return { shield: bubble, aura };
}

export function createHero(spec: BattleSpec): Fighter {
  const root = new THREE.Group(),
    body = new THREE.Group(),
    head = new THREE.Group();
  root.add(body);
  body.add(head);
  head.position.y = 2.07;
  const armor = material('#273e4c', 0.65, 0.43),
    edge = material('#7f9a9e', 0.7, 0.35);
  const dark = material('#101e2b'),
    glow = luminous(spec.primaryColor),
    cloth = material('#1e4954', 0, 0.95);
  mesh(body, new THREE.CylinderGeometry(0.4, 0.27, 0.77, 6), armor, [0, 1.56, 0], [1.2, 1, 0.72]);
  mesh(body, new THREE.OctahedronGeometry(0.25), edge, [0, 1.69, 0.26], [1.4, 1.15, 0.45]);
  mesh(body, new THREE.OctahedronGeometry(0.12), glow, [0, 1.7, 0.35], [0.65, 1.3, 0.4]);
  mesh(body, new THREE.CylinderGeometry(0.3, 0.34, 0.18, 8), edge, [0, 1.13, 0]);
  for (const side of [-1, 1])
    mesh(body, new THREE.BoxGeometry(0.23, 0.5, 0.16), armor, [
      side * 0.24,
      0.95,
      0.19,
    ]).rotation.z = side * -0.18;
  mesh(head, new THREE.IcosahedronGeometry(0.29, 0), armor, [0, 0.03, 0], [1, 1.13, 0.93]);
  mesh(head, new THREE.BoxGeometry(0.38, 0.055, 0.07), glow, [0, 0.075, 0.255]);
  mesh(head, new THREE.ConeGeometry(0.1, 0.45, 4), edge, [0, 0.41, -0.035], [0.7, 1, 1.9]);
  mesh(head, new THREE.BoxGeometry(0.08, 0.22, 0.08), edge, [0, -0.09, 0.255]);
  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.49, 1.86, 0);
    body.add(arm);
    mesh(arm, new THREE.IcosahedronGeometry(0.29, 0), edge, [0, -0.05, 0], [1.15, 0.8, 1]);
    mesh(arm, new THREE.CylinderGeometry(0.13, 0.14, 0.47, 6), dark, [0, -0.35, 0]);
    mesh(arm, new THREE.CylinderGeometry(0.19, 0.13, 0.36, 6), armor, [0, -0.65, 0.06]);
    mesh(arm, new THREE.BoxGeometry(0.05, 0.24, 0.04), glow, [0, -0.64, 0.22]);
    mesh(arm, new THREE.IcosahedronGeometry(0.15, 0), edge, [0, -0.86, 0.09]);
    return arm;
  }) as [THREE.Group, THREE.Group];
  const legs = [-1, 1].map((side) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.22, 1.09, 0);
    body.add(leg);
    mesh(leg, new THREE.CylinderGeometry(0.16, 0.12, 0.46, 6), dark, [0, -0.25, 0]);
    mesh(leg, new THREE.IcosahedronGeometry(0.17, 0), edge, [0, -0.49, 0.09]);
    mesh(leg, new THREE.CylinderGeometry(0.17, 0.12, 0.43, 6), armor, [0, -0.75, 0]);
    mesh(leg, new THREE.BoxGeometry(0.27, 0.17, 0.42), dark, [0, -1, 0.1]);
    return leg;
  }) as [THREE.Group, THREE.Group];
  const weapon = new THREE.Group();
  arms[1].add(weapon);
  weapon.position.set(0, -0.83, 0.12);
  weapon.rotation.x = -0.4;
  mesh(weapon, new THREE.CylinderGeometry(0.055, 0.055, 0.35, 6), dark, [0, 0.06, 0]);
  mesh(weapon, new THREE.BoxGeometry(0.54, 0.08, 0.12), edge, [0, 0.27, 0]);
  mesh(weapon, new THREE.CylinderGeometry(0.005, 0.14, 1.15, 4), edge, [0, 0.87, 0], [1, 1, 0.3]);
  mesh(weapon, new THREE.BoxGeometry(0.035, 0.95, 0.055), glow, [0, 0.8, 0]);
  // A faceted mantle has actual depth and an animated shoulder pivot.
  const capeGeo = new THREE.BufferGeometry();
  capeGeo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [
        -0.37, 0, 0, 0.37, 0, 0, -0.59, -1.2, -0.3, 0.37, 0, 0, 0.57, -1.14, -0.38, -0.59, -1.2,
        -0.3,
      ],
      3,
    ),
  );
  capeGeo.computeVertexNormals();
  cloth.side = THREE.DoubleSide;
  const cape = mesh(body, capeGeo, cloth, [0, 1.88, -0.22]);
  [head, weapon, ...arms, ...legs].forEach((part) => batchRigidMeshes(part));
  batchRigidMeshes(body, [cape]);
  return {
    root,
    body,
    head,
    arms,
    legs,
    weapon,
    cape,
    height: 2.6,
    ...shield(root, spec.primaryColor, 2.55),
  };
}

export function createBoss(spec: BattleSpec): Fighter {
  const root = new THREE.Group(),
    body = new THREE.Group(),
    head = new THREE.Group();
  root.add(body);
  body.add(head);
  head.position.set(0, 3.05, 0.05);
  const stone = material(spec.arena === 'shadow_forest' ? '#393047' : '#413b3d', 0.28, 0.8);
  const plates = material(spec.arena === 'storm' ? '#4b6372' : '#5a4a4c', 0.45, 0.6);
  const dark = material('#191c27'),
    horn = material('#aaa298', 0.3),
    glow = luminous(spec.secondaryColor, 2.8);
  mesh(body, new THREE.IcosahedronGeometry(0.92, 1), stone, [0, 2.15, 0], [1.23, 1, 0.66]);
  mesh(body, new THREE.IcosahedronGeometry(0.65, 0), dark, [0, 1.26, 0], [1.25, 0.68, 0.83]);
  for (const side of [-1, 1]) {
    mesh(
      body,
      new THREE.IcosahedronGeometry(0.51, 0),
      plates,
      [side * 0.46, 2.35, 0.48],
      [1, 0.75, 0.53],
    );
    for (let i = 0; i < 3; i++) {
      mesh(body, new THREE.BoxGeometry(0.33, 0.055, 0.07), glow, [
        side * (0.24 + i * 0.12),
        2.28 - i * 0.23,
        0.53,
      ]).rotation.z = side * 0.35;
    }
    link(
      body,
      new THREE.Vector3(side * 0.8, 2.7, -0.1),
      new THREE.Vector3(side * 1.45, 3.18, -0.22),
      0.25,
      plates,
      0.01,
    );
  }
  mesh(body, new THREE.OctahedronGeometry(0.28), glow, [0, 2.12, 0.64], [0.75, 1.4, 0.65]);
  mesh(head, new THREE.IcosahedronGeometry(0.48, 0), stone, [0, 0, 0], [1.13, 0.85, 0.94]);
  mesh(head, new THREE.BoxGeometry(0.53, 0.25, 0.4), dark, [0, -0.25, 0.17]);
  for (const side of [-1, 1]) {
    const eye = mesh(head, new THREE.BoxGeometry(0.24, 0.065, 0.07), glow, [
      side * 0.22,
      0.025,
      0.42,
    ]);
    eye.rotation.z = side * 0.14;
    link(
      head,
      new THREE.Vector3(side * 0.36, 0.18, -0.02),
      new THREE.Vector3(side * 0.72, 0.58, -0.08),
      0.2,
      horn,
      0.12,
    );
    link(
      head,
      new THREE.Vector3(side * 0.72, 0.58, -0.08),
      new THREE.Vector3(side * 0.59, 1, 0),
      0.12,
      horn,
      0.005,
    );
    mesh(head, new THREE.ConeGeometry(0.07, 0.2, 5), horn, [side * 0.18, -0.22, 0.4]).rotation.z =
      Math.PI;
  }
  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 1, 2.7, 0);
    body.add(arm);
    mesh(
      arm,
      new THREE.IcosahedronGeometry(0.48, 0),
      plates,
      [side * 0.09, -0.06, 0],
      [1.1, 0.9, 1.1],
    );
    mesh(arm, new THREE.CylinderGeometry(0.27, 0.33, 0.66, 7), stone, [side * 0.1, -0.53, 0]);
    mesh(
      arm,
      new THREE.IcosahedronGeometry(0.41, 0),
      plates,
      [side * 0.14, -1.03, 0.13],
      [1, 1.2, 1],
    );
    for (let i = 0; i < 3; i++) {
      const x = side * 0.14 + (i - 1) * 0.21;
      link(
        arm,
        new THREE.Vector3(x, -1.29, 0.26),
        new THREE.Vector3(x, -1.72, 0.48),
        0.095,
        horn,
        0.005,
      );
      mesh(arm, new THREE.BoxGeometry(0.045, 0.31, 0.045), glow, [x, -1.02, 0.49]);
    }
    return arm;
  }) as [THREE.Group, THREE.Group];
  const legs = [-1, 1].map((side) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.46, 1.23, 0);
    body.add(leg);
    mesh(leg, new THREE.CylinderGeometry(0.3, 0.24, 0.56, 6), stone, [0, -0.27, 0]);
    mesh(leg, new THREE.IcosahedronGeometry(0.31, 0), plates, [0, -0.6, 0.1]);
    mesh(leg, new THREE.CylinderGeometry(0.24, 0.31, 0.47, 6), stone, [0, -0.87, 0]);
    mesh(leg, new THREE.BoxGeometry(0.62, 0.25, 0.8), plates, [0, -1.11, 0.2]);
    return leg;
  }) as [THREE.Group, THREE.Group];
  const weapon = new THREE.Group();
  body.add(weapon);
  if (spec.arena === 'storm') {
    for (let i = 0; i < 5; i++)
      mesh(
        body,
        new THREE.OctahedronGeometry(0.28),
        glow,
        [(i - 2) * 0.32, 2.95 + Math.sin(i) * 0.2, -0.55],
        [0.5, 2.1, 0.6],
      );
  }
  [body, head, ...arms, ...legs].forEach((part) => batchRigidMeshes(part));
  return {
    root,
    body,
    head,
    arms,
    legs,
    weapon,
    cape: null,
    height: 4.1,
    ...shield(root, spec.secondaryColor, 4),
  };
}
