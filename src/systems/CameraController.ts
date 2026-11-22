import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { landmarks, SCENE_SCALE, type FocusId } from '../config/landmarks';

const ease = (t: number) => t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2;
export class CameraController {
  readonly controls: OrbitControls;
  focus: FocusId = 'overview';
  flying = false;
  flightProgress = 1;
  sweepDegrees = 0;
  private elapsed = 0;
  private readonly duration = 2.1;
  private readonly startLook = new THREE.Vector3();
  private readonly endLook = new THREE.Vector3();
  private readonly endPosition = new THREE.Vector3();
  private readonly idlePosition = new THREE.Vector3();
  private readonly idleLook = new THREE.Vector3();
  private startZoom = 1;
  private endZoom = 1;
  private startFov = 38;
  private endFov = 35;
  private curve: THREE.CatmullRomCurve3 | undefined;
  private idle = true;
  private idleTime = 0;
  private readonly reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  private readonly overview = new THREE.Vector3(38, 22, 46);
  constructor(private camera: THREE.PerspectiveCamera, element: HTMLElement, private onManual: () => void) {
    this.controls = new OrbitControls(camera, element);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.065;
    this.controls.minPolarAngle = 0.3;
    this.controls.maxPolarAngle = 1.43;
    this.controls.minDistance = 11;
    this.controls.maxDistance = 115;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.46;
    this.controls.zoomSpeed = 0.66;
    this.controls.target.set(0, 2, 0);
    camera.position.copy(this.overview);
    camera.fov = 38;
    camera.zoom = this.zoomFor('overview'); camera.updateProjectionMatrix();
    this.controls.update();
    this.captureIdle();
    const interrupt = () => {
      this.flying = false; this.idle = false;
      this.controls.enableDamping = true;
      this.onManual();
    };
    this.controls.addEventListener('start', interrupt);
    element.addEventListener('wheel', interrupt, { passive: true });
  }
  private zoomFor(id: FocusId): number { return Math.min(1, this.camera.aspect / (id === 'overview' ? 1.55 : 0.82)); }
  private captureIdle(): void { this.idlePosition.copy(this.camera.position); this.idleLook.copy(this.controls.target); this.idleTime = 0; }
  flyTo(id: FocusId): void {
    this.focus = id;
    this.startLook.copy(this.controls.target);
    this.startZoom = this.camera.zoom; this.startFov = this.camera.fov;
    if (id === 'overview') {
      this.endPosition.copy(this.overview); this.endLook.set(0, 2, 0); this.endFov = 38;
    } else {
      const info = landmarks.find(l => l.id === id)!;
      this.endLook.fromArray(info.position).multiplyScalar(SCENE_SCALE);
      this.endPosition.fromArray(info.camera).multiplyScalar(SCENE_SCALE).add(this.endLook);
      this.endFov = id === 'guanghua' ? 34 : 35;
    }
    this.endZoom = this.zoomFor(id);
    this.controls.enableDamping = false;
    this.controls.update();
    const start = this.camera.position.clone();
    const pivot = this.startLook.clone().lerp(this.endLook, 0.5);
    const from = start.clone().sub(pivot), to = this.endPosition.clone().sub(pivot);
    const a = Math.atan2(from.x, from.z), b = Math.atan2(to.x, to.z);
    const shortest = Math.atan2(Math.sin(b - a), Math.cos(b - a));
    const direction = shortest < 0 ? -1 : 1;
    this.sweepDegrees = 68;
    const bend = a + direction * THREE.MathUtils.degToRad(this.sweepDegrees);
    const radius = Math.max(Math.hypot(from.x, from.z), Math.hypot(to.x, to.z), 23) * 1.08;
    const apex = new THREE.Vector3(pivot.x + Math.sin(bend) * radius, Math.max(start.y, this.endPosition.y, 13) + 7, pivot.z + Math.cos(bend) * radius);
    const approach = this.endPosition.clone().lerp(apex, 0.27);
    approach.y = Math.max(approach.y, this.endPosition.y + 3);
    this.curve = new THREE.CatmullRomCurve3([start, apex, approach, this.endPosition.clone()], false, 'centripetal');
    this.elapsed = 0; this.flightProgress = 0; this.flying = true; this.idle = false;
    if (this.reducedMotion.matches) this.finish();
  }
  private finish(): void {
    this.camera.position.copy(this.endPosition); this.controls.target.copy(this.endLook);
    this.camera.fov = this.endFov; this.camera.zoom = this.endZoom; this.camera.updateProjectionMatrix();
    this.controls.update(); this.controls.enableDamping = true;
    this.flying = false; this.flightProgress = 1; this.idle = true; this.captureIdle();
  }
  resize(): void {
    this.endZoom = this.zoomFor(this.focus);
    if (!this.flying) { this.camera.zoom = this.endZoom; this.camera.updateProjectionMatrix(); }
  }
  update(dt: number): void {
    if (this.flying && this.curve) {
      this.elapsed += dt;
      const t = Math.min(1, this.elapsed / this.duration), e = ease(t);
      this.flightProgress = t;
      this.camera.position.copy(this.curve.getPoint(e));
      this.controls.target.copy(this.startLook).lerp(this.endLook, e);
      this.camera.zoom = THREE.MathUtils.lerp(this.startZoom, this.endZoom, e);
      const fov = t < 0.35 ? THREE.MathUtils.lerp(this.startFov, 50, 1 - (1 - t / 0.35) ** 3) : THREE.MathUtils.lerp(50, this.endFov, 1 - (1 - (t - 0.35) / 0.65) ** 3);
      this.camera.fov = fov; this.camera.updateProjectionMatrix();
      if (t === 1) this.finish();
    } else if (this.idle && !this.reducedMotion.matches) {
      this.idleTime += dt;
      this.camera.position.copy(this.idlePosition);
      this.camera.position.x += Math.sin(this.idleTime * 0.23) * 0.10;
      this.camera.position.y += Math.sin(this.idleTime * 0.35) * 0.055;
      this.controls.target.copy(this.idleLook);
    }
    this.controls.update();
  }
}
