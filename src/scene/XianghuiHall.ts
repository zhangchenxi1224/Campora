import * as THREE from 'three';
import { ModelBuilder, addRoof, addPlaque } from './architecture';
import { makeMat, glowMat } from '../materials/proceduralTextures';

export function createXianghuiHall(): THREE.Group {
  const b = new ModelBuilder();
  const wall = makeMat('#f4efdf', true), stone = makeMat('#c6c9b7', true), roof = makeMat('#475d65', true);
  const wood = makeMat('#845444'), glass = glowMat('#91a89c', 0.45);
  b.box([15.8, 0.45, 11.8], [0, 0.25, 0.5], stone, 0.2);
  b.box([13.6, 5.8, 9], [0, 3.25, -0.25], wall, 0.12);
  b.box([14, 0.35, 9.3], [0, 0.8, -0.25], stone);
  b.box([14.1, 0.35, 9.5], [0, 5.7, -0.25], wall);
  addRoof(b, [0, 6.08, -0.25], 16.5, 11.5, 2.7, roof);
  b.box([10.6, 0.4, 3.2], [0, 4.85, 5], wall);
  addRoof(b, [0, 4.94, 5], 11.5, 3.8, 0.75, roof);
  for (const x of [-4.5, -2.7, 2.7, 4.5]) {
    b.cylinder(0.22, 0.29, 3.9, [x, 2.75, 5.9], wall, 12);
    b.box([0.66, 0.24, 0.65], [x, 0.88, 5.9], stone);
    b.box([0.66, 0.25, 0.65], [x, 4.6, 5.9], wall);
  }
  for (const x of [-3, 0, 3]) {
    b.box([1.65, 2.85, 0.12], [x, 2.23, 4.32], wood);
    b.box([1.23, 1.32, 0.15], [x, 2.65, 4.39], glass);
    b.box([0.08, 2.8, 0.16], [x, 2.2, 4.47], wall);
  }
  for (const sign of [-1, 1]) for (let i = 0; i < 4; i++) {
    b.box([0.10, 2.45, 1.3], [sign * 6.85, 3.25, -3.2 + i * 2], stone);
    b.box([0.13, 2.05, 0.95], [sign * 6.93, 3.25, -3.2 + i * 2], glass);
  }
  for (let i = 0; i < 4; i++) b.box([10.8 + i * 0.3, 0.18, 0.48], [0, 0.7 - i * 0.16, 6.6 + i * 0.42], stone);
  addPlaque(b, '相 辉 堂', 3.3, 0.8, [0, 4.1, 4.4], true);
  return b.finish();
}
