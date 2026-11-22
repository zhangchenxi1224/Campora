import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeMat, glowMat, seededRandom, contactShadows, lampGlows } from '../materials/proceduralTextures';
import { pathNodes, pathEdges } from '../config/pathGraph';

const random = seededRandom(42);
function rounded(parent: THREE.Group, size: number[], position: number[], material: THREE.Material, radius = 0.15): THREE.Mesh {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(size[0], size[1], size[2], 2, radius), material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function pavingTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#b2b4a5';
  ctx.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 8; row++) for (let col = -1; col < 5; col++) {
    const light = 71 + Math.floor(random() * 10);
    ctx.fillStyle = `hsl(39, 13%, ${light}%)`;
    ctx.fillRect(col * 64 + (row % 2) * 32 + 1, row * 32 + 1, 62, 30);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

export function createDioramaBase(parent: THREE.Group): { lawn: THREE.Group; grassMaterial: THREE.MeshStandardMaterial; lamps: THREE.PointLight[] } {
  const walnut = makeMat('#8b6550');
  for (const [inset, depth, y, material] of [[0, 3.4, -4.3, walnut], [-.5, .65, -5.05, makeMat('#26333b')], [-.2, .16, -.89, makeMat('#a18c5d')], [.4, .55, -.8, makeMat('#495a44', true)]] as const) {
    const geometry = new THREE.ExtrudeGeometry(islandShape(inset), { depth, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: .45, bevelThickness: .12 });
    geometry.rotateX(-Math.PI / 2).translate(0, y, 0);
    const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh);
  }
  const grassMaterial = makeMat('#879f70', true);
  grassMaterial.vertexColors = true;
  const ground = new THREE.ShapeGeometry(islandShape(.7), 24);
  ground.rotateX(-Math.PI / 2);
  const pos = ground.attributes.position;
  const colors = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, -0.025 + Math.sin(x * 0.23) * Math.cos(z * 0.17) * 0.035);
    const shade = 0.88 + 0.10 * Math.sin(x * 0.19 + z * 0.15) + random() * 0.08;
    colors.push(shade, shade, shade * 0.98);
  }
  ground.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  ground.computeVertexNormals();
  const grass = new THREE.Mesh(ground, grassMaterial);
  grass.receiveShadow = true;
  parent.add(grass);

  const stone = makeMat('#f3ecdc', true);
  stone.map = pavingTexture(); stone.bumpMap = stone.map; stone.roughnessMap = stone.map; stone.bumpScale = .11; stone.roughness = .69;
  const paths: THREE.BufferGeometry[] = [], curbs: THREE.BufferGeometry[] = [];
  for (const [a, b] of pathEdges) {
    const start = pathNodes[a], end = pathNodes[b];
    const length = start.distanceTo(end);
    const width = Math.abs(start.z - 12) < 0.2 && Math.abs(end.z - 12) < 0.2 ? 4.2 : 2.3;
    const angle = Math.atan2(end.x - start.x, end.z - start.z);
    const center = start.clone().add(end).multiplyScalar(0.5);
    const geometry = new THREE.BoxGeometry(width, 0.1, length + 0.1);
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * width / 3, uv.getY(i) * length / 5);
    geometry.rotateY(angle).translate(center.x, 0.065, center.z);
    paths.push(geometry);
    curbs.push(new THREE.BoxGeometry(width + 0.38, 0.12, length + 0.22).rotateY(angle).translate(center.x, 0.02, center.z));
  }
  for (const p of pathNodes) {
    paths.push(new THREE.CylinderGeometry(1.16, 1.16, 0.1, 12).translate(p.x, 0.065, p.z));
    curbs.push(new THREE.CylinderGeometry(1.35, 1.35, 0.12, 12).translate(p.x, 0.02, p.z));
  }
  const pathMesh = new THREE.Mesh(mergeGeometries(paths), stone);
  pathMesh.receiveShadow = true;
  parent.add(pathMesh);
  const curbMesh = new THREE.Mesh(mergeGeometries(curbs), makeMat('#b2b4a0', true));
  curbMesh.receiveShadow = true;
  parent.add(curbMesh);
  paths.forEach(g => g.dispose());
  curbs.forEach(g => g.dispose());

  const lawn = new THREE.Group();
  lawn.position.set(0, 0, -4);
  rounded(lawn, [34, 0.13, 20], [0, 0.025, 0], makeMat('#72945d', true), 0.06);
  const patches = new THREE.InstancedMesh(new THREE.CircleGeometry(0.85, 9).rotateX(-Math.PI / 2), makeMat('#789762', true), 90);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 90; i++) {
    dummy.position.set((random() - 0.5) * 31, 0.1, (random() - 0.5) * 18);
    dummy.scale.set(0.8 + random() * 3, 1, 0.7 + random() * 2);
    dummy.updateMatrix(); patches.setMatrixAt(i, dummy.matrix);
    patches.setColorAt(i, new THREE.Color().setHSL(0.24, 0.2, 0.75 + random() * 0.18));
  }
  patches.receiveShadow = true;
  lawn.add(patches);
  const blanketColors = ['#d4a281', '#dfd3aa', '#9dafb5'];
  [[-9, -3], [8, 3], [-2, 5]].forEach(([x, z], i) => {
    const blanket = rounded(lawn, [2.5, 0.045, 1.8], [x, 0.16, z], makeMat(blanketColors[i]), 0.02);
    blanket.rotation.y = i * 0.45;
    rounded(lawn, [0.5, 0.4, 0.34], [x + 0.5, 0.35, z], makeMat('#ac7957'), 0.07);
    rounded(lawn, [0.5, 0.065, 0.37], [x - 0.5, 0.23, z + 0.15], makeMat('#eee3c9'), 0.02);
  });
  parent.add(lawn);

  const benchWood = makeMat('#a57d57');
  const metal = makeMat('#46534a');
  const benchGeometries: THREE.BufferGeometry[] = [], feetGeometries: THREE.BufferGeometry[] = [];
  const benches = [[-12, 7.2, 0], [0, 7.2, 0], [12, 7.2, 0], [-12, -15.3, Math.PI], [12, -15.3, Math.PI], [17.2, -8, -Math.PI / 2], [17.2, 1, -Math.PI / 2], [-17.2, 0, Math.PI / 2], [27, 15.5, 0], [-9, 30, 0], [10, 30, 0], [-36, 5.5, 0]];
  for (const [x, z, angle] of benches) {
    const transform = new THREE.Matrix4().makeRotationY(angle).setPosition(x, 0, z);
    for (let j = 0; j < 3; j++) benchGeometries.push(new THREE.BoxGeometry(2.8, 0.12, 0.21).translate(0, 0.65, (j - 1) * 0.25).applyMatrix4(transform));
    for (let j = 0; j < 2; j++) benchGeometries.push(new THREE.BoxGeometry(2.8, 0.22, 0.12).translate(0, 1 + j * 0.28, -0.36).applyMatrix4(transform));
    for (const side of [-1, 1]) feetGeometries.push(new THREE.BoxGeometry(0.15, 0.7, 0.65).translate(side, 0.35, 0).applyMatrix4(transform));
  }
  for (const [geometries, mat] of [[benchGeometries, benchWood], [feetGeometries, metal]] as const) {
    const m = new THREE.Mesh(mergeGeometries(geometries), mat); m.castShadow = m.receiveShadow = true; parent.add(m); geometries.forEach(g => g.dispose());
  }
  const lampPositions: [number, number][] = [];
  for (let x = -43; x <= 44; x += 8.5) { lampPositions.push([x, 15.2]); lampPositions.push([x, 8.8]); }
  for (const z of [20, 28, 34]) lampPositions.push([-3.4, z], [3.4, z]);
  for (const x of [-19, 19]) for (const z of [-15, -3]) lampPositions.push([x + (x < 0 ? -1.8 : 1.8), z]);
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.075, 0.12, 3.1, 6), metal, lampPositions.length);
  const bases = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.27, 0.35, 6), metal, lampPositions.length);
  const lights = new THREE.InstancedMesh(new THREE.SphereGeometry(0.28, 8, 6), glowMat('#ffe0ac', 1.25), lampPositions.length);
  const tops = new THREE.InstancedMesh(new THREE.ConeGeometry(0.37, 0.25, 6), metal, lampPositions.length);
  lampPositions.forEach(([x, z], i) => {
    for (const [mesh, y] of [[poles, 1.55], [bases, 0.18], [lights, 3.19], [tops, 3.51]] as const) {
      dummy.position.set(x, y, z); dummy.scale.setScalar(1); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    }
  });
  [poles, bases, lights, tops].forEach(m => { m.castShadow = m !== lights; parent.add(m); });
  lampGlows(parent, lampPositions.map(([x, z]) => [x, 3.19, z]), 3.2);
  const benchShadows = contactShadows(benches.length, .36);
  benches.forEach(([x, z, angle], i) => { dummy.position.set(x, .14, z); dummy.rotation.set(0, angle, 0); dummy.scale.set(4, 1, 2.4); dummy.updateMatrix(); benchShadows.setMatrixAt(i, dummy.matrix); });
  parent.add(benchShadows);
  const lamps = [[0, 3, 38], [-27, 3, 18], [22, 3, 12], [32, 4, 29], [30, 4, -3], [0, 4, -20]].map(p => {
    const light = new THREE.PointLight('#ffca83', 0, 4.2, 2); light.position.set(p[0], p[1], p[2]); parent.add(light); return light;
  });
  return { lawn, grassMaterial, lamps };
}

function islandShape(inset: number): THREE.Shape {
  const r = 58 - inset, c = 33 - inset;
  const shape = new THREE.Shape();
  shape.moveTo(-c, -r); shape.lineTo(c, -r); shape.quadraticCurveTo(c + 4, -r, c + 7, -r + 3);
  shape.lineTo(r - 3, -c - 7); shape.quadraticCurveTo(r, -c - 4, r, -c);
  shape.lineTo(r, c); shape.quadraticCurveTo(r, c + 4, r - 3, c + 7);
  shape.lineTo(c + 7, r - 3); shape.quadraticCurveTo(c + 4, r, c, r);
  shape.lineTo(-c, r); shape.quadraticCurveTo(-c - 4, r, -c - 7, r - 3);
  shape.lineTo(-r + 3, c + 7); shape.quadraticCurveTo(-r, c + 4, -r, c);
  shape.lineTo(-r, -c); shape.quadraticCurveTo(-r, -c - 4, -r + 3, -c - 7);
  shape.lineTo(-c - 7, -r + 3); shape.quadraticCurveTo(-c - 4, -r, -c, -r); shape.closePath();
  return shape;
}
