import * as THREE from 'three';
import type { BattleSpec, HeroDesign } from '@ghostwire/shared';
import { batchRigidMeshes, link, luminous, mesh } from './geometry';
import { surface } from './surfaces';

export type Fighter = {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  arms: [THREE.Group, THREE.Group];
  forearms: [THREE.Group, THREE.Group];
  legs: [THREE.Group, THREE.Group];
  shins: [THREE.Group, THREE.Group];
  weapon: THREE.Group;
  shield: THREE.Mesh;
  aura: THREE.Mesh;
  cape: THREE.Mesh | null;
  height: number;
};
const pair = (items: THREE.Group[]) => items as [THREE.Group, THREE.Group];
function capsule(
  parent: THREE.Object3D,
  radius: number,
  length: number,
  mat: THREE.Material,
  position: [number, number, number],
  scale: [number, number, number] = [1, 1, 1],
) {
  return mesh(parent, new THREE.CapsuleGeometry(radius, length, 5, 14), mat, position, scale);
}
function horn(parent: THREE.Group, points: THREE.Vector3[], radius: number, mat: THREE.Material) {
  const curve = new THREE.CatmullRomCurve3(points),
    samples = curve.getPoints(7);
  for (let i = 0; i < 7; i++)
    link(
      parent,
      samples[i],
      samples[i + 1],
      radius * (1 - i / 7),
      mat,
      radius * (1 - (i + 1) / 7) + 0.004,
    );
}
function protection(root: THREE.Group, color: string, height: number) {
  const shield = mesh(
    root,
    new THREE.SphereGeometry(1, 32, 20),
    new THREE.ShaderMaterial({
      uniforms: { tint: { value: new THREE.Color(color) }, time: { value: 0 } },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: `varying vec3 n; varying vec3 v; varying vec3 p; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); n = normalize(normalMatrix * normal); v = normalize(-mv.xyz); p=position; gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform vec3 tint; uniform float time; varying vec3 n; varying vec3 v; varying vec3 p; void main(){ float edge=pow(1.0-abs(dot(normalize(n),normalize(v))),2.4); float ripple=pow(.5+.5*sin(p.y*35.0-time*5.0),12.0); gl_FragColor=vec4(tint*(1.2+edge),edge*.65+ripple*.09+.025); }`,
    }),
    [0, height * 0.47, 0],
    [height * 0.47, height * 0.56, height * 0.47],
  );
  shield.visible = false;
  shield.castShadow = false;
  const aura = mesh(
    root,
    new THREE.TorusGeometry(0.65, 0.012, 5, 64),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4 }),
    [0, 0.035, 0],
  );
  aura.rotation.x = -Math.PI / 2;
  const pixels = new Uint8Array(64 * 64 * 4);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const i = (y * 64 + x) * 4;
      pixels[i + 3] = Math.round(Math.max(0, 1 - Math.hypot(x - 31.5, y - 31.5) / 31.5) ** 2 * 150);
    }
  const texture = new THREE.DataTexture(pixels, 64, 64);
  texture.needsUpdate = true;
  const shadow = mesh(
    root,
    new THREE.PlaneGeometry(height * 1.1, height * 0.8),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }),
    [0, 0.018, 0],
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.castShadow = false;
  return { shield, aura };
}

