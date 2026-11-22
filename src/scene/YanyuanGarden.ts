import * as THREE from 'three';
import { ModelBuilder, addRoof, addPlaque, addRecessedWindows, type WindowBay } from './architecture';
import { makeMat, glowMat, seededRandom, environmentUniforms, lampGlows } from '../materials/proceduralTextures';

const fish: THREE.Group[] = [];
let blossoms: THREE.InstancedMesh;
const blossomDummy = new THREE.Object3D();
export function createYanyuanGarden(): THREE.Group {
  const b = new ModelBuilder();
  const windows: WindowBay[] = [];
  const rock = makeMat('#76817d', true), wall = makeMat('#eee9d5', true), roof = makeMat('#536563', true), wood = makeMat('#725a48');
  const random = seededRandom(184);
  const shape = new THREE.Shape();
  for (let i = 0; i <= 48; i++) {
    const theta = i / 48 * Math.PI * 2;
    const x = -2 + Math.cos(theta) * (8.9 + Math.sin(theta * 3) * 0.55);
    const z = Math.sin(theta) * (5.8 + Math.cos(theta * 4) * 0.4);
    if (i === 0) shape.moveTo(x, z); else shape.lineTo(x, z);
  }
  const waterGeo = new THREE.ShapeGeometry(shape, 48).rotateX(-Math.PI / 2);
  const basin = new THREE.Mesh(waterGeo.clone(), makeMat('#235654'));
  basin.position.y = -.43; b.group.add(basin);
  const waterMat = new THREE.MeshPhysicalMaterial({ color: '#3a9894', roughness: .18, metalness: .18, clearcoat: 1, clearcoatRoughness: .15, ior: 1.33, thickness: .4, transparent: true, opacity: .86, side: THREE.DoubleSide, depthWrite: false });
  waterMat.onBeforeCompile = shader => {
    shader.uniforms.uTime = environmentUniforms.time;
    shader.vertexShader = 'uniform float uTime; varying vec3 vWater;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvWater=position; transformed.y+=sin(position.x*1.7+uTime)*cos(position.z*1.5-uTime*.6)*.035;');
    shader.uniforms.uNight = environmentUniforms.night;
    shader.fragmentShader = 'uniform float uTime; uniform float uNight; varying vec3 vWater;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal=normalize(normal+vec3(sin(vWater.x*2.8+uTime)*.065,cos(vWater.z*3.4-uTime*.8)*.065,0.));');
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nfloat reflection=exp(-pow((vWater.x-4.5-sin(vWater.z*5.+uTime)*.13)*2.7,2.))*exp(-abs(vWater.z+1.5)*.45);float ripple=.4+.6*pow(sin(vWater.z*26.+uTime*2.)*.5+.5,3.);totalEmissiveRadiance+=vec3(1.,.47,.12)*reflection*ripple*uNight*.65;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\nfloat wave=sin(vWater.x*4.+vWater.z*2.+uTime*1.4)*sin(vWater.z*5.-uTime); diffuseColor.rgb+=smoothstep(.74,.99,wave)*.13;');
  };
  const water = new THREE.Mesh(waterGeo, waterMat); water.position.y = -.12; water.receiveShadow = true; b.group.add(water);
  for (let i = 0; i < 54; i++) {
    const a = i / 54 * Math.PI * 2, radius = 1 + Math.sin(a * 3) * 0.055;
    b.sphere(0.7 + random() * 0.3, [-2 + Math.cos(a) * 9.1 * radius, 0.1, Math.sin(a) * 6.15], [1.2, 0.45, 0.9], rock);
  }
  b.sphere(1, [-8, .18, -3.6], [3.2, .8, 2.4], makeMat('#5d6d54', true));
  for (let i = 0; i < 3; i++) b.add(new THREE.TorusGeometry(.7, .24, 7, 12).scale(.8, 1.5, .7), rock, -8.5 + i * .8, 1.7 + i * .3, -3.5 + i * .3, i * .35);
  for (let i = 0; i < 12; i++) b.sphere(0.7 + random() * 0.55, [-8 + random() * 2.4, 0.5 + random() * 2.2, -3.6 + random() * 2], [0.65, 1.15, 0.65], rock);
  const deck = new THREE.PlaneGeometry(2.25, 11.5, 1, 24).rotateX(-Math.PI / 2);
  const dp = deck.attributes.position;
  for (let i = 0; i < dp.count; i++) dp.setY(i, 0.26 + 1.65 * (1 - Math.pow(dp.getZ(i) / 5.75, 2)));
  deck.computeVertexNormals(); b.add(deck, rock, -1.5, 0, 0.2);
  for (const sign of [-1, 1]) {
    const handrail = [];
    for (let i = 0; i <= 10; i++) {
      const z = -5.75 + i * 1.15, y = 0.26 + 1.65 * (1 - Math.pow(z / 5.75, 2));
      b.cylinder(0.09, 0.13, 0.85, [-1.5 + sign * 1.02, y + 0.4, z + 0.2], rock, 6);
      b.sphere(0.16, [-1.5 + sign * 1.02, y + 0.86, z + 0.2], [1, 1, 1], wall);
      handrail.push(new THREE.Vector3(-1.5 + sign * 1.02, y + 0.7, z + 0.2));
    }
    b.line(handrail, 0.095, wall);
    const arch = handrail.map(p => new THREE.Vector3(p.x, p.y - 0.77, p.z));
    b.line(arch, 0.19, rock);
  }
  b.box([6.6, 0.4, 5.5], [6, 0.35, -5.2], rock);
  b.box([5.7, 4.8, 4.4], [6, 2.9, -5.3], wall);
  for (const floor of [1.6, 3.8]) for (const x of [4.1, 5.35, 6.65, 7.9]) {
    windows.push({ position: new THREE.Vector3(x, floor + .04, -3.01), width: .79, height: 1.22 });
  }
  addRoof(b, [6, 5.32, -5.3], 7.8, 6.3, 1.25, roof);
  addRoof(b, [6, 2.7, -2.7], 7.3, 2.1, 0.5, roof, false);
  for (const x of [3.2, 8.8]) b.cylinder(0.16, 0.18, 2.5, [x, 1.55, -1.95], wood, 8);
  addPlaque(b, '南 轩', 1.7, 0.65, [6, 2.44, -2.83], true);
  for (const x of [3.1, 8.9]) { b.box([.34, .56, .34], [x, 2.06, -2], glowMat('#ffc27a', .95)); b.box([.55, .13, .5], [x, 2.43, -2], roof); }
  const group = b.finish();
  addRecessedWindows(group, windows, wood, 741);
  lampGlows(group, [[3.1, 2.06, -2], [8.9, 2.06, -2]], 2.4);
  blossoms = new THREE.InstancedMesh(new THREE.CircleGeometry(.15, 5).rotateX(-Math.PI / 2), makeMat('#e2afac'), 18);
  group.add(blossoms);
  for (let i = 0; i < 3; i++) {
    const koi = new THREE.Group(), mat = makeMat(i === 1 ? '#eedab6' : '#d57c4e');
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 5).scale(0.55, 0.35, 1.7), mat); koi.add(body);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.38, 3).rotateX(Math.PI / 2), mat); tail.position.z = -0.65; koi.add(tail);
    koi.position.y = -.13; group.add(koi); fish.push(koi);
  }
  return group;
}
export function updateYanyuan(time: number, _night: number, season = 'spring'): void {
  blossoms.visible = season === 'spring';
  if (blossoms.visible) for (let i = 0; i < 18; i++) { const a = i * 2.4 + time * .013; blossomDummy.position.set(-3 + Math.cos(a) * (3 + i % 4), -.065, Math.sin(a) * (2 + i % 3)); blossomDummy.rotation.y = a; blossomDummy.updateMatrix(); blossoms.setMatrixAt(i, blossomDummy.matrix); }
  blossoms.instanceMatrix.needsUpdate = true;
  fish.forEach((koi, i) => {
    const angle = time * (0.1 + i * 0.018) + i * 2.1;
    koi.position.x = -3 + Math.cos(angle) * (3 + i * 0.7);
    koi.position.z = Math.sin(angle) * (2.4 + i * 0.2);
    koi.rotation.y = Math.atan2(-Math.sin(angle) * (3 + i * 0.7), Math.cos(angle) * (2.4 + i * 0.2));
    koi.children[1].rotation.y = Math.sin(time * 3 + i) * 0.25;
  });
}
