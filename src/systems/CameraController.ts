import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { landmarks, SCENE_SCALE, type FocusId } from '../config/landmarks';

const smoother = (value: number): number => {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
const signedAngle = (angle: number): number => Math.atan2(Math.sin(angle), Math.cos(angle));

export class CameraController {
  readonly controls: OrbitControls;
  readonly focalPoint = new THREE.Vector3(0, 2, 0);
  focus: FocusId = 'overview';
  flying = false;
  flightProgress = 1;
  sweepDegrees = 0;
  opticalScale = 1;
  focalDistance = 1;
  focalDepth = 1;
  angularTravel = 0;
  private springVelocity = 0;
  private clock = 0;
  private duration = 2.1;
  private readonly startLook = new THREE.Vector3();
  private readonly endLook = new THREE.Vector3();
  private readonly startFocus = new THREE.Vector3();
  private readonly endPosition = new THREE.Vector3();
  private readonly idleLook = new THREE.Vector3();
  private readonly idleOffset = new THREE.Vector3();
  private readonly offset = new THREE.Vector3();
  private readonly viewPoint = new THREE.Vector3();
  private readonly pointer = new THREE.Vector2();
  private readonly parallax = new THREE.Vector2();
  private readonly spherical = new THREE.Spherical();
  private startAngle = 0;
  private endAngle = 0;
  private startPolar = 0;
  private endPolar = 0;
  private startZoom = 1;
  private endZoom = 1;
  private startFov = 23;
  private endFov = 42;
  private startScale = 1;
  private endScale = 1;
  private idle = true;
  private readonly reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  private readonly overview = new THREE.Vector3(58, 41, 70);

  constructor(private camera: THREE.PerspectiveCamera, element: HTMLElement, private onManual: () => void) {
    this.controls = new OrbitControls(camera, element);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = .075;
    this.controls.minPolarAngle = .3;
    this.controls.maxPolarAngle = 1.48;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 165;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = .45;
    this.controls.zoomSpeed = .65;
    this.controls.target.set(0, 2, 0);
    camera.position.copy(this.overview);
    camera.fov = 23;
    camera.zoom = this.zoomFor('overview');
    camera.updateProjectionMatrix();
    this.controls.update();
    this.captureIdle();
    const interrupt = () => {
      this.flying = false;
      this.idle = false;
      this.controls.enableDamping = true;
      this.onManual();
    };
    this.controls.addEventListener('start', interrupt);
    element.addEventListener('wheel', interrupt, { passive: true });
    element.addEventListener('pointermove', event => {
      const r = element.getBoundingClientRect();
      this.pointer.set(THREE.MathUtils.clamp((event.clientX - r.left) / r.width * 2 - 1, -1, 1), THREE.MathUtils.clamp(1 - (event.clientY - r.top) / r.height * 2, -1, 1));
    });
    element.addEventListener('pointerleave', () => this.pointer.set(0, 0));
  }

  private zoomFor(id: FocusId): number {
    return Math.min(id === 'overview' ? 1.04 : 1, this.camera.aspect / (id === 'overview' ? 1.12 : .82));
  }

  private captureIdle(): void {
    this.idleLook.copy(this.controls.target);
    this.idleOffset.copy(this.camera.position).sub(this.idleLook);
    this.parallax.set(0, 0);
  }

  flyTo(id: FocusId): void {
    if (id === this.focus && this.idle && !this.flying) return;
    this.focus = id;
    this.startLook.copy(this.controls.target);
    this.startFocus.copy(this.focalPoint);
    this.startZoom = this.camera.zoom;
    this.startFov = this.camera.fov;
    if (id === 'overview') {
      this.endPosition.copy(this.overview);
      this.endLook.set(0, 2, 0);
      this.endFov = 23;
    } else {
      const info = landmarks.find(l => l.id === id)!;
      this.endLook.fromArray(info.position).multiplyScalar(SCENE_SCALE);
      this.endPosition.fromArray(info.camera).multiplyScalar(SCENE_SCALE).add(this.endLook);
      this.endFov = 42;
    }
    this.endZoom = this.zoomFor(id);
    this.controls.enableDamping = false;
    this.controls.update();
    this.offset.copy(this.camera.position).sub(this.endLook);
    this.spherical.setFromVector3(this.offset);
    this.startAngle = this.spherical.theta;
    this.startPolar = this.spherical.phi;
    this.startScale = this.offset.length() * Math.tan(THREE.MathUtils.degToRad(this.startFov / 2)) / this.startZoom;
    this.offset.copy(this.endPosition).sub(this.endLook);
    const endDistance = this.offset.length();
    this.spherical.setFromVector3(this.offset);
    this.endPolar = this.spherical.phi;
    const preferred = this.spherical.theta;
    let turn = signedAngle(preferred - this.startAngle);
    if (id !== 'overview' && Math.abs(turn) < THREE.MathUtils.degToRad(50)) {
      let bestCost = Infinity;
      for (const degrees of [50, 62, 74]) for (const direction of [-1, 1]) {
        const candidate = direction * THREE.MathUtils.degToRad(degrees);
        const arrival = this.startAngle + candidate;
        const cost = Math.abs(signedAngle(arrival - preferred)) + Math.max(0, .12 - Math.cos(arrival)) * 5;
        if (cost < bestCost) { bestCost = cost; turn = candidate; }
      }
    }
    if (id !== 'overview') turn = THREE.MathUtils.clamp(turn, -THREE.MathUtils.degToRad(80), THREE.MathUtils.degToRad(80));
    this.endAngle = this.startAngle + turn;
    this.sweepDegrees = THREE.MathUtils.radToDeg(Math.abs(turn));
    this.endPosition.setFromSphericalCoords(endDistance, this.endPolar, this.endAngle).add(this.endLook);
    this.endScale = endDistance * Math.tan(THREE.MathUtils.degToRad(this.endFov / 2)) / this.endZoom;
    this.duration = THREE.MathUtils.clamp(1.8 + this.camera.position.distanceTo(this.endPosition) * .0055, 1.85, 2.4);
    this.clock = 0;
    this.flightProgress = 0;
    this.springVelocity = 0;
    this.angularTravel = 0;
    this.flying = true;
    this.idle = false;
    if (this.reducedMotion.matches) this.finish();
  }

  private finish(): void {
    this.camera.position.copy(this.endPosition);
    this.controls.target.copy(this.endLook);
    this.focalPoint.copy(this.endLook);
    this.camera.fov = this.endFov;
    this.camera.zoom = this.endZoom;
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.controls.enableDamping = true;
    this.flying = false;
    this.flightProgress = 1;
    this.idle = true;
    this.captureIdle();
  }

  resize(): void {
    this.endZoom = this.zoomFor(this.focus);
    if (!this.flying) {
      this.camera.zoom = this.endZoom;
      this.camera.updateProjectionMatrix();
    } else {
      this.endScale = this.endPosition.distanceTo(this.endLook) * Math.tan(THREE.MathUtils.degToRad(this.endFov / 2)) / this.endZoom;
    }
  }

  update(dt: number): void {
    if (this.flying) {
      const previousTarget = Math.min(1, this.clock / this.duration);
      this.clock += dt;
      const target = Math.min(1, this.clock / this.duration);
      const targetVelocity = dt > 0 ? (target - previousTarget) / dt : 0;
      const omega = 10, error = this.flightProgress - previousTarget;
      const c = this.springVelocity - targetVelocity + omega * error, decay = Math.exp(-omega * dt);
      this.flightProgress = THREE.MathUtils.clamp(target + (error + c * dt) * decay, 0, 1);
      this.springVelocity = targetVelocity + (this.springVelocity - targetVelocity - omega * c * dt) * decay;
      const p = this.flightProgress;
      const approach = smoother(p / .48);
      const optical = smoother((p - .12) / .88);
      this.controls.target.copy(this.startLook).lerp(this.endLook, smoother(p / .55));
      this.focalPoint.copy(this.startFocus).lerp(this.endLook, smoother(p / .6));
      this.camera.zoom = THREE.MathUtils.lerp(this.startZoom, this.endZoom, approach);
      this.camera.fov = THREE.MathUtils.lerp(this.startFov, this.endFov, optical);
      const anticipation = p < .2 ? .025 * Math.sin(Math.PI * p / .2) ** 2 : 0;
      const k = THREE.MathUtils.lerp(this.startScale, this.endScale, approach) * (1 + anticipation);
      const distance = k * this.camera.zoom / Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
      const angleProgress = .5 - .5 * Math.cos(Math.PI * p);
      const angle = THREE.MathUtils.lerp(this.startAngle, this.endAngle, angleProgress);
      const polar = THREE.MathUtils.lerp(this.startPolar, this.endPolar, smoother(p)) - .06 * Math.sin(Math.PI * p) ** 2;
      this.angularTravel = THREE.MathUtils.radToDeg(angle - this.startAngle);
      this.offset.setFromSphericalCoords(distance, polar, angle);
      this.camera.position.copy(this.endLook).add(this.offset);
      this.camera.updateProjectionMatrix();
      if (1 - p < .0003 && Math.abs(this.springVelocity) < .003) this.finish();
    } else if (this.idle && !this.reducedMotion.matches) {
      this.parallax.lerp(this.pointer, 1 - Math.exp(-dt * 2.8));
      this.spherical.setFromVector3(this.idleOffset);
      this.spherical.theta += this.parallax.x * Math.PI / 180;
      this.spherical.phi -= this.parallax.y * Math.PI / 180;
      this.camera.position.setFromSpherical(this.spherical).add(this.idleLook);
      this.controls.target.copy(this.idleLook);
    }
    this.controls.update();
    this.camera.updateMatrixWorld();
    this.focalDistance = this.camera.position.distanceTo(this.focalPoint);
    this.focalDepth = Math.max(this.camera.near, -this.viewPoint.copy(this.focalPoint).applyMatrix4(this.camera.matrixWorldInverse).z);
    this.opticalScale = this.camera.position.distanceTo(this.flying ? this.endLook : this.controls.target) * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) / this.camera.zoom;
  }
}
