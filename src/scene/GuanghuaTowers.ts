import * as THREE from 'three';
import { ModelBuilder, addPlaque, addRecessedWindows } from './architecture';
import { makeMat, glowMat, masonryTexture, lampGlows } from '../materials/proceduralTextures';

export function createGuanghuaTowers(): THREE.Group {
  const b = new ModelBuilder();
  const stone = makeMat('#e4d6bb', true), trim = makeMat('#f0e7d2', true), recess = makeMat('#a8aa99');
  const darkStone = makeMat('#c3b79e', true), roof = makeMat('#929b91', true);
  stone.bumpMap = masonryTexture('#ddd5bf', '#bfb7a0'); stone.bumpScale = .04;
  const uplight = glowMat('#fbc17d', .5);
  b.box([30, .6, 15], [0, .3, 0], darkStone, .22);
  for (const sign of [-1, 1]) {
    const x = sign * 7.5;
    b.box([6.3, 25, 8.6], [x, 12.9, 0], stone, 0.1);
    b.box([6.5, .055, 8.85], [x, 26.1, -.2], uplight);
    b.box([7.6, 0.42, 10], [x, 1.0, 0], trim);
    b.box([7.6, 0.42, 10], [x, 24.9, 0], trim);
    b.box([6.4, 1.1, 8.8], [x, 25.55, -0.2], darkStone);
    b.box([5.7, 0.75, 8.0], [x, 26.45, -0.4], stone);
    const crown = new THREE.BoxGeometry(5.7, 1.4, 8.0);
    const p = crown.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setY(i, 0.7 - (p.getZ(i) + 4) * 0.095);
    crown.computeVertexNormals(); b.add(crown, roof, x, 27.25, -0.4);
    for (const side of [-1, 1]) {
      for (let col = 0; col < 6; col++) b.box([0.23, 23, 0.65], [x - 2.98 + col * 1.19, 12.7, side * 4.8], trim, 0.02);
      for (let floor = 1; floor < 25; floor++) b.box([6.95, 0.075, 0.15], [x, 1.32 + floor * 0.92, side * 4.76], darkStone, 0.015);
      b.box([0.28, 24, 9.65], [x + side * 3.35, 12.6, 0], trim, 0.025);
    }
    b.box([4.4, 5.6, 10.5], [sign * 13.1, 3.1, 0.6], stone);
    b.box([4.9, 0.33, 11], [sign * 13.1, 6.02, 0.6], trim);
    b.box([3.8, 0.35, 9.8], [sign * 13.1, 6.36, 0.6], roof);
    for (let col = 0; col < 3; col++) b.box([.36, 3.5, .48], [sign * 13.1 - 1.6 + col * 1.6, 2, 6.55], trim);
    b.box([5.1, .3, 2], [sign * 13.1, 3.9, 6.0], trim);
    for (let floor = 0; floor < 4; floor++) b.box([4.45, 0.10, 0.1], [sign * 13.1, 1.65 + floor, 5.88], darkStone);
  }
  b.box([8.5, 11.9, 7], [0, 8.2, -0.45], makeMat('#435b5d'));
  for (let col = 0; col < 7; col++) b.box([.10, 10.7, .28], [-3.77 + col * 1.26, 9, 3.28], trim);
  b.box([8.7, 0.45, 8], [0, 14.45, -0.45], trim);
  b.box([7.6, 0.36, 7.2], [0, 14.85, -0.45], roof);
  b.box([6.9, 2.6, 0.18], [0, 1.9, 3.45], recess);
  for (const x of [-3.6, -1.2, 1.2, 3.6]) b.box([0.42, 3, 1.6], [x, 1.85, 4.1], trim);
  b.box([9, 0.36, 2], [0, 3.5, 4.1], trim);
  for (let i = 0; i < 4; i++) b.box([10 + i * 0.6, 0.16, 0.7], [0, 0.6 - i * 0.15, 5.05 + i * 0.6], darkStone);
  addPlaque(b, '光 华 楼', 4.6, 0.85, [0, 4.1, 3.5]);
  const group = b.finish();
  const entries: { p: THREE.Vector3; ry: number; s: THREE.Vector3 }[] = [];
  for (const sign of [-1, 1]) {
    const x = sign * 7.5;
    for (let row = 0; row < 24; row++) {
      for (let col = 0; col < 5; col++) for (const face of [-1, 1]) entries.push({ p: new THREE.Vector3(x - 2.38 + col * 1.19, 2 + row * 0.92, face * 4.43), ry: face > 0 ? 0 : Math.PI, s: new THREE.Vector3(0.78, 0.64, 1) });
      for (let col = 0; col < 3; col++) for (const face of [-1, 1]) entries.push({ p: new THREE.Vector3(x + face * 3.24, 2 + row * 0.92, -2.6 + col * 2.6), ry: face * Math.PI / 2, s: new THREE.Vector3(1.45, 0.64, 1) });
    }
    for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) entries.push({ p: new THREE.Vector3(sign * 13.1 - 1.55 + col * 1.02, 1.3 + row, 5.88), ry: 0, s: new THREE.Vector3(0.66, 0.65, 1) });
  }
  for (let row = 0; row < 10; row++) for (let col = 0; col < 6; col++) entries.push({ p: new THREE.Vector3(-3.15 + col * 1.26, 4.6 + row * 0.88, 3.38), ry: 0, s: new THREE.Vector3(0.82, 0.56, 1) });
  addRecessedWindows(group, entries.map(e => ({ position: e.p, rotation: e.ry, width: e.s.x, height: e.s.y })), trim, 843);
  lampGlows(group, [[-7.5, 26.1, 4], [7.5, 26.1, 4], [0, 3.4, 4.4]], 2.4);
  group.userData.windowCount = entries.length;
  return group;
}