export function createHero(spec: BattleSpec, design?: HeroDesign): Fighter {
  const look = design?.appearance;
  if (look) spec = { ...spec, primaryColor: look.accentColor };
  const root = new THREE.Group(),
    body = new THREE.Group(),
    head = new THREE.Group();
  root.add(body);
  body.add(head);
  head.position.y = 2.12;
  root.userData.designScale = look?.size ?? 1;
  const armor = surface(
      look?.bodyColor ?? '#4a626b',
      look?.archetype === 'mage' ? 0.15 : 0.82,
      0.32,
      12,
    ),
    edge = surface(look?.trimColor ?? '#a7afb0', 0.9, 0.25, 44),
    leather = surface('#171b20', 0.05, 0.82, 21),
    cloth = surface(look?.trimColor ?? '#263e44', 0, 0.95, 51),
    glow = luminous(spec.primaryColor, 0.75);
  mesh(body, new THREE.SphereGeometry(1, 24, 16), armor, [0, 1.58, 0], [0.39, 0.49, 0.25]);
  for (let i = 0; i < 3; i++)
    mesh(
      body,
      new THREE.TorusGeometry(0.23 - i * 0.012, 0.055, 6, 20, Math.PI),
      edge,
      [0, 1.39 - i * 0.13, 0.15],
      [1, 0.55, 0.6],
    ).rotation.x = 0.18;
  capsule(body, 0.23, 0.12, leather, [0, 1.13, 0], [1.15, 1, 0.8]);
  mesh(
    body,
    new THREE.TorusGeometry(0.28, 0.045, 6, 24),
    edge,
    [0, 1.15, 0],
    [1, 0.8, 1],
  ).rotation.x = Math.PI / 2;
  mesh(body, new THREE.OctahedronGeometry(0.1, 1), glow, [0, 1.75, 0.245], [0.65, 1.4, 0.4]);
  mesh(head, new THREE.SphereGeometry(0.25, 28, 20), armor, [0, 0, 0], [1, 1.16, 0.92]);
  mesh(
    head,
    new THREE.SphereGeometry(0.21, 24, 12, 0, Math.PI),
    leather,
    [0, 0.015, 0.035],
    [1, 0.48, 1],
  );
  mesh(head, new THREE.BoxGeometry(0.37, 0.026, 0.045), glow, [0, 0.033, 0.224]);
  capsule(head, 0.045, 0.24, edge, [0, -0.06, 0.21], [1, 1, 0.7]);
  mesh(head, new THREE.CylinderGeometry(0.085, 0.1, 0.15, 12), leather, [0, -0.3, 0]);
  horn(
    head,
    [
      new THREE.Vector3(0, 0.19, -0.1),
      new THREE.Vector3(0, 0.43, -0.15),
      new THREE.Vector3(0, 0.42, -0.35),
    ],
    0.085,
    edge,
  );
  const forearms: THREE.Group[] = [],
    shins: THREE.Group[] = [];
  const arms = pair(
    [-1, 1].map((side) => {
      const arm = new THREE.Group();
      arm.position.set(side * 0.46, 1.86, 0);
      body.add(arm);
      mesh(
        arm,
        new THREE.SphereGeometry(0.25, 20, 12),
        armor,
        [side * 0.025, -0.055, 0],
        [1.15, 0.75, 1.1],
      );
      mesh(
        arm,
        new THREE.TorusGeometry(0.2, 0.025, 5, 24),
        edge,
        [side * 0.02, -0.13, 0.02],
        [1, 0.8, 1],
      ).rotation.x = Math.PI / 2;
      capsule(arm, 0.105, 0.24, leather, [0, -0.31, 0]);
      const forearm = new THREE.Group();
      forearm.position.y = -0.51;
      arm.add(forearm);
      forearms.push(forearm);
      capsule(forearm, 0.135, 0.22, armor, [0, -0.18, 0.01], [1, 1, 0.85]);
      mesh(forearm, new THREE.BoxGeometry(0.035, 0.22, 0.025), glow, [0, -0.19, 0.13]);
      capsule(forearm, 0.105, 0.07, leather, [0, -0.43, 0.045]);
      return arm;
    }),
  );
  const legs = pair(
    [-1, 1].map((side) => {
      const leg = new THREE.Group();
      leg.position.set(side * 0.19, 1.04, 0);
      body.add(leg);
      capsule(leg, 0.14, 0.27, armor, [0, -0.24, 0], [1, 1, 0.9]);
      const shin = new THREE.Group();
      shin.position.y = -0.49;
      leg.add(shin);
      shins.push(shin);
      mesh(shin, new THREE.SphereGeometry(0.155, 16, 12), edge, [0, 0, 0.075], [1, 0.85, 0.65]);
      capsule(shin, 0.13, 0.28, armor, [0, -0.23, 0], [1, 1, 0.85]);
      mesh(
        shin,
        new THREE.SphereGeometry(0.17, 16, 12),
        leather,
        [0, -0.46, 0.095],
        [1, 0.6, 1.55],
      );
      mesh(shin, new THREE.SphereGeometry(0.15, 16, 10), edge, [0, -0.46, 0.23], [1, 0.45, 0.7]);
      return leg;
    }),
  );
  const weapon = new THREE.Group();
  forearms[1].add(weapon);
  weapon.position.set(0, -0.44, 0.09);
  weapon.rotation.x = -0.15;
  if (!look || look.weapon === 'blade') {
    capsule(weapon, 0.035, 0.22, leather, [0, 0.05, 0]);
    mesh(weapon, new THREE.BoxGeometry(0.43, 0.055, 0.1), edge, [0, 0.23, 0]);
    const blade = new THREE.Shape();
    blade.moveTo(-0.085, 0.27);
    blade.lineTo(0.085, 0.27);
    blade.lineTo(0.065, 1.23);
    blade.lineTo(0, 1.48);
    blade.lineTo(-0.065, 1.23);
    blade.closePath();
    mesh(
      weapon,
      new THREE.ExtrudeGeometry(blade, {
        depth: 0.035,
        bevelEnabled: true,
        bevelThickness: 0.012,
        bevelSize: 0.01,
        bevelSegments: 1,
        steps: 1,
      }),
      edge,
      [0, 0, -0.015],
    );
    mesh(weapon, new THREE.BoxGeometry(0.016, 0.9, 0.045), glow, [0, 0.76, 0.012]);
  }
  const capeGeo = new THREE.PlaneGeometry(0.95, 1.25, 8, 10);
  capeGeo.translate(0, -0.625, 0);
  const positions = capeGeo.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    positions.setZ(i, -0.1 - y * y * 0.18);
    if (y < -1.2) positions.setY(i, y + Math.sin(i * 3.7) * 0.07);
  }
  capeGeo.computeVertexNormals();
  cloth.side = THREE.DoubleSide;
  const cape = mesh(body, capeGeo, cloth, [0, 1.88, -0.19]);
  cape.visible = look?.cape ?? true;
  if (look && look.weapon !== 'blade') {
    if (look.weapon === 'staff') {
      capsule(weapon, 0.045, 1.8, edge, [0, 0.4, 0]);
      mesh(weapon, new THREE.IcosahedronGeometry(0.17, 1), glow, [0, 1.4, 0]);
    } else if (look.weapon === 'hammer') {
      capsule(weapon, 0.05, 0.7, leather, [0, 0.35, 0]);
      mesh(weapon, new THREE.BoxGeometry(0.65, 0.4, 0.36), edge, [0, 0.85, 0]);
      mesh(weapon, new THREE.BoxGeometry(0.68, 0.06, 0.38), glow, [0, 0.85, 0]);
    } else mesh(weapon, new THREE.SphereGeometry(0.17, 12, 8), glow, [0, 0, 0]);
  }
  if (look?.head === 'hood')
    mesh(head, new THREE.ConeGeometry(0.36, 0.5, 12), cloth, [0, 0.22, -0.06]);
  if (look?.head === 'hair')
    for (let i = 0; i < 7; i++)
      mesh(head, new THREE.ConeGeometry(0.07, 0.25, 5), edge, [(i - 3) * 0.07, 0.24, -0.04]);
  if (look?.head === 'mask')
    mesh(head, new THREE.BoxGeometry(0.32, 0.25, 0.1), edge, [0, -0.05, 0.22]);
  if (look?.archetype === 'tech') {
    mesh(body, new THREE.TorusGeometry(0.16, 0.03, 6, 20), glow, [0, 1.65, 0.26]);
    for (const side of [-1, 1])
      mesh(body, new THREE.BoxGeometry(0.2, 0.5, 0.24), armor, [side * 0.36, 1.45, -0.2]);
  }
  if (look?.archetype === 'beast' || look?.archetype === 'colossus') body.scale.set(1.2, 1.08, 1.2);
  if (look?.archetype === 'specter') {
    mesh(head, new THREE.TorusGeometry(0.35, 0.025, 5, 24), glow, [0, 0.4, 0]).rotation.x =
      Math.PI / 2;
  }
  [head, weapon, ...arms, ...legs, ...forearms, ...shins].forEach((part) => batchRigidMeshes(part));
  batchRigidMeshes(body, [cape]);
  return {
    root,
    body,
    head,
    arms,
    forearms: pair(forearms),
    legs,
    shins: pair(shins),
    weapon,
    cape,
    height: 2.6,
    ...protection(root, spec.primaryColor, 2.5),
  };
}

