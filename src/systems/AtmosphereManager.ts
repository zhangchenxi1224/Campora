import * as THREE from 'three';
import type { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { type Season, seasonPresets, daylightFrames } from '../config/atmospherePresets';
import { environmentUniforms, updateEmissives, seededRandom } from '../materials/proceduralTextures';

export class AtmosphereManager {
  season: Season = 'autumn';
  timeOfDay = .94;
  actualTime = .94;
  night = 1;
  readonly sun: THREE.DirectionalLight;
  private readonly ambient: THREE.HemisphereLight;
  private readonly sky: THREE.ShaderMaterial;
  private readonly stars: THREE.Points;
  private readonly clouds: THREE.InstancedMesh;
  private readonly moon: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  private readonly halo: THREE.Sprite;
  private readonly cloudPositions: THREE.Vector3[] = [];
  private readonly cloudScales: THREE.Vector3[] = [];
  private readonly color = new THREE.Color();
  private readonly colorB = new THREE.Color();
  private readonly positionB = new THREE.Vector3();
  private readonly sunPosition = new THREE.Vector3();
  private readonly dummy = new THREE.Object3D();
  constructor(private scene: THREE.Scene, private renderer: THREE.WebGLRenderer, private bloom: UnrealBloomPass, private grass: THREE.MeshStandardMaterial, private lamps: THREE.PointLight[]) {
    scene.fog = new THREE.FogExp2('#0d152b', .006);
    this.sky = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
      uniforms: { top: { value: new THREE.Color('#050814') }, bottom: { value: new THREE.Color('#0d152b') } },
      vertexShader: 'varying vec3 vPosition; void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'uniform vec3 top;uniform vec3 bottom;varying vec3 vPosition;void main(){float h=clamp(normalize(vPosition).y*.8+.3,0.,1.);gl_FragColor=vec4(mix(bottom,top,h),1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(300, 24, 16), this.sky));
    this.sun = new THREE.DirectionalLight('#94b8eb', 1.7); this.sun.position.set(-30, 38, -25); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -28, right: 28, top: 29, bottom: -27, near: 1, far: 125 });
    this.sun.shadow.bias = -.00025; this.sun.shadow.normalBias = .04; this.sun.shadow.radius = 3; this.sun.shadow.camera.updateProjectionMatrix(); scene.add(this.sun);
    this.ambient = new THREE.HemisphereLight('#879ec1', '#181929', .48); scene.add(this.ambient);
    const fill = new THREE.DirectionalLight('#92aece', .28); fill.position.set(24, 14, 30); scene.add(fill);
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(3.1, 32, 24), new THREE.MeshBasicMaterial({ map: moonTexture(), color: new THREE.Color('#fff0d4').multiplyScalar(1.02), transparent: true, fog: false, toneMapped: false }));
    this.moon.position.set(-22, 13, -44); scene.add(this.moon);
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTexture(), color: '#bdd7ff', transparent: true, opacity: .5, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false }));
    this.halo.position.copy(this.moon.position); this.halo.scale.set(27, 27, 1); scene.add(this.halo);
    const random = seededRandom(618), positions = [], seeds = [];
    for (let i = 0; i < 620; i++) {
      const a = random() * Math.PI * 2, elevation = .03 + random() * 1.3;
      positions.push(155 * Math.cos(elevation) * Math.cos(a), 155 * Math.sin(elevation), 155 * Math.cos(elevation) * Math.sin(a)); seeds.push(random());
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('seed', new THREE.Float32BufferAttribute(seeds, 1));
    this.stars = new THREE.Points(geometry, new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
      uniforms: { opacity: { value: 1 }, time: environmentUniforms.time },
      vertexShader: 'attribute float seed;varying float vSeed;void main(){vSeed=seed;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=1.+seed*1.8;}',
      fragmentShader: 'uniform float opacity;uniform float time;varying float vSeed;void main(){vec2 p=gl_PointCoord-.5;float a=(1.-smoothstep(.04,.5,length(p)))*opacity*(.5+.5*sin(time*.5+vSeed*80.));gl_FragColor=vec4(.72,.83,1.,a);}',
    })); scene.add(this.stars);
    this.clouds = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshStandardMaterial({ color: '#e9e6dc', roughness: 1, transparent: true, opacity: 0, depthWrite: false }), 32);
    for (let cloud = 0; cloud < 8; cloud++) {
      const x = -25 + random() * 50, z = -29 + random() * 28, y = 20 + random() * 5;
      for (let part = 0; part < 4; part++) { this.cloudPositions.push(new THREE.Vector3(x + (part - 1.5) * 1.4, y + Math.sin(part) * .4, z)); this.cloudScales.push(new THREE.Vector3(1.7 + random(), .4 + random() * .5, .9 + random() * .5)); }
    }
    this.clouds.frustumCulled = false; scene.add(this.clouds);
  }
  update(dt: number, time: number): void {
    const s=seasonPresets[this.season],k=1-Math.exp(-dt*3.6);
    this.actualTime=THREE.MathUtils.lerp(this.actualTime,this.timeOfDay,1-Math.exp(-dt*9));
    let index=0;while(index<daylightFrames.length-2&&this.actualTime>daylightFrames[index+1].at)index++;
    const a=daylightFrames[index],b=daylightFrames[index+1],raw=THREE.MathUtils.clamp((this.actualTime-a.at)/(b.at-a.at),0,1),blend=raw*raw*(3-2*raw);
    this.night=THREE.MathUtils.lerp(a.night,b.night,blend);
    environmentUniforms.time.value=time;environmentUniforms.night.value=this.night;
    environmentUniforms.snow.value=THREE.MathUtils.lerp(environmentUniforms.snow.value,this.season==='winter'?1:0,k);
    this.color.set(a.sky||s.sky).lerp(this.colorB.set(b.sky||s.sky),blend);this.sky.uniforms.top.value.lerp(this.color,k);
    this.color.set(a.horizon||s.horizon).lerp(this.colorB.set(b.horizon||s.horizon),blend);this.sky.uniforms.bottom.value.lerp(this.color,k);
    const fog=this.scene.fog as THREE.FogExp2;fog.color.lerp(this.color,k);fog.density=THREE.MathUtils.lerp(fog.density,THREE.MathUtils.lerp(s.fog*.8,.006,this.night),k);
    this.color.set(a.sun).lerp(this.colorB.set(b.sun),blend);this.sun.color.copy(this.color);this.sun.intensity=THREE.MathUtils.lerp(a.light,b.light,blend);
    this.sunPosition.fromArray(a.position).lerp(this.positionB.fromArray(b.position),blend);this.sun.position.copy(this.sunPosition);
    this.ambient.intensity=THREE.MathUtils.lerp(a.ambient,b.ambient,blend);
    this.ambient.color.copy(this.color.set('#e5eddf').lerp(this.colorB.set('#7998be'),this.night));this.ambient.groundColor.copy(this.color.set('#9d977e').lerp(this.colorB.set('#171c2a'),this.night));
    this.grass.color.lerp(this.color.set(s.grass),k);
    this.renderer.toneMappingExposure=THREE.MathUtils.lerp(a.exposure,b.exposure,blend);
    this.bloom.strength=THREE.MathUtils.lerp(.11,.55,this.night);this.bloom.threshold=.78;this.bloom.radius=.65;
    const moonPhase=THREE.MathUtils.clamp((this.actualTime-.7)/.3,0,1);this.moon.position.set(-24,2+Math.sin(moonPhase*Math.PI)*5,-55);this.halo.position.copy(this.moon.position);
    updateEmissives(this.night);
    this.lamps.forEach((light, i) => light.intensity = this.night * (i < 3 ? 4.2 : 5.3));
    this.moon.material.opacity = Math.pow(this.night, 2);
    this.moon.visible = this.night > .02;
    this.halo.material.opacity = this.night * this.night * .42;
    (this.stars.material as THREE.ShaderMaterial).uniforms.opacity.value = this.night * this.night * .9;
    (this.clouds.material as THREE.MeshStandardMaterial).opacity = .32 * (1 - this.night);
    this.clouds.visible = this.night < .95;
    if (this.clouds.visible) for (let i = 0; i < 32; i++) {
      this.dummy.position.copy(this.cloudPositions[i]); this.dummy.position.x += Math.sin(time * .017 + Math.floor(i / 4)) * 4;
      this.dummy.scale.copy(this.cloudScales[i]); this.dummy.updateMatrix(); this.clouds.setMatrixAt(i, this.dummy.matrix);
    }
    this.clouds.instanceMatrix.needsUpdate = true;
  }
}
function moonTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext('2d')!, random = seededRandom(649);
  ctx.fillStyle = '#e5decb'; ctx.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 160; i++) {
    const x = random() * 512, y = random() * 256, r = 2 + random() * 25, g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(114,117,115,.22)'); g.addColorStop(.72, 'rgba(150,149,139,.08)'); g.addColorStop(1, 'rgba(150,149,139,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function haloTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!, gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(225,232,255,.65)'); gradient.addColorStop(.16, 'rgba(177,202,255,.32)'); gradient.addColorStop(.45, 'rgba(130,165,240,.11)'); gradient.addColorStop(1, 'rgba(80,120,190,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(canvas);
}
