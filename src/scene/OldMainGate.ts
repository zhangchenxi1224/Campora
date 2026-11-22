import * as THREE from 'three';
import { ModelBuilder, addRoof, addPlaque } from './architecture';
import { makeMat, glowMat } from '../materials/proceduralTextures';

export function createOldMainGate(): THREE.Group {
  const b = new ModelBuilder();
  const wall = makeMat('#f1ecdb', true), base = makeMat('#bfc1b0', true), roof = makeMat('#435a60', true);
  const metal = makeMat('#4d5950'), light = glowMat('#ffe1a3', 1.3);
  b.box([19, 0.15, 6], [0, 0.09, 0], base, 0.06);
  for (const x of [-8.2, -3.3, 3.3, 8.2]) {
    const h = Math.abs(x) < 4 ? 5.8 : 4.5;
    b.box([1, h, 1.8], [x, h / 2 + 0.1, 0], wall, 0.1);
    b.box([1.35, 0.4, 2.2], [x, 0.3, 0], base);
    b.box([1.28, 0.24, 2.2], [x, h - 0.08, 0], wall);
  }
  b.box([7.8, 1.5, 1.9], [0, 5.55, 0], wall);
  addRoof(b, [0, 6.27, 0], 9.9, 3.9, 1.05, roof);
  for (const sign of [-1, 1]) {
    b.box([5.6, 0.95, 1.65], [sign * 5.8, 4.25, 0], wall);
    addRoof(b, [sign * 5.8, 4.68, 0], 6.7, 3.3, 0.9, roof);
    const curve = [];
    for (let i = 0; i <= 10; i++) {
      const x = sign * (8.8 + i * 0.68), z = -1.7 * Math.sin(i / 10 * Math.PI / 2);
      curve.push(new THREE.Vector3(x, 2.5, z));
      b.box([0.85, 2.5, 0.4], [x, 1.25, z], wall, 0.08);
    }
    b.line(curve, 0.18, roof);
    for (const x of [sign * 9.1, sign * 3.5]) {
      b.cylinder(0.08, 0.12, 2.6, [x, 1.7, 1.55], metal, 6);
      b.box([0.6, 0.8, 0.6], [x, 3.3, 1.55], light, 0.1);
      b.add(new THREE.ConeGeometry(0.52, 0.35, 4).rotateY(Math.PI / 4), metal, x, 3.88, 1.55);
      b.box([0.72, 0.13, 0.72], [x, 2.9, 1.55], metal);
    }
  }
  addPlaque(b, '复旦大学', 5.55, 1.23, [0, 5.58, 1.02]);
  return b.finish();
}
