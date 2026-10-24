import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { heroPosition, PRESETS } from '@ghostwire/shared';
import { screenToWorld, worldToScreen } from '../apps/client/src/game/geometry';
import { createHero, createBoss } from '../apps/client/src/game/fighters';
import { createArena } from '../apps/client/src/game/arena';
import { disposeObject } from '../apps/client/src/game/geometry';

it.each(Object.entries(PRESETS))(
  'assembles and disposes %s meshes without geometry batching errors',
  (_name, spec) => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const root = new THREE.Group();
    try {
      root.add(createHero(spec).root, createBoss(spec).root, createArena(spec).root);
      expect(errors).not.toHaveBeenCalled();
    } finally {
      disposeObject(root);
      errors.mockRestore();
    }
  },
);

describe('3D combat targeting', () => {
  it.each(['ARENA', 'REALITY'] as const)(
    'preserves all authoritative %s lanes at both camera angles and viewport sizes',
    (phase) => {
      const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      for (const aspect of [16 / 9, 390 / 219])
        for (const view of [
          [0, 6.6, 14.8],
          [3.5, 10, 16],
        ]) {
          const camera = new THREE.PerspectiveCamera(43, aspect, 0.1, 130);
          camera.position.set(view[0], view[1], view[2]);
          camera.lookAt(0, 1.4, 0);
          camera.updateMatrixWorld();
          for (let heroLane = 0; heroLane < 3; heroLane++) {
            const target = heroPosition({ phase, resumePhase: null, heroLane });
            const point = screenToWorld(camera, target, floor);
            expect(point).not.toBeNull();
            expect(point!.y).toBeCloseTo(0, 8);
            const rendered = worldToScreen(camera, point!);
            expect(rendered.x).toBeCloseTo(target.x, 8);
            expect(rendered.y).toBeCloseTo(target.y, 8);
          }
        }
    },
  );
  it('returns no intersection for a screen ray looking away from the floor', () => {
    const camera = new THREE.PerspectiveCamera(43, 16 / 9, 0.1, 130);
    camera.position.set(0, 2, 0);
    camera.lookAt(0, 5, -5);
    camera.updateMatrixWorld();
    expect(
      screenToWorld(camera, { x: 0.5, y: 0.1 }, new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)),
    ).toBeNull();
  });
});
