import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createDioramaBase } from './scene/DioramaBase';
import { createGuanghuaTowers } from './scene/GuanghuaTowers';
import { createXianghuiHall } from './scene/XianghuiHall';
import { createOldMainGate } from './scene/OldMainGate';
import { createYanyuanGarden, updateYanyuan } from './scene/YanyuanGarden';
import { CampusFoliage } from './scene/CampusFoliage';
import { AtmosphereManager } from './systems/AtmosphereManager';
import { ParticleSystem } from './systems/ParticleSystem';
import { NPCSystem } from './systems/NPCSystem';
import { CameraController } from './systems/CameraController';
import { HudOverlay } from './ui/HudOverlay';
import { SCENE_SCALE, landmarks, type LandmarkId, type FocusId } from './config/landmarks';
import { pathNodes, pathEdges, shortestPath } from './config/pathGraph';
import type { Season, TimeOfDay } from './config/atmospherePresets';
import './style.css';

let atmosphere: AtmosphereManager | undefined;
let cameraController: CameraController | undefined;
let season: Season = 'spring', timeOfDay: TimeOfDay = 'morning';
const hud = new HudOverlay(document.querySelector('#app')!, {
  season: value => { season = value; if (atmosphere) atmosphere.season = value; hud.updateSeason(season, timeOfDay); },
  time: value => { timeOfDay = value; if (atmosphere) atmosphere.timeOfDay = value; hud.updateSeason(season, timeOfDay); },
  focus: value => cameraController?.flyTo(value),
});

