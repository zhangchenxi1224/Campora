import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeMat, textTexture, glowMat, seededRandom } from '../materials/proceduralTextures';

export class ModelBuilder {
  readonly group = new THREE.Group();
  private parts = new Map<THREE.Material, THREE.BufferGeometry[]>();
  add(geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0, rotation = 0): void {
    geometry.rotateY(rotation).translate(x, y, z);
    const plain = geometry.index ? geometry.toNonIndexed() : geometry;
    if (plain !== geometry) geometry.dispose();
    if (!this.parts.has(material)) this.parts.set(material, []);
    this.parts.get(material)!.push(plain);
  }
  box(size: number[], p: number[], material: THREE.Material, radius = 0.035, rotation = 0): void {
    this.add(new RoundedBoxGeometry(size[0], size[1], size[2], 1, Math.min(radius, ...size.map(n => n / 3))), material, p[0], p[1], p[2], rotation);
  }
  cylinder(r1: number, r2: number, h: number, p: number[], material: THREE.Material, segments = 10): void {
    this.add(new THREE.CylinderGeometry(r1, r2, h, segments), material, p[0], p[1], p[2]);
  }
  sphere(radius: number, p: number[], scale: number[], material: THREE.Material): void {
    this.add(new THREE.IcosahedronGeometry(radius, 1).scale(scale[0], scale[1], scale[2]), material, p[0], p[1], p[2]);
  }
  line(points: THREE.Vector3[], radius: number, material: THREE.Material): void {
    this.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), Math.max(8, points.length * 3), radius, 5, false), material);
  }
  finish(): THREE.Group {
    for (const [mat, parts] of this.parts) {
      const geometry = mergeGeometries(parts);
      const mesh = new THREE.Mesh(geometry, mat);
      mesh.castShadow = mesh.receiveShadow = true;
      this.group.add(mesh);
      parts.forEach(g => g.dispose());
    }
    this.parts.clear();
    return this.group;
  }
}

export function roofHeight(x: number, z: number, w: number, d: number, rise: number): number {
  const end = Math.max(0, (Math.abs(x) - w * 0.27) / (w * 0.23));
  const t = Math.min(1, Math.max(Math.abs(z) / (d / 2), end));
  return rise * (1 - Math.pow(t, 0.67)) + Math.pow(t, 7) * (0.25 + Math.pow(Math.abs(x) / (w / 2), 5) * 0.65);
}

export function addRoof(b: ModelBuilder, center: number[], w: number, d: number, rise: number, material: THREE.Material, ribs = true): void {
  const [cx, cy, cz] = center;
  const geometry = new THREE.PlaneGeometry(w, d, 24, 16);
  geometry.rotateX(-Math.PI / 2);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, roofHeight(p.getX(i), p.getZ(i), w, d, rise) + Math.sin(p.getX(i) * 2.4) * 0.022);
  geometry.computeVertexNormals();
  b.add(geometry, material, cx, cy, cz);
  const trim = makeMat('#3c5155', true);
  const timber = makeMat('#574b3e');
  b.box([w * 0.78, 0.2, d * 0.7], [cx, cy + 0.2, cz], timber);
  for (let x = -w * 0.43; x <= w * 0.43; x += 0.65) for (const sign of [-1, 1]) {
    b.add(new THREE.BoxGeometry(0.12, 0.17, d * 0.28).rotateX(sign * 0.16), timber, cx + x, cy + 0.13, cz + sign * d * 0.36);
  }
  for (const sign of [-1, 1]) {
    const points = [];
    for (let i = 0; i <= 16; i++) {
      const x = -w / 2 + w * i / 16;
      points.push(new THREE.Vector3(cx + x, cy + roofHeight(x, sign * d / 2, w, d, rise), cz + sign * d / 2));
    }
    b.line(points, 0.11, trim);
  }
  b.box([w * 0.61, 0.19, 0.22], [cx, cy + rise + 0.045, cz], trim);
  for (const sign of [-1, 1]) {
    b.line([new THREE.Vector3(cx + sign * w * 0.28, cy + rise, cz), new THREE.Vector3(cx + sign * w * 0.35, cy + rise + 0.2, cz), new THREE.Vector3(cx + sign * w * 0.37, cy + rise + 0.55, cz)], 0.13, trim);
  }
  if (ribs) for (let x = -w / 2 + 0.24; x < w / 2; x += 0.47) {
    const points = [];
    for (let i = 0; i <= 12; i++) {
      const z = -d / 2 + d * i / 12;
      points.push(new THREE.Vector3(cx + x, cy + roofHeight(x, z, w, d, rise) + 0.04, cz + z));
    }
    b.line(points, 0.036, trim);
  }
}

export interface WindowBay { position: THREE.Vector3; rotation?: number; width: number; height: number }
export function addRecessedWindows(group: THREE.Group, entries: WindowBay[], frame: THREE.Material, seed = 483): THREE.InstancedMesh {
  const random = seededRandom(seed), dummy = new THREE.Object3D();
  const parts = [new THREE.BoxGeometry(1.1, .08, .36).translate(0, .52, .12), new THREE.BoxGeometry(1.14, .09, .46).translate(0, -.52, .18), new THREE.BoxGeometry(.075, 1, .35).translate(-.53, 0, .12), new THREE.BoxGeometry(.075, 1, .35).translate(.53, 0, .12)];
  const frames = new THREE.InstancedMesh(mergeGeometries(parts), frame, entries.length);
  parts.forEach(p => p.dispose());
  const windows = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, .045), glowMat('#ffd198', .95), entries.length);
  const rooms = new THREE.InstancedMesh(new THREE.BoxGeometry(1.12, 1.13, .12).translate(0, 0, -.08), makeMat('#252d2e'), entries.length);
  const mullionGeometry = mergeGeometries([new THREE.BoxGeometry(.035, 1, .075).translate(0, 0, .12), new THREE.BoxGeometry(1, .035, .075).translate(0, .12, .12)]);
  const mullions = new THREE.InstancedMesh(mullionGeometry, makeMat('#8c8168'), entries.length);
  entries.forEach((e, i) => {
    dummy.position.copy(e.position); dummy.rotation.set(0, e.rotation || 0, 0); dummy.scale.set(e.width, e.height, 1); dummy.updateMatrix();
    for (const mesh of [frames, windows, rooms, mullions]) mesh.setMatrixAt(i, dummy.matrix);
    windows.setColorAt(i, new THREE.Color(random() < .32 ? '#253036' : random() < .48 ? '#ffdca3' : '#bb8643'));
  });
  frames.castShadow = frames.receiveShadow = true; mullions.castShadow = true;
  group.add(rooms, windows, frames, mullions);
  return windows;
}

export function addPlaque(b: ModelBuilder, text: string, width: number, height: number, p: number[], dark = false): void {
  const material = new THREE.MeshStandardMaterial({ map: textTexture(text, dark ? '#efddb0' : '#3a5050', dark ? '#384e4c' : '#eae1cf'), roughness: 0.85 });
  b.box([width, height, 0.13], p, material, 0.02);
}
