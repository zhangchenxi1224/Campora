import * as THREE from 'three';
import { ModelBuilder, addRoof, addPlaque, addRecessedWindows, type WindowBay } from './architecture';
import { makeMat, glowMat, lampGlows } from '../materials/proceduralTextures';

export function createXianghuiHall(): THREE.Group {
  const b = new ModelBuilder();
  const wall = makeMat('#f4efdf', true), stone = makeMat('#c6c9b7', true), roof = makeMat('#475d65', true);
  const wood = makeMat('#845444'), windows: WindowBay[] = [];
  b.box([15.8, 0.45, 11.8], [0, 0.25, 0.5], stone, 0.2);
  b.box([13, 5.8, 9], [0, 3.25, -0.25], wall, 0.12);
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
    windows.push({ position: new THREE.Vector3(x, 2.65, 4.41), width: 1.21, height: 1.35 });
    b.box([0.08, 2.8, 0.16], [x, 2.2, 4.47], wall);
  }
  for (const sign of [-1, 1]) for (let i = 0; i < 4; i++) {
    windows.push({ position: new THREE.Vector3(sign * 6.58, 3.25, -3.2 + i * 2), rotation: sign * Math.PI / 2, width: 1.14, height: 2.1 });
  }
  for (let i = 0; i < 4; i++) b.box([10.8 + i * 0.3, 0.18, 0.48], [0, 0.7 - i * 0.16, 6.6 + i * 0.42], stone);
  addPlaque(b, '相 辉 堂', 3.3, 0.8, [0, 4.1, 4.4], true);
  const light = glowMat('#ffce8c', 1.1);
  for (const x of [-4.6, 4.6]) { b.box([.25, .48, .2], [x, 3.37, 6.1], light); b.box([.44, .10, .36], [x, 3.67, 6.1], wood); }
  const group = b.finish();
  addRecessedWindows(group, windows, wall, 165);
  lampGlows(group, [[-4.6, 3.37, 6.1], [4.6, 3.37, 6.1]], 2.7);
  return group;
}
