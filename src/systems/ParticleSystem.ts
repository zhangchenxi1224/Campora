import * as THREE from 'three';
import { seededRandom } from '../materials/proceduralTextures';
import type { Season } from '../config/atmospherePresets';

interface Emitter { points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>; season: Season; count: number }
export class ParticleSystem {
  private emitters: Emitter[] = [];
  constructor(parent: THREE.Group) {
    const random = seededRandom(708);
    const configs: [Season, number, string, number][] = [['spring', 280, '#ffc9d1', 0], ['autumn', 320, '#efb25b', 1], ['winter', 500, '#f6fbff', 2], ['summer', 90, '#f4e7a2', 3]];
    for (const [season, count, color, kind] of configs) {
      const positions = [], seeds = [];
      for (let i = 0; i < count; i++) { positions.push((random() - 0.5) * 106, random() * 30, (random() - 0.5) * 100); seeds.push(random()); }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('seed', new THREE.Float32BufferAttribute(seeds, 1));
      const material = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: kind === 3 ? THREE.AdditiveBlending : THREE.NormalBlending,
        uniforms: { time: { value: 0 }, opacity: { value: 0 }, color: { value: new THREE.Color(color) }, kind: { value: kind }, pixelRatio: { value: Math.min(devicePixelRatio, 2) } },
        vertexShader: `uniform float time; uniform float kind; uniform float pixelRatio; attribute float seed; varying float vSeed;
          void main(){vSeed=seed;vec3 p=position;float rate=kind==2.?1.5:2.1;
          p.y=mod(position.y-time*rate*(.6+seed)+300.,30.);
          p.x+=sin(time*.42+seed*40.)*2.6;p.z+=cos(time*.3+seed*35.)*1.5;
          if(kind==3.){p.y=1.+seed*4.+sin(time*.7+seed*50.)*.5;p.x+=sin(time*.5+seed*100.)*1.5;}
          vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;
          gl_PointSize=clamp((kind==2.?160.:kind==3.?220.:240.)*pixelRatio/max(12.,-view.z),2.,9.);}`,
        fragmentShader: `uniform float opacity;uniform float time;uniform float kind;uniform vec3 color;varying float vSeed;
          void main(){vec2 p=gl_PointCoord-.5;float angle=time*(.8+vSeed)+vSeed*6.28;mat2 r=mat2(cos(angle),-sin(angle),sin(angle),cos(angle));p=r*p;
          float d=length(p);if(kind<1.5)d=length(p*vec2(1.1,1.7));float alpha=1.-smoothstep(.18,.49,d);
          float flicker=kind==3.?.4+.6*pow(sin(time*1.2+vSeed*70.)*.5+.5,2.):1.;
          gl_FragColor=vec4(color*(kind==3.?2.:1.),alpha*opacity*flicker);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`,
      });
      const points = new THREE.Points(geometry, material);
      points.frustumCulled = false;
      parent.add(points); this.emitters.push({ points, season, count });
    }
  }
  update(time: number, delta: number, season: Season, night: number): void {
    for (const emitter of this.emitters) {
      const u = emitter.points.material.uniforms;
      u.time.value = time;
      const target = emitter.season === season ? (season === 'summer' ? night : 0.82) : 0;
      u.opacity.value = THREE.MathUtils.lerp(u.opacity.value, target, 1 - Math.exp(-delta * 3.6));
      emitter.points.visible = u.opacity.value > 0.005;
    }
  }
}