export function createBoss(spec: BattleSpec): Fighter {
  const look = spec.creation?.boss.appearance;
  if (look && ['tech', 'knight', 'mage', 'specter'].includes(look.archetype)) {
    const fighter = createHero(spec, {
      name: spec.bossName,
      description: spec.creation!.boss.description,
      appearance: look,
      abilities: [],
    });
    fighter.root.userData.designScale = look.size * 1.65;
    return fighter;
  }
  if (look) spec = { ...spec, secondaryColor: look.accentColor };
  const root = new THREE.Group(),
    body = new THREE.Group(),
    head = new THREE.Group();
  root.add(body);
  body.add(head);
  head.position.set(0, 3.15, 0.08);
  root.userData.designScale = look?.size ?? 1;
  const skin = surface(
      look?.bodyColor ?? (spec.arena === 'shadow_forest' ? '#34303d' : '#3d3a37'),
      0.12,
      0.92,
      34,
    ),
    plates = surface(look?.trimColor ?? '#646261', 0.5, 0.62, 71),
    bone = surface('#b2a58b', 0.12, 0.65, 62),
    dark = surface('#100e11', 0, 0.9, 6),
    glow = luminous(spec.secondaryColor, 1.8);
  mesh(body, new THREE.SphereGeometry(1, 28, 20), skin, [0, 2.18, 0], [0.93, 0.9, 0.53]);
  for (const side of [-1, 1]) {
    mesh(
      body,
      new THREE.SphereGeometry(0.48, 20, 14),
      skin,
      [side * 0.4, 2.43, 0.32],
      [1.1, 0.8, 0.7],
    );
    for (let i = 0; i < 3; i++)
      capsule(body, 0.14, 0.12, skin, [side * 0.23, 1.92 - i * 0.21, 0.4], [1.3, 0.8, 0.75]);
    horn(
      body,
      [
        new THREE.Vector3(side * 0.8, 2.7, -0.2),
        new THREE.Vector3(side * 1.18, 3.0, -0.4),
        new THREE.Vector3(side * 1.43, 3.18, -0.42),
      ],
      0.19,
      bone,
    );
    const fissure = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.62, 2.58, 0.62),
      new THREE.Vector3(side * 0.34, 2.3, 0.64),
      new THREE.Vector3(side * 0.46, 2.07, 0.55),
      new THREE.Vector3(side * 0.21, 1.88, 0.49),
    ]);
    mesh(body, new THREE.TubeGeometry(fissure, 12, 0.018, 5, false), glow);
  }
  capsule(body, 0.39, 0.17, plates, [0, 1.25, 0], [1.5, 1, 1]);
  mesh(head, new THREE.SphereGeometry(0.42, 28, 20), skin, [0, 0.02, 0], [1.04, 1, 0.9]);
  mesh(head, new THREE.SphereGeometry(0.29, 20, 16), dark, [0, -0.22, 0.2], [1.15, 0.55, 0.7]);
  for (const side of [-1, 1]) {
    mesh(
      head,
      new THREE.SphereGeometry(0.11, 16, 10),
      glow,
      [side * 0.19, 0.035, 0.335],
      [1.3, 0.28, 0.4],
    );
    capsule(head, 0.08, 0.23, plates, [side * 0.2, 0.13, 0.3], [1, 0.65, 0.7]).rotation.z =
      side * 0.9;
    horn(
      head,
      [
        new THREE.Vector3(side * 0.31, 0.25, -0.1),
        new THREE.Vector3(side * 0.64, 0.55, -0.15),
        new THREE.Vector3(side * 0.65, 0.85, 0.02),
        new THREE.Vector3(side * 0.43, 1, 0.15),
      ],
      0.17,
      bone,
    );
    for (let j = 0; j < 3; j++)
      mesh(head, new THREE.ConeGeometry(0.04, j === 0 ? 0.19 : 0.12, 8), bone, [
        side * (0.09 + j * 0.07),
        -0.22,
        0.39,
      ]).rotation.z = Math.PI;
  }
  const forearms: THREE.Group[] = [],
    shins: THREE.Group[] = [];
  const arms = pair(
    [-1, 1].map((side) => {
      const arm = new THREE.Group();
      arm.position.set(side * 0.96, 2.75, 0);
      body.add(arm);
      mesh(
        arm,
        new THREE.SphereGeometry(0.41, 22, 16),
        skin,
        [side * 0.05, -0.08, 0],
        [1.13, 1, 1],
      );
      capsule(arm, 0.24, 0.35, skin, [side * 0.07, -0.48, 0]);
      const forearm = new THREE.Group();
      forearm.position.set(side * 0.1, -0.83, 0);
      arm.add(forearm);
      forearms.push(forearm);
      capsule(forearm, 0.3, 0.33, plates, [0, -0.25, 0.08], [1, 1, 1.1]);
      mesh(forearm, new THREE.SphereGeometry(0.29, 20, 14), skin, [0, -0.59, 0.13], [1.1, 0.7, 1]);
      for (let j = 0; j < 3; j++) {
        const x = (j - 1) * 0.19;
        horn(
          forearm,
          [
            new THREE.Vector3(x, -0.62, 0.28),
            new THREE.Vector3(x, -0.86, 0.4),
            new THREE.Vector3(x, -0.94, 0.66),
          ],
          0.075,
          bone,
        );
      }
      return arm;
    }),
  );
  const legs = pair(
    [-1, 1].map((side) => {
      const leg = new THREE.Group();
      leg.position.set(side * 0.43, 1.26, 0);
      body.add(leg);
      capsule(leg, 0.27, 0.3, skin, [0, -0.28, 0]);
      const shin = new THREE.Group();
      shin.position.y = -0.58;
      leg.add(shin);
      shins.push(shin);
      mesh(shin, new THREE.SphereGeometry(0.28, 18, 12), plates, [0, 0, 0.13], [1, 0.9, 0.6]);
      capsule(shin, 0.23, 0.31, skin, [0, -0.29, 0]);
      mesh(shin, new THREE.SphereGeometry(0.33, 20, 12), plates, [0, -0.56, 0.18], [1, 0.48, 1.6]);
      return leg;
    }),
  );
  const weapon = new THREE.Group();
  body.add(weapon);
  if (look && look.weapon !== 'fists') {
    forearms[1].add(weapon);
    weapon.position.set(0, -0.6, 0.2);
    capsule(weapon, 0.07, 1.2, plates, [0, 0.3, 0]);
    if (look.weapon === 'hammer')
      mesh(weapon, new THREE.BoxGeometry(1.2, 0.7, 0.6), plates, [0, 1.15, 0]);
    else if (look.weapon === 'staff')
      mesh(weapon, new THREE.IcosahedronGeometry(0.3, 1), glow, [0, 1.2, 0]);
    else {
      mesh(weapon, new THREE.BoxGeometry(0.24, 1.5, 0.12), plates, [0, 1.1, 0]);
      mesh(weapon, new THREE.BoxGeometry(0.05, 1.5, 0.14), glow, [0, 1.1, 0]);
    }
  }
  if (look?.head === 'hood')
    mesh(head, new THREE.ConeGeometry(0.65, 0.9, 12), plates, [0, 0.4, -0.08]);
  if (look?.head === 'helmet')
    mesh(head, new THREE.BoxGeometry(0.8, 0.25, 0.6), plates, [0, 0.34, 0]);
  if (look?.head === 'mask')
    mesh(head, new THREE.BoxGeometry(0.62, 0.36, 0.16), plates, [0, -0.08, 0.4]);
  if (look?.head === 'hair')
    for (let i = 0; i < 5; i++)
      mesh(head, new THREE.ConeGeometry(0.12, 0.45, 6), plates, [(i - 2) * 0.15, 0.4, -0.08]);
  const cape = look?.cape
    ? mesh(
        body,
        new THREE.PlaneGeometry(1.8, 2.2, 8, 10),
        surface(look.trimColor, 0, 0.95, 51),
        [0, 2.1, -0.58],
      )
    : null;
  if (cape) {
    cape.geometry.translate(0, -0.6, 0);
    (cape.material as THREE.Material).side = THREE.DoubleSide;
  }
  if (look?.archetype === 'beast') body.scale.set(1.15, 1, 1.1);
  for (let i = 0; i < 5; i++)
    mesh(body, new THREE.ConeGeometry(0.15, 0.65, 12), spec.arena === 'storm' ? glow : plates, [
      (i - 2) * 0.25,
      2.85,
      -0.5,
    ]).rotation.x = -0.5;
  [head, weapon, ...arms, ...forearms, ...legs, ...shins].forEach((part) => batchRigidMeshes(part));
  batchRigidMeshes(body, cape ? [cape] : []);
  return {
    root,
    body,
    head,
    arms,
    forearms: pair(forearms),
    legs,
    shins: pair(shins),
    weapon,
    cape,
    height: 4.3,
    ...protection(root, spec.secondaryColor, 4.15),
  };
}
