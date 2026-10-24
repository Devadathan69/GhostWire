import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { BattleSpec } from '@ghostwire/shared';
import { createHero, createBoss } from '../game/fighters';
import { createArena } from '../game/arena';
import { disposeObject } from '../game/geometry';
import { createSpell, animateSpell } from '../game/powers';

export function ForgePreview({ spec }: { spec: BattleSpec }) {
  const mount = useRef<HTMLDivElement>(null);
  // Rebuild only the preview after edits; live raids use the saved, validated design.
  useEffect(() => {
    const target = mount.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      target.textContent = '3D preview needs WebGL 2. Your blueprint remains editable.';
      return;
    }
    const world = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    const room = new RoomEnvironment(),
      generator = new THREE.PMREMGenerator(renderer),
      environment = generator.fromScene(room, 0.04);
    world.environment = environment.texture;
    world.environmentIntensity = 0.8;
    room.dispose();
    generator.dispose();
    world.background = new THREE.Color(spec.creation!.environment.skyColor);
    world.add(new THREE.HemisphereLight('#d5e6ff', '#24313b', 2));
    const light = new THREE.DirectionalLight('#fff0d8', 3);
    light.position.set(-4, 8, 8);
    world.add(light);
    const arena = createArena(spec),
      boss = createBoss(spec);
    world.add(arena.root, boss.root);
    boss.root.position.set(0, 0, -1);
    boss.root.scale.setScalar((boss.root.userData.designScale ?? 1) * 1.1);
    const heroes = spec.creation!.heroes.slice(0, 4).map((design, i) => {
      const hero = createHero(spec, design);
      hero.root.position.set(-3 + i * 2, 0, 3);
      hero.root.scale.setScalar(design.appearance.size);
      hero.root.rotation.y = 0.45;
      world.add(hero.root);
      return hero;
    });
    const ability = spec.creation!.heroes[0].abilities.find((a) => a.action === 'special')!;
    const spell = createSpell(
      { ...spec, primaryColor: spec.creation!.heroes[0].appearance.accentColor },
      {
        id: 1,
        role: 'hero',
        action: 'special',
        effect: ability.effect,
        startedAt: 0,
        resolvesAt: 1000,
        damage: ability.damage,
        target: { x: 0.5, y: 0.3 },
        radius: 1,
      },
    );
    world.add(spell.root);
    camera.position.set(10, 8, 16);
    camera.lookAt(0, 1, 0);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    target.replaceChildren(renderer.domElement);
    const observer = new ResizeObserver(() => {
      renderer.setSize(target.clientWidth, target.clientHeight);
      camera.aspect = target.clientWidth / Math.max(1, target.clientHeight);
      camera.updateProjectionMatrix();
    });
    observer.observe(target);
    let previous = 0;
    renderer.setAnimationLoop((time) => {
      if (time - previous < 40 || document.hidden) return;
      previous = time;
      arena.vortex.uniforms.time.value = time / 1000;
      heroes.forEach((h, i) => {
        h.body.position.y = Math.sin(time / 600 + i) * 0.025;
        h.arms[1].rotation.x = -0.2 - Math.sin(time / 800 + i) * 0.15;
      });
      boss.body.position.y = Math.sin(time / 800) * 0.04;
      animateSpell(
        spell,
        (time % 3000) / 3000,
        heroes[0].root.position.clone().add(new THREE.Vector3(0, 1.5, 0)),
        boss.root.position.clone().add(new THREE.Vector3(0, 2, 0)),
        time,
      );
      renderer.render(world, camera);
    });
    return () => {
      observer.disconnect();
      renderer.setAnimationLoop(null);
      disposeObject(world);
      environment.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [spec]);
  return (
    <div
      ref={mount}
      className="forge-preview"
      role="img"
      aria-label="Preview of your custom 3D heroes, boss, environment and ultimate power"
    />
  );
}
