import * as THREE from 'three';

/** Deterministic original grain/bump maps, generated locally; no external texture requests. */
export function surface(color: string, metalness: number, roughness: number, seed: number) {
  const mat = new THREE.MeshStandardMaterial({ color, metalness, roughness });
  if (typeof document === 'undefined') return mat;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return mat;
  const pixels = ctx.createImageData(256, 256);
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 256; x++) {
      const i = (y * 256 + x) * 4;
      const noise = Math.sin(x * 127.1 + y * 311.7 + seed * 17.1) * 43758.5453;
      const grain = noise - Math.floor(noise);
      const cloud = Math.sin(x * 0.09 + seed) * Math.cos(y * 0.073 - seed) * 0.5 + 0.5;
      const scratch = Math.sin(x * 0.65 + y * 0.09 + seed) > 0.992 ? -28 : 0;
      const value = 165 + grain * 45 + cloud * 42 + scratch;
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
      pixels.data[i + 3] = 255;
    }
  ctx.putImageData(pixels, 0, 0);
  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 2);
  map.colorSpace = THREE.SRGBColorSpace;
  const bump = map.clone();
  bump.colorSpace = THREE.NoColorSpace;
  mat.map = map;
  mat.bumpMap = bump;
  mat.bumpScale = metalness > 0.6 ? 0.012 : 0.06;
  return mat;
}
