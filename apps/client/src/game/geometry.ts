import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Target } from '@ghostwire/shared';

/** The server's normalized targeting coordinates must survive perspective projection. */
export function screenToWorld(camera: THREE.PerspectiveCamera, target: Target, plane: THREE.Plane) {
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(target.x * 2 - 1, 1 - target.y * 2), camera);
  return ray.ray.intersectPlane(plane, new THREE.Vector3());
}

export function worldToScreen(camera: THREE.PerspectiveCamera, point: THREE.Vector3): Target {
  const projected = point.clone().project(camera);
  return { x: (projected.x + 1) / 2, y: (1 - projected.y) / 2 };
}

export function material(color: THREE.ColorRepresentation, metalness = 0.35, roughness = 0.65) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, flatShading: true });
}

export function luminous(color: THREE.ColorRepresentation, intensity = 2) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.35,
  });
}

export function mesh(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  mat: THREE.Material,
  position: [number, number, number] = [0, 0, 0],
  scale: [number, number, number] = [1, 1, 1],
) {
  const object = new THREE.Mesh(geometry, mat);
  object.position.set(...position);
  object.scale.set(...scale);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

export function link(
  parent: THREE.Object3D,
  from: THREE.Vector3,
  to: THREE.Vector3,
  radius: number,
  mat: THREE.Material,
  tip = radius,
) {
  const direction = to.clone().sub(from);
  const object = mesh(parent, new THREE.CylinderGeometry(tip, radius, direction.length(), 6), mat);
  object.position.copy(from).add(to).multiplyScalar(0.5);
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return object;
}

export function disposeObject(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    const drawable = object as THREE.Mesh;
    if (drawable.geometry) geometries.add(drawable.geometry);
    if (drawable.material) {
      for (const mat of Array.isArray(drawable.material)
        ? drawable.material
        : [drawable.material]) {
        materials.add(mat);
        for (const value of Object.values(mat))
          if (value instanceof THREE.Texture) textures.add(value);
      }
    }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => t.dispose());
}

/** Keep articulated pivots but combine each pivot's rigid armor into a few draw calls. */
export function batchRigidMeshes(parent: THREE.Object3D, exclude: THREE.Object3D[] = []) {
  const byMaterial = new Map<THREE.Material, THREE.Mesh[]>();
  for (const child of parent.children) {
    if (
      !(child instanceof THREE.Mesh) ||
      child instanceof THREE.InstancedMesh ||
      exclude.includes(child) ||
      Array.isArray(child.material)
    )
      continue;
    const list = byMaterial.get(child.material) ?? [];
    list.push(child);
    byMaterial.set(child.material, list);
  }
  for (const [mat, objects] of byMaterial) {
    if (objects.length < 2) continue;
    const parts = objects.map((object) => {
      object.updateMatrix();
      // Polyhedra are non-indexed, while boxes/cylinders are indexed. Normalize
      // them before merging so mixed armor pieces never fall back to extra draws.
      const geometry = object.geometry.index
        ? object.geometry.toNonIndexed()
        : object.geometry.clone();
      return geometry.applyMatrix4(object.matrix);
    });
    const geometry = mergeGeometries(parts);
    parts.forEach((part) => part.dispose());
    if (!geometry) continue;
    const combined = mesh(parent, geometry, mat);
    combined.castShadow = objects.some((o) => o.castShadow);
    combined.receiveShadow = objects.some((o) => o.receiveShadow);
    objects.forEach((object) => {
      object.removeFromParent();
      object.geometry.dispose();
    });
  }
}
