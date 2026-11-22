import * as THREE from 'three';
import type { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { type Season, type TimeOfDay, seasonPresets, timePresets } from '../config/atmospherePresets';
import { environmentUniforms, updateEmissives, seededRandom } from '../materials/proceduralTextures';

export class AtmosphereManager {
  season: Season = 'spring';
  timeOfDay: TimeOfDay = 'morning';
  night = 0;
  readonly sun: THREE.DirectionalLight;
  private readonly ambient: THREE.HemisphereLight;
  private readonly sky: THREE.ShaderMaterial;
  private readonly stars: THREE.Points;
  private readonly clouds: THREE.InstancedMesh;
  private readonly cloudPositions: THREE.Vector3[] = [];
  private readonly cloudScales: THREE.Vector3[] = [];
  private readonly targetSky = new THREE.Color();
  private readonly targetHorizon = new THREE.Color();
  private readonly targetLight = new THREE.Color();
  private readonly targetGrass = new THREE.Color();
  private readonly targetFog = new THREE.Color();
  private readonly dummy = new THREE.Object3D();

  constructor(private scene: THREE.Scene, private renderer: THREE.WebGLRenderer, private bloom: UnrealBloomPass, private grass: THREE.MeshStandardMaterial, private lamps: THREE.PointLight[]) {
    scene.fog = new THREE.FogExp2('#e8ecdf', 0.0042);
    this.sky = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { top: { value: new THREE.Color('#dce8df') }, bottom: { value: new THREE.Color('#f4ebdf') } },
      vertexShader: 'varying vec3 vPosition; void main(){vPosition=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vPosition; void main(){float h=clamp(normalize(vPosition).y*.7+.35,0.,1.); gl_FragColor=vec4(mix(bottom,top,h),1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(300, 24, 16), this.sky));
    this.sun = new THREE.DirectionalLight('#fff0d8', 3);
    this.sun.position.set(-34, 53, 32);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 130 });
    this.sun.shadow.bias = -0.00035;
    this.sun.shadow.normalBias = 0.045;
    this.sun.shadow.radius = 3;
    this.sun.shadow.camera.updateProjectionMatrix();
    scene.add(this.sun);
    this.ambient = new THREE.HemisphereLight('#edf3ec', '#b0a68e', 2.3);
    scene.add(this.ambient);
    const fill = new THREE.DirectionalLight('#cddfdf', 0.6); fill.position.set(24, 20, -30); scene.add(fill);
    const random = seededRandom(618);
    const starPositions = [], starSizes = [];
    for (let i = 0; i < 380; i++) {
      const theta = random() * Math.PI * 2, phi = random() * Math.PI * 0.48;
      starPositions.push(170 * Math.sin(phi) * Math.cos(theta), 25 + 140 * Math.cos(phi), 170 * Math.sin(phi) * Math.sin(theta));
      starSizes.push(random());
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('seed', new THREE.Float32BufferAttribute(starSizes, 1));
    this.stars = new THREE.Points(starGeometry, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { opacity: { value: 0 }, time: environmentUniforms.time },
      vertexShader: 'attribute float seed; varying float vSeed; void main(){vSeed=seed;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=1.+seed*2.;}',
      fragmentShader: 'uniform float opacity; uniform float time; varying float vSeed; void main(){float d=length(gl_PointCoord-.5);float a=(1.-smoothstep(.1,.5,d))*opacity*(.65+.35*sin(time*.6+vSeed*30.));gl_FragColor=vec4(.8,.86,1.,a);}',
    }));
    scene.add(this.stars);
    const cloudMaterial = new THREE.MeshStandardMaterial({ color: '#f6f1e4', roughness: 1, transparent: true, opacity: 0.65, depthWrite: false });
    this.clouds = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), cloudMaterial, 32);
    for (let cloud = 0; cloud < 8; cloud++) {
      const cx = -26 + random() * 52, cz = -25 + random() * 40, cy = 17 + random() * 6;
      for (let part = 0; part < 4; part++) {
        this.cloudPositions.push(new THREE.Vector3(cx + (part - 1.5) * 1.35, cy + Math.sin(part) * 0.4, cz));
        this.cloudScales.push(new THREE.Vector3(1.5 + random(), 0.45 + random() * 0.4, 0.8 + random() * 0.5));
      }
    }
    this.clouds.frustumCulled = false;
    scene.add(this.clouds);
  }

  update(dt: number, time: number): void {
    const season = seasonPresets[this.season], tod = timePresets[this.timeOfDay];
    const t = 1 - Math.exp(-dt * 3.6);
    this.night = THREE.MathUtils.lerp(this.night, tod.night, t);
    environmentUniforms.time.value = time;
    environmentUniforms.snow.value = THREE.MathUtils.lerp(environmentUniforms.snow.value, this.season === 'winter' ? 1 : 0, t);
    const night = this.timeOfDay === 'night', golden = this.timeOfDay === 'golden';
    this.targetSky.set(night ? '#101d35' : golden ? '#9b9bb0' : season.sky);
    this.targetHorizon.set(night ? '#283954' : golden ? '#eac095' : season.horizon);
    this.targetFog.copy(this.targetHorizon);
    this.sky.uniforms.top.value.lerp(this.targetSky, t);
    this.sky.uniforms.bottom.value.lerp(this.targetHorizon, t);
    const fog = this.scene.fog as THREE.FogExp2;
    fog.color.lerp(this.targetFog, t);
    fog.density = THREE.MathUtils.lerp(fog.density, night ? 0.0062 : season.fog, t);
    this.targetLight.set(night ? '#93baff' : golden ? '#ffa95e' : season.sun);
    this.sun.color.lerp(this.targetLight, t);
    this.sun.intensity = THREE.MathUtils.lerp(this.sun.intensity, tod.sunIntensity, t);
    this.sun.position.lerp(new THREE.Vector3(golden ? -46 : -34, golden ? 22 : 53, night ? -20 : 32), t);
    this.ambient.intensity = THREE.MathUtils.lerp(this.ambient.intensity, tod.ambient, t);
    this.ambient.color.lerp(this.targetLight.set(night ? '#698aba' : '#edf3ec'), t);
    this.ambient.groundColor.lerp(this.targetLight.set(night ? '#374456' : '#b0a68e'), t);
    this.grass.color.lerp(this.targetGrass.set(season.grass), t);
    this.renderer.toneMappingExposure = THREE.MathUtils.lerp(this.renderer.toneMappingExposure, tod.exposure, t);
    this.bloom.strength = THREE.MathUtils.lerp(this.bloom.strength, night ? 0.45 : golden ? 0.24 : 0.10, t);
    this.bloom.threshold = 0.82;
    updateEmissives(this.night);
    this.lamps.forEach(light => light.intensity = this.night * 4);
    (this.stars.material as THREE.ShaderMaterial).uniforms.opacity.value = this.night * this.night;
    (this.clouds.material as THREE.MeshStandardMaterial).opacity = 0.27 * (1 - this.night * 0.83);
    this.clouds.visible = this.night < 0.99;
    for (let i = 0; i < this.cloudPositions.length; i++) {
      this.dummy.position.copy(this.cloudPositions[i]);
      this.dummy.position.x += Math.sin(time * 0.017 + Math.floor(i / 4)) * 4;
      this.dummy.scale.copy(this.cloudScales[i]);
      this.dummy.updateMatrix(); this.clouds.setMatrixAt(i, this.dummy.matrix);
    }
    this.clouds.instanceMatrix.needsUpdate = true;
  }
}
