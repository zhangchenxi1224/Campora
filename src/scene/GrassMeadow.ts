import * as THREE from 'three';
import { environmentUniforms, makeMat, seededRandom } from '../materials/proceduralTextures';
import type { Season } from '../config/atmospherePresets';

export class GrassMeadow {
  readonly count = 22000;
  private readonly material = makeMat('#819c69', true);
  private readonly ground: THREE.MeshStandardMaterial;
  private readonly mesh: THREE.InstancedMesh;
  private readonly color = new THREE.Color();
  private readonly center = new THREE.Vector3();
  private readonly detail = { value: 1 };
  constructor(private parent: THREE.Group) {
    this.ground = (parent.getObjectByName('velvet-turf') as THREE.Mesh).material as THREE.MeshStandardMaterial;
    const geometry = new THREE.PlaneGeometry(.022, .16, 1, 2).translate(0, .08, 0);
    const positions = geometry.attributes.position, colors: number[] = [];
    for (let i = 0; i < positions.count; i++) {
      const t = positions.getY(i) / .16;
      positions.setX(i, positions.getX(i) * (1 - t * .95));
      positions.setZ(i, t * t * .018);
      const shade = .84 + t * .16;
      colors.push(shade, shade, shade * .97);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    this.material.side = THREE.DoubleSide; this.material.vertexColors = true;
    this.material.bumpMap = null; this.material.roughness = .98; this.material.metalness = 0;
    const base = this.material.onBeforeCompile;
    this.material.onBeforeCompile = (shader, renderer) => {
      base.call(this.material, shader, renderer);
      shader.uniforms.uGrassTime = environmentUniforms.time;
      shader.uniforms.uDetail = this.detail;
      shader.vertexShader = 'uniform float uGrassTime; uniform float uDetail; varying float vBlade; varying vec3 vTurfNormal;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>\nvTurfNormal=normalize(normalMatrix*vec3(0.,1.,0.));');
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vBlade=position.y/.16;
        float wave=sin(uGrassTime*.85+instanceMatrix[3].x*.45+instanceMatrix[3].z*.3);
        transformed.x+=wave*vBlade*vBlade*.026;
        transformed.y*=uDetail;
        transformed.x*=uDetail;`);
      shader.fragmentShader = 'varying float vBlade; varying vec3 vTurfNormal;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal=normalize(mix(normal,normalize(vTurfNormal),.92));');
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(.86,.91,.97),uSnow*(.55+.4*vBlade));');
    };
    this.material.customProgramCacheKey = () => 'fine-turf-wind';
    const mesh = this.mesh = new THREE.InstancedMesh(geometry, this.material, this.count);
    const random = seededRandom(8134), dummy = new THREE.Object3D();
    const cellsX = 200, cellsZ = 110;
    for (let i = 0; i < this.count; i++) {
      const x = ((i % cellsX + random()) / cellsX - .5) * 33.6;
      const z = ((Math.floor(i / cellsX) + random()) / cellsZ - .5) * 19.6;
      const covered = [[-9, -3], [8, 3], [-2, 5]].some(([bx, bz]) => Math.abs(x - bx) < 1.75 && Math.abs(z - bz) < 1.4);
      dummy.position.set(x, .09, z);
      dummy.rotation.set(0, random() * Math.PI, 0);
      dummy.scale.set(.75 + random() * .4, covered ? .015 : .5 + random() * .45, 1);
      dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.receiveShadow = true; mesh.raycast = () => {}; parent.add(mesh);
  }
  update(dt: number, season: Season, camera: THREE.PerspectiveCamera): void {
    this.color.set(season === 'spring' ? '#829c69' : season === 'summer' ? '#668453' : season === 'autumn' ? '#8d9562' : '#8a9b8b');
    const blend = 1 - Math.exp(-dt * 3.5);
    this.material.color.lerp(this.color, blend);
    this.ground.color.lerp(this.color, blend);
    this.parent.getWorldPosition(this.center);
    const distance = camera.position.distanceTo(this.center);
    const heightOnScreen = .16 * .32 * camera.zoom / (distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    const detail = THREE.MathUtils.smoothstep(heightOnScreen, .0015, .0045);
    this.detail.value = THREE.MathUtils.lerp(this.detail.value, detail, blend);
    this.mesh.visible = this.detail.value > .025;
  }
}
