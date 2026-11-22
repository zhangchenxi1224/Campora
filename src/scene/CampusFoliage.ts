import * as THREE from 'three';
import { makeMat, seededRandom, environmentUniforms, contactShadows } from '../materials/proceduralTextures';
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
      if (Math.abs(x) + Math.abs(z) > 85) return false;
      const exclusions = [[0, -4, 37, 24], [0, -26, 35, 18], [-28, -8, 19, 16], [0, 36, 36, 8], [-30, 22, 25, 21], [32, 24, 28, 26], [33, -14, 29, 26], [32, 5, 25, 18]];
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
    const shadows = contactShadows(trees.length, .37);
    trees.forEach((tree, i) => { dummy.position.set(tree.x, .08, tree.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(3.6 * tree.scale, 1, 3.6 * tree.scale); dummy.updateMatrix(); shadows.setMatrixAt(i, dummy.matrix); });
    parent.add(shadows);
    const leafMat = makeMat('#ffffff', true);
    leafMat.vertexColors = true;
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
    const shades: number[] = [];
    for (let i = 0; i < p.count; i++) { const shade = .65 + (p.getY(i) + 1) * .16 + Math.abs(p.getX(i)) * .05; shades.push(shade * .96, shade, shade * .93); }
    canopyGeo.setAttribute('color', new THREE.Float32BufferAttribute(shades, 3));
    canopyGeo.computeVertexNormals();
    this.crowns = new THREE.InstancedMesh(canopyGeo, leafMat, this.crownTrees.length * 6);
    this.crownTrees.forEach((tree, i) => {
      for (let part = 0; part < 6; part++) {
        const angle = part * 2.4 + tree.tint * 7, s = tree.scale;
        const radius = part < 4 ? 1.05 : .4;
        dummy.position.set(tree.x + Math.cos(angle) * radius * s, (2.9 + part * .27 + Math.sin(angle) * .18) * s, tree.z + Math.sin(angle) * radius * s);
        const r = (1.02 + Math.sin(angle * 3) * .17) * s;
        dummy.rotation.set(tree.tint * .6, angle, (tree.tint - .5) * .5); dummy.scale.set(r * 1.12, r * (tree.species === 0 ? .83 : 1.05), r); dummy.updateMatrix(); this.crowns.setMatrixAt(i * 6 + part, dummy.matrix);
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
      for (let j = 0; j < 6; j++) {
        if (this.crowns.instanceColor) this.crowns.getColorAt(i * 6 + j, this.color); else this.color.copy(this.target);
        this.color.lerp(this.target, t); this.crowns.setColorAt(i * 6 + j, this.color);
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
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(.1, .1, 0), new THREE.Vector3(1.1, .25, 0), new THREE.Vector3(2, -.55, 0), new THREE.Vector3(2.2, -2.9, 0)]);
    const frondMat = makeMat('#7e9860', true), baseShader = frondMat.onBeforeCompile;
    frondMat.onBeforeCompile = (shader, renderer) => { baseShader.call(frondMat, shader, renderer); shader.uniforms.uWind = environmentUniforms.time; shader.vertexShader = 'uniform float uWind;\n' + shader.vertexShader; shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.z+=sin(uWind+instanceMatrix[3].x+position.y)*abs(position.y)*.07;'); };
    frondMat.customProgramCacheKey = () => 'willow-wind';
    const curtains = new THREE.InstancedMesh(new THREE.TubeGeometry(curve, 12, .12, 4), frondMat, 48);
    const d = new THREE.Object3D();
    [[-41, 28], [-20.5, 27.5]].forEach(([x, z], i) => {
      d.position.set(x, 1.8, z); d.scale.setScalar(1); d.updateMatrix(); stems.setMatrixAt(i, d.matrix);
      for (let j = 0; j < 24; j++) {
        const a = j / 24 * Math.PI * 2;
        d.position.set(x, 4.1 + Math.sin(a * 3) * .2, z); d.rotation.y = a; d.scale.set(1, .85 + .15 * Math.sin(a), 1); d.updateMatrix(); curtains.setMatrixAt(i * 24 + j, d.matrix);
      }
      d.rotation.y = 0;
    });
    stems.castShadow = curtains.castShadow = true; parent.add(stems, curtains);
  }
}