function init(): void {
  const renderer = new THREE.WebGLRenderer({ canvas: hud.canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  const app = document.querySelector<HTMLElement>('#app')!;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(app.clientWidth, app.clientHeight);
  renderer.info.autoReset = false;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(25, app.clientWidth / app.clientHeight, 0.5, 400);
  const campus = new THREE.Group();
  campus.scale.setScalar(SCENE_SCALE);
  scene.add(campus);
  const base = createDioramaBase(campus);
  const modelGroups: Record<LandmarkId, THREE.Group> = {
    guanghua: createGuanghuaTowers(), lawn: base.lawn, xianghui: createXianghuiHall(), gate: createOldMainGate(), yanyuan: createYanyuanGarden(),
  };
  const anchors: Record<LandmarkId, [number, number, number]> = { guanghua: [0, 0, -26], lawn: [0, 0, -4], xianghui: [-28, 0, -8], gate: [0, 0, 36], yanyuan: [-30, 0, 22] };
  for (const info of landmarks) {
    const group = modelGroups[info.id];
    group.position.fromArray(anchors[info.id]); group.userData.landmarkId = info.id; group.name = info.name;
    if (info.id !== 'lawn') campus.add(group);
  }
  const foliage = new CampusFoliage(campus);
  const npcs = new NPCSystem(campus);
  const particles = new ParticleSystem(campus);
  addContactShadow(scene);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(app.clientWidth, app.clientHeight), 0.1, 0.6, 0.82);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  atmosphere = new AtmosphereManager(scene, renderer, bloom, base.grassMaterial, base.lamps);
  cameraController = new CameraController(camera, hud.canvas, () => { hud.badge.hidden = true; });
  hud.updateSeason(season, timeOfDay);

  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(2, 2), down = new THREE.Vector2();
  const projected = new THREE.Vector3();
  let hover: LandmarkId | null = null, pointerInside = false, dragging = false, lastRay = 0;
  const groups = Object.values(modelGroups);
  const velocity: Record<LandmarkId, number> = { guanghua: 0, lawn: 0, xianghui: 0, gate: 0, yanyuan: 0 };
  const raycast = () => {
    if (!pointerInside || dragging) return null;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(groups, true)[0];
    if (!hit) return null;
    let object: THREE.Object3D | null = hit.object;
    while (object && !object.userData.landmarkId) object = object.parent;
    return (object?.userData.landmarkId as LandmarkId) || null;
  };
  hud.canvas.addEventListener('pointermove', event => {
    const rect = hud.canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    pointerInside = true;
    if (event.buttons && Math.hypot(event.clientX - down.x, event.clientY - down.y) > 5) dragging = true;
  });
  hud.canvas.addEventListener('pointerdown', event => { down.set(event.clientX, event.clientY); dragging = false; });
  hud.canvas.addEventListener('pointerup', event => {
    if (!dragging && Math.hypot(event.clientX - down.x, event.clientY - down.y) < 6) {
      const rect = hud.canvas.getBoundingClientRect();
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      pointerInside = true;
      const id = raycast();
      if (id) { cameraController!.flyTo(id); hud.setFocus(id); }
    }
    dragging = false;
  });
  hud.canvas.addEventListener('pointerleave', () => { pointerInside = false; hover = null; hud.badge.hidden = true; });
  hud.canvas.addEventListener('keydown', event => {
    if (event.key === 'Escape' || event.key === 'Home') { cameraController!.flyTo('overview'); hud.setFocus('overview'); }
  });
  window.addEventListener('resize', () => {
    camera.aspect = app.clientWidth / app.clientHeight; camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.max(0.85, Math.min(window.devicePixelRatio, 2) * resolutionScale)); renderer.setSize(app.clientWidth, app.clientHeight);
    composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(app.clientWidth, app.clientHeight);
    cameraController!.resize();
  });
  let lastTime = performance.now(), elapsed = 0, fps = 60, frameCount = 0, frameDuration = 0, paused = false;
  let shadowFrame = 0, slowSeconds = 0, resolutionScale = 1;
  document.addEventListener('visibilitychange', () => { paused = document.hidden; lastTime = performance.now(); });
  hud.canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); paused = true; app.dataset.renderStatus = 'context-lost'; });
  hud.canvas.addEventListener('webglcontextrestored', () => window.location.reload());
  renderer.setAnimationLoop(now => {
    const rawDelta = (now - lastTime) / 1000;
    const dt = Math.min(rawDelta, 0.05); lastTime = now;
    if (paused) return;
    elapsed += dt;
    frameCount++; frameDuration += rawDelta;
    if (frameDuration > 1) {
      fps = Math.round(frameCount / frameDuration); frameCount = 0; frameDuration = 0;
      slowSeconds = fps < 49 ? slowSeconds + 1 : 0;
      if (slowSeconds >= 3 && renderer.getPixelRatio() > 0.85) {
        resolutionScale *= 0.82;
        renderer.setPixelRatio(Math.max(0.85, Math.min(window.devicePixelRatio, 2) * resolutionScale));
        composer.setPixelRatio(renderer.getPixelRatio());
        slowSeconds = 0;
      }
    }
    if (++shadowFrame % 5 === 0) renderer.shadowMap.needsUpdate = true;
    atmosphere!.update(dt, elapsed);
    foliage.update(elapsed, dt, season);
    npcs.update(dt, elapsed);
    particles.update(elapsed, dt, season, atmosphere!.night);
    updateYanyuan(elapsed, atmosphere!.night);
    cameraController!.update(dt);
    if (elapsed - lastRay > 0.08) {
      lastRay = elapsed; hover = raycast();
      hud.canvas.style.cursor = dragging ? 'grabbing' : hover ? 'pointer' : 'grab';
    }
    for (const info of landmarks) {
      const group = modelGroups[info.id], target = hover === info.id ? 0.25 : 0;
      velocity[info.id] += ((target - group.position.y) * 85 - velocity[info.id] * 13) * dt;
      group.position.y += velocity[info.id] * dt;
    }
    if (hover && !dragging) {
      const info = landmarks.find(l => l.id === hover)!;
      const height = hover === 'guanghua' ? 29 : hover === 'xianghui' ? 10 : hover === 'gate' ? 8 : hover === 'yanyuan' ? 7 : 1;
      projected.set(anchors[hover][0], height, anchors[hover][2]).multiplyScalar(SCENE_SCALE).project(camera);
      hud.badge.hidden = false;
      if (hud.badge.dataset.landmark !== hover) {
        hud.badge.dataset.landmark = hover;
        hud.badge.replaceChildren(document.createTextNode(info.name));
        const small = document.createElement('small'); small.textContent = info.english; hud.badge.append(small);
      }
      hud.badge.style.left = `${THREE.MathUtils.clamp((projected.x * 0.5 + 0.5) * app.clientWidth, 90, app.clientWidth - 90)}px`;
      hud.badge.style.top = `${Math.max(160, (-projected.y * 0.5 + 0.5) * app.clientHeight - 16)}px`;
    } else hud.badge.hidden = true;
    renderer.info.reset();
    composer.render();
  });
  const diagnostics = () => ({
    season, timeOfDay, focus: cameraController!.focus, treeCount: foliage.count, npcCount: npcs.count,
    windows: modelGroups.guanghua.userData.windowCount, graphNodes: pathNodes.length, graphEdges: pathEdges.length,
    graphConnected: pathNodes.every((_, i) => shortestPath(0, i).at(-1) === i && (i === 0 || shortestPath(0, i).length > 1)),
    fps, pixelRatio: renderer.getPixelRatio(), drawCalls: renderer.info.render.calls,
    snow: season === 'winter', night: atmosphere!.night, elapsed,
    npcPositions: npcs.walkers.map(w => [Number(w.position.x.toFixed(2)), Number(w.position.z.toFixed(2))]),
    camera: { position: camera.position.toArray(), target: cameraController!.controls.target.toArray(), zoom: camera.zoom },
    landmarks: landmarks.map(l => { const p = new THREE.Vector3(...l.position).multiplyScalar(SCENE_SCALE).project(camera); return { id: l.id, x: (p.x * 0.5 + 0.5) * app.clientWidth, y: (-p.y * 0.5 + 0.5) * app.clientHeight }; }),
  });
  Object.defineProperty(window, '__campus', { value: Object.freeze({ diagnostics }), configurable: true });
  app.dataset.renderStatus = 'ready';
  hud.ready();
}

function addContactShadow(scene: THREE.Scene): void {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(64, 64, 10, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(46,59,46,.26)'); gradient.addColorStop(0.6, 'rgba(46,59,46,.12)'); gradient.addColorStop(1, 'rgba(46,59,46,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(66, 66).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false }));
  shadow.position.y = -3; scene.add(shadow);
}
requestAnimationFrame(() => {
  try { init(); } catch (error) {
    console.error(error);
    hud.fail('三维场景未能启动。请使用支持 WebGL 2 的浏览器，并在浏览器设置中启用硬件加速后刷新。');
  }
});
