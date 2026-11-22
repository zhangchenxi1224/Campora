import * as THREE from 'three';
import { ModelBuilder, addRoof, addPlaque, addRecessedWindows, type WindowBay } from './architecture';
import { makeMat, glowMat, masonryTexture, lampGlows } from '../materials/proceduralTextures';

export function createTeachingBuildings(): THREE.Group {
  const b = new ModelBuilder(), windows: WindowBay[] = [];
  const brick = makeMat('#ffffff', true);
  brick.map = masonryTexture('#a37258', '#665c4b'); brick.bumpMap = brick.map; brick.bumpScale = .1;
  const cream = makeMat('#dcccb1', true), stone = makeMat('#aaa895', true), roof = makeMat('#756052', true), bronze = makeMat('#4e574f');
  b.box([23, .48, 14], [0, .23, 23], stone, .18);
  b.box([19.5, 10.1, 9.1], [0, 5.35, 22.3], brick, .06);
  b.box([20.6, .25, 10], [0, 1, 22.3], cream);
  for (let floor = 0; floor < 3; floor++) {
    const y = 1.1 + floor * 3.15;
    b.box([22.1, .28, 3.1], [0, y, 28.3], cream);
    b.box([22.1, .23, 3.1], [0, y + 2.94, 28.3], cream);
    for (let col = -5; col <= 5; col++) {
      b.box([.29, 2.8, .36], [col * 2.05, y + 1.5, 29.45], cream);
      b.box([.46, .19, .54], [col * 2.05, y + 2.8, 29.45], cream);
      if (floor > 0) b.box([.065, .73, .065], [col * 2.05 + .5, y + .52, 29.45], bronze);
    }
    if (floor > 0) b.box([21.5, .09, .1], [0, y + .93, 29.45], bronze);
    for (let col = 0; col < 9; col++) {
      const x = -8.2 + col * 2.05;
      windows.push({ position: new THREE.Vector3(x, y + 1.48, 26.89), width: 1.14, height: 2.03 });
      windows.push({ position: new THREE.Vector3(x, y + 1.48, 17.71), rotation: Math.PI, width: 1.14, height: 2.03 });
    }
  }
  for (const sign of [-1, 1]) for (let floor = 0; floor < 3; floor++) for (let col = 0; col < 3; col++) windows.push({ position: new THREE.Vector3(sign * 9.8, 2.65 + floor * 3.15, 19.6 + col * 2.7), rotation: sign * Math.PI / 2, width: 1.25, height: 1.85 });
  addRoof(b, [0, 10.6, 23], 23.2, 14.4, 2.25, roof);
  for (const x of [-6, 0, 6]) {
    b.box([1.8, 1.25, 1.8], [x, 11.55, 27], cream);
    windows.push({ position: new THREE.Vector3(x, 11.57, 27.94), width: .95, height: .78 });
    addRoof(b, [x, 12.1, 27], 2.5, 2.8, .6, roof, false);
  }
  for (let i = 0; i < 4; i++) b.box([7 + i * .65, .15, .52], [0, .7 - i * .14, 30.2 + i * .45], stone);
  addPlaque(b, '第二教学楼', 4.5, .72, [0, 4.35, 29.78], true);
  for (const x of [-8, -4, 0, 4, 8]) b.box([.3, .08, .35], [x, 3.91, 28.25], glowMat('#ffd198', 1.2));

  const concrete = makeMat('#c7c0aa', true), fins = makeMat('#e0d4be', true), flatRoof = makeMat('#596769', true);
  concrete.bumpMap = masonryTexture('#ddd5c2', '#bdb9ab'); concrete.bumpScale = .055;
  b.box([25.2, .45, 10], [1, .24, -19], stone);
  b.box([24, 8.7, 7.4], [1, 4.8, -19.5], concrete, .08);
  b.box([6.2, 7.3, 17.7], [10, 4.1, -10.2], concrete, .08);
  b.box([13, 4.4, 10.7], [-3.4, 2.6, -10.5], concrete, .08);
  b.box([24.7, .45, 8.3], [1, 9.4, -19.5], flatRoof);
  b.box([6.9, .4, 18.1], [10, 7.94, -10.2], flatRoof);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 10; col++) windows.push({ position: new THREE.Vector3(-9.2 + col * 2.25, 2.2 + row * 2.7, -15.74), width: 1.55, height: 1.65 });
    b.box([24.2, .16, .7], [1, 1.05 + row * 2.7, -15.6], fins);
  }
  for (let i = 0; i < 6; i++) {
    windows.push({ position: new THREE.Vector3(-8.4 + i * 2.02, 2.15 + i * .18, -5.08), width: 1.68, height: 1.7 });
    b.box([2.05, .25, 1.7], [-8.4 + i * 2.02, 4.95 + i * .12, -7.1], flatRoof);
  }
  for (let row = 0; row < 2; row++) for (let col = 0; col < 6; col++) windows.push({ position: new THREE.Vector3(6.82, 2.55 + row * 2.85, -15.6 + col * 2.5), rotation: -Math.PI / 2, width: 1.6, height: 1.8 });
  b.box([13.9, .38, 3.2], [-2.8, 4.57, -3.4], fins, .05);
  for (const x of [-8.8, 2.8]) b.box([.3, 4.3, .35], [x, 2.37, -2.6], bronze);
  for (const x of [-7, -3.7, -.4, 2]) b.box([.36, .05, .36], [x, 4.33, -2.95], glowMat('#ffbf79', 1.2));
  for (let i = 0; i < 3; i++) b.box([15 + i * .6, .14, .5], [-2.8, .5 - i * .14, -1.8 + i * .5], stone);
  addPlaque(b, '第三教学楼', 5, .8, [-2.8, 5.2, -4.91]);
  addPlaque(b, '3108', 1.1, .4, [-8.3, 1.15, -4.9], true);
  addPlaque(b, '3106', 1.1, .4, [1.6, 1.15, -4.9], true);
  b.box([22, .05, 13], [0, .03, 6], makeMat('#aaa995', true), .02);
  for (let i = 0; i < 7; i++) b.box([.05, .013, 12], [-9 + i * 3, .064, 6], makeMat('#737d76'));
  addBicycles(b, bronze);
  const group = b.finish();
  addRecessedWindows(group, windows, cream, 2283);
  lampGlows(group, [[-8, 3.8, 28.3], [0, 3.8, 28.3], [8, 3.8, 28.3], [-7, 4.2, -3], [0, 4.2, -3]], 2.3);
  group.userData.windowCount = windows.length;
  return group;
}
function addBicycles(b: ModelBuilder, metal: THREE.Material): void {
  const rubber = makeMat('#303c3c'), frame = makeMat('#879793');
  for (let i = 0; i < 9; i++) {
    const x = -8 + i * 1.7, z = 33.7;
    for (const dx of [-.51, .51]) b.add(new THREE.TorusGeometry(.33, .045, 5, 12), rubber, x + dx, .46, z);
    b.line([new THREE.Vector3(x - .51, .46, z), new THREE.Vector3(x - .14, .89, z), new THREE.Vector3(x + .23, .47, z), new THREE.Vector3(x - .51, .46, z)], .04, frame);
    b.line([new THREE.Vector3(x - .14, .89, z), new THREE.Vector3(x + .35, .95, z), new THREE.Vector3(x + .51, .46, z)], .04, frame);
    b.box([.28, .08, .18], [x - .14, 1.04, z], rubber);
    b.box([.08, .07, .42], [x + .38, 1.12, z], metal);
    b.line([new THREE.Vector3(x + .9, .15, z - .45), new THREE.Vector3(x + .9, .8, z - .45), new THREE.Vector3(x + .9, .8, z + .45), new THREE.Vector3(x + .9, .15, z + .45)], .045, metal);
  }
}
