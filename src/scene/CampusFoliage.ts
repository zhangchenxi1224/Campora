import * as THREE from 'three';
import { makeMat, seededRandom, environmentUniforms } from '../materials/proceduralTextures';
import { pathNodes, pathEdges } from '../config/pathGraph';
import type { Season } from '../config/atmospherePresets';

interface Tree { x: number; z: number; scale: number; species: number; tint: number }
export class CampusFoliage {
  readonly count: number;
  private readonly crowns: THREE.InstancedMesh;
  private readonly evergreens: THREE.InstancedMesh;
  private readonly crownTrees: Tree[] = [];
  private readonly coniferTrees: Tree[] = [];
  private season: Season = 'spring';
  private transition = 0;
  private color = new THREE.Color();
  private target = new THREE.Color();
  constructor(parent: THREE.Group) {
    const random = seededRandom(557), trees: Tree[] = [];
    const valid = (x: number, z: number) => {
      const exclusions = [[0, -4, 37, 24], [0, -26, 35, 18], [-28, -8, 19, 16], [0, 36, 36, 8], [-30, 22, 25, 21], [31, -28, 12, 12], [44, -26, 12, 16], [32, -41, 16, 11], [-30, -35, 16, 12], [32, 30, 16, 12]];
      for (const [cx, cz, w, d] of exclusions) if (Math.abs(x - cx) < w / 2 && Math.abs(z - cz) < d / 2) return false;
      for (const [a, b] of pathEdges) {
        const p = pathNodes[a], q = pathNodes[b], dx = q.x - p.x, dz = q.z - p.z;
        const t = THREE.MathUtils.clamp(((x - p.x) * dx + (z - p.z) * dz) / (dx * dx + dz * dz), 0, 1);
        if (Math.hypot(x - p.x - t * dx, z - p.z - t * dz) < (p.z === 12 && q.z === 12 ? 3.6 : 2.4)) return false;
      }
      return trees.every(t => Math.hypot(x - t.x, z - t.z) > 3.3);
    };
    const add = (x: number, z: number, species: number, scale = 1) => trees.push({ x, z, species, scale: scale * (0.83 + random() * 0.33), tint: random() });
    for (let x = -47; x <= 48; x += 5.4) for (const z of [6.7, 17.4]) if (valid(x, z)) add(x, z, 0, 0.95);
    for (const x of [-12, 12, -18, 18]) for (const z of [41, 46]) add(x, z, 2, 1.03);
    for (let i = 0; i < 6000 && trees.length < 228; i++) {
      const x = (random() - 0.5) * 107, z = (random() - 0.5) * 107;
      if (valid(x, z)) add(x, z, random() < 0.22 ? 2 : random() < 0.43 ? 0 : 1, z > 20 ? 0.85 : 1.0);
    }
    this.count = trees.length;
    const dummy = new THREE.Object3D();
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.13, 0.22, 2.8, 7), makeMat('#806a4e'), trees.length);
    trees.forEach((tree, i) => {
      dummy.position.set(tree.x, 1.4 * tree.scale, tree.z); dummy.rotation.set(0, tree.tint * 3, (tree.tint - 0.5) * 0.05); dummy.scale.setScalar(tree.scale); dummy.updateMatrix(); trunks.setMatrixAt(i, dummy.matrix);
      if (tree.species === 2) this.coniferTrees.push(tree); else this.crownTrees.push(tree);
    });
    trunks.castShadow = true; parent.add(trunks);
    const leafMat = makeMat('#ffffff', true);
    const snowShader = leafMat.onBeforeCompile;
    leafMat.onBeforeCompile = (shader, renderer) => {
      snowShader.call(leafMat, shader, renderer);
      shader.uniforms.uWindTime = environmentUniforms.time;
      shader.vertexShader = 'uniform float uWindTime;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.x+=sin(uWindTime*1.15+instanceMatrix[3].x*.27+instanceMatrix[3].z*.19)*.07*(position.y+1.4);');
    };
    leafMat.customProgramCacheKey = () => 'wind-snow-leaves';
    const canopyGeo = new THREE.IcosahedronGeometry(1, 2);
    const p = canopyGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const factor = 1 + Math.sin(p.getX(i) * 9 + p.getY(i) * 7 + p.getZ(i) * 3) * 0.045;
      p.setXYZ(i, p.getX(i) * factor, p.getY(i) * factor, p.getZ(i) * factor);
    }
    canopyGeo.computeVertexNormals();
    this.crowns = new THREE.InstancedMesh(canopyGeo, leafMat, this.crownTrees.length * 4);
    this.crownTrees.forEach((tree, i) => {
      for (let part = 0; part < 4; part++) {
        const angle = part * 2.1 + tree.tint * 7, s = tree.scale;
        dummy.position.set(tree.x + (part === 3 ? 0 : Math.cos(angle) * 0.75 * s), (part === 3 ? 4.15 : 3.15) * s, tree.z + (part === 3 ? 0 : Math.sin(angle) * 0.72 * s));
        const r = (part === 3 ? 1.34 : 1.28) * s;
        dummy.rotation.set(tree.tint, angle, tree.tint * 0.3); dummy.scale.set(r, r * (tree.species === 0 ? 0.83 : 1.06), r); dummy.updateMatrix(); this.crowns.setMatrixAt(i * 4 + part, dummy.matrix);
      }
    });
    this.crowns.castShadow = this.crowns.receiveShadow = true; parent.add(this.crowns);
    this.evergreens = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 2.8, 9), makeMat('#59705a', true), this.coniferTrees.length * 3);
    this.coniferTrees.forEach((tree, i) => {
      for (let j = 0; j < 3; j++) {
        const s = tree.scale;
        dummy.position.set(tree.x, (2.3 + j * 1.15) * s, tree.z); dummy.rotation.set(0, tree.tint * 7, 0); dummy.scale.set((1.5 - j * 0.3) * s, s, (1.5 - j * 0.3) * s); dummy.updateMatrix(); this.evergreens.setMatrixAt(i * 3 + j, dummy.matrix);
      }
    });
    this.evergreens.castShadow = this.evergreens.receiveShadow = true; parent.add(this.evergreens);
    this.setColors(1, 'spring');
    this.addWillows(parent);
  }
  private setColors(t: number, season: Season): void {
    this.crownTrees.forEach((tree, i) => {
      const palette = season === 'spring' ? (tree.species === 0 ? '#e8b8ba' : '#a2b67b') : season === 'summer' ? (tree.species === 0 ? '#719c65' : '#557953') : season === 'autumn' ? (tree.species === 0 ? '#cf9861' : '#d9b34f') : '#80958d';
      this.target.set(palette).offsetHSL((tree.tint - 0.5) * 0.02, 0, (tree.tint - 0.5) * 0.09);
      for (let j = 0; j < 4; j++) {
        if (this.crowns.instanceColor) this.crowns.getColorAt(i * 4 + j, this.color); else this.color.copy(this.target);
        this.color.lerp(this.target, t); this.crowns.setColorAt(i * 4 + j, this.color);
      }
    });
    this.crowns.instanceColor!.needsUpdate = true;
  }
  update(_time: number, dt: number, season: Season): void {
    if (season !== this.season) { this.season = season; this.transition = 2.2; }
    if (this.transition > 0) { this.setColors(1 - Math.exp(-dt * 4), season); this.transition -= dt; }
  }
  private addWillows(parent: THREE.Group): void {
    const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.17, 0.27, 3.6, 7), makeMat('#807555'), 2);
    const curtains = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), makeMat('#899f6d', true), 24);
    const d = new THREE.Object3D();
    [[-41, 28], [-20.5, 27.5]].forEach(([x, z], i) => {
      d.position.set(x, 1.8, z); d.scale.setScalar(1); d.updateMatrix(); stems.setMatrixAt(i, d.matrix);
      for (let j = 0; j < 12; j++) {
        const a = j / 12 * Math.PI * 2;
        d.position.set(x + Math.cos(a) * 1.7, 3, z + Math.sin(a) * 1.7); d.scale.set(0.54, 1.9, 0.58); d.updateMatrix(); curtains.setMatrixAt(i * 12 + j, d.matrix);
      }
    });
    stems.castShadow = curtains.castShadow = true; parent.add(stems, curtains);
  }
}
