import * as THREE from 'three';
import { pathNodes, pathEdges, shortestPath } from '../config/pathGraph';
import { makeMat, seededRandom, contactShadows } from '../materials/proceduralTextures';

interface Walker { position: THREE.Vector3; from: number; to: number; route: number[]; progress: number; speed: number; phase: number; heading: number; lane: number; pause: number }
export class NPCSystem {
  readonly count = 35;
  readonly walkers: Walker[] = [];
  private readonly random = seededRandom(771);
  private readonly shadows = contactShadows(this.count, .4);
  private readonly body: THREE.InstancedMesh;
  private readonly heads: THREE.InstancedMesh;
  private readonly hair: THREE.InstancedMesh;
  private readonly bags: THREE.InstancedMesh;
  private readonly legs: THREE.InstancedMesh;
  private readonly dummy = new THREE.Object3D();
  private readonly offset = new THREE.Vector3();
  private readonly facing = new THREE.Quaternion();
  private readonly up = new THREE.Vector3(0, 1, 0);
  constructor(parent: THREE.Group) {
    parent.add(this.shadows);
    this.body = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.18, 0.32, 2, 6), makeMat('#ffffff'), this.count);
    this.heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 7, 5), makeMat('#e1ba96'), this.count);
    this.hair = new THREE.InstancedMesh(new THREE.SphereGeometry(0.165, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.55), makeMat('#514941'), this.count);
    this.bags = new THREE.InstancedMesh(new THREE.BoxGeometry(0.25, 0.3, 0.16), makeMat('#a68b67'), this.count);
    this.legs = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.065, 0.25, 2, 5), makeMat('#4b5b5d'), this.count * 2);
    const colors = ['#b9604c', '#ded1a1', '#557f8c', '#758163', '#d99f93', '#677599', '#bb985b'];
    for (let i = 0; i < this.count; i++) {
      const edge = pathEdges[(i * 7) % pathEdges.length], from = i % 2 ? edge[0] : edge[1], to = i % 2 ? edge[1] : edge[0];
      const p = 0.08 + this.random() * 0.84;
      this.walkers.push({ position: pathNodes[from].clone().lerp(pathNodes[to], p), from, to, route: [], progress: p, speed: 0.95 + this.random() * 0.65, phase: this.random() * Math.PI * 2, heading: Math.atan2(pathNodes[to].x - pathNodes[from].x, pathNodes[to].z - pathNodes[from].z), lane: (this.random() - 0.5) * 0.9, pause: 0 });
      this.body.setColorAt(i, new THREE.Color(colors[i % colors.length]));
      this.bags.setColorAt(i, new THREE.Color(colors[(i + 3) % colors.length]));
    }
    for (const mesh of [this.body, this.heads, this.hair, this.bags, this.legs]) { mesh.castShadow = true; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; parent.add(mesh); }
    this.update(0, 0);
  }
  update(dt: number, time: number): void {
    this.walkers.forEach((walker, i) => {
      if (walker.pause > 0) walker.pause -= dt;
      else {
        let speed = walker.speed;
        const a = pathNodes[walker.from], b = pathNodes[walker.to], dx = b.x - a.x, dz = b.z - a.z, length = a.distanceTo(b);
        let separation = 0;
        this.walkers.forEach((other, j) => {
          if (i === j) return;
          const rx = walker.position.x - other.position.x, rz = walker.position.z - other.position.z, distance = Math.hypot(rx, rz);
          if (distance < 0.85) {
            separation += (rx * dz - rz * dx) / length * (0.85 - distance) * 2;
            if (rx * dx + rz * dz < 0) speed *= 0.75;
          }
        });
        walker.lane = THREE.MathUtils.clamp(walker.lane + separation * dt, -0.65, 0.65);
        walker.progress += dt * speed / length;
        if (walker.progress >= 1) {
          walker.from = walker.to; walker.progress = 0;
          if (!walker.route.length) {
            let destination = Math.floor(this.random() * pathNodes.length);
            if (destination === walker.from) destination = (destination + 7) % pathNodes.length;
            walker.route = shortestPath(walker.from, destination).slice(1);
          }
          walker.to = walker.route.shift()!;
          if ([3, 8, 12, 18, 28, 35, 36, 39].includes(walker.from) && this.random() < 0.2) walker.pause = 3 + this.random() * 3;
        }
      }
      const a = pathNodes[walker.from], b = pathNodes[walker.to];
      const angle = Math.atan2(b.x - a.x, b.z - a.z);
      const delta = Math.atan2(Math.sin(angle - walker.heading), Math.cos(angle - walker.heading));
      walker.heading += delta * Math.min(1, dt * 8);
      walker.position.copy(a).lerp(b, walker.progress);
      const cornerFade = Math.sin(Math.PI * walker.progress);
      walker.position.x += Math.cos(angle) * walker.lane * cornerFade;
      walker.position.z -= Math.sin(angle) * walker.lane * cornerFade;
      const walking = walker.pause <= 0;
      const step = walking ? Math.sin(time * walker.speed * 7 + walker.phase) : 0;
      const bob = Math.abs(step) * 0.035;
      this.facing.setFromAxisAngle(this.up, walker.heading);
      const place = (mesh: THREE.InstancedMesh, index: number, x: number, y: number, z: number, legAngle = 0) => {
        this.offset.set(x, y + bob, z).applyQuaternion(this.facing);
        this.dummy.position.copy(walker.position).add(this.offset);
        this.dummy.quaternion.copy(this.facing);
        if (legAngle) this.dummy.rotateX(legAngle);
        this.dummy.scale.setScalar(1);
        this.dummy.updateMatrix(); mesh.setMatrixAt(index, this.dummy.matrix);
      };
      place(this.body, i, 0, 0.62, 0);
      place(this.heads, i, 0, 1.06, 0.015);
      place(this.hair, i, 0, 1.08, 0.015);
      place(this.bags, i, 0, 0.64, -0.21);
      place(this.legs, i * 2, -0.095, 0.23, step * 0.05, step * 0.4);
      place(this.legs, i * 2 + 1, 0.095, 0.23, -step * 0.05, -step * 0.4);
      this.dummy.position.set(walker.position.x, .145, walker.position.z); this.dummy.rotation.set(0, 0, 0); this.dummy.scale.set(.9, 1, .7); this.dummy.updateMatrix(); this.shadows.setMatrixAt(i, this.dummy.matrix);
    });
    this.shadows.instanceMatrix.needsUpdate = true;
    [this.body, this.heads, this.hair, this.bags, this.legs].forEach(mesh => mesh.instanceMatrix.needsUpdate = true);
  }
}
