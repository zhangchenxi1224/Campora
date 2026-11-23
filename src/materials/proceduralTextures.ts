import * as THREE from 'three';

export const environmentUniforms = {
  snow: { value: 0 },
  time: { value: 0 },
  night: { value: 1 },
};
const emissiveMaterials: { material: THREE.MeshStandardMaterial; strength: number }[] = [];
let grain: THREE.CanvasTexture | undefined;

export function noiseTexture(): THREE.CanvasTexture {
  if (grain) return grain;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d')!;
  const image = context.createImageData(256, 256);
  let seed = 913;
  for (let i = 0; i < image.data.length; i += 4) {
    seed = (seed * 16807) % 2147483647;
    const v = 175 + (seed % 65);
    image.data.set([v, v, v, 255], i);
  }
  context.putImageData(image, 0, 0);
  grain = new THREE.CanvasTexture(canvas);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.repeat.set(3, 3);
  return grain;
}

export function makeMat(color: THREE.ColorRepresentation, snow = false): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.84, metalness: 0.04, bumpMap: noiseTexture(), bumpScale: 0.065 });
  material.onBeforeCompile = shader => {
    shader.uniforms.uSnow = snow ? environmentUniforms.snow : { value: 0 };
    shader.vertexShader = 'varying vec3 vSnowNormal; varying float vContactHeight;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>\nvSnowNormal = inverseTransformDirection(transformedNormal, viewMatrix);');
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvec4 contactPosition=vec4(transformed,1.);\n#ifdef USE_INSTANCING\ncontactPosition=instanceMatrix*contactPosition;\n#endif\nvContactHeight=(modelMatrix*contactPosition).y;');
    shader.fragmentShader = 'uniform float uSnow; varying vec3 vSnowNormal; varying float vContactHeight;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb*=mix(.76,1.,smoothstep(-.03,.52,vContactHeight))*mix(.72,1.,smoothstep(-.7,.12,vSnowNormal.y));\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(.86,.91,.97),uSnow*smoothstep(.45,.75,vSnowNormal.y));');
  };
  material.customProgramCacheKey = () => snow ? 'craft-snow-v2' : 'craft-matte-v2';
  return material;
}

export function glowMat(color: THREE.ColorRepresentation = '#ffd49b', strength = 1): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.08, roughness: 0.65 });
  material.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#ifdef USE_COLOR\ntotalEmissiveRadiance *= vColor.rgb;\n#endif');
  };
  material.customProgramCacheKey = () => 'campus-instance-lights';
  emissiveMaterials.push({ material, strength });
  return material;
}

export function updateEmissives(night: number): void {
  for (const { material, strength } of emissiveMaterials) material.emissiveIntensity = 0.05 + night * 1.5 * strength;
}

export function textTexture(text: string, color = '#374c49', background = '#e9ddc4'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 1024, 256);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 138px "STKaiti", "KaiTi", "SimSun", serif';
  ctx.fillText(text, 512, 137, 940);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

let shadowTexture: THREE.CanvasTexture | undefined;
export function contactShadows(count: number, opacity = 0.3): THREE.InstancedMesh {
  if (!shadowTexture) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d')!, gradient = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(0,0,0,1)'); gradient.addColorStop(0.35, 'rgba(0,0,0,.7)'); gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64); shadowTexture = new THREE.CanvasTexture(canvas);
  }
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: shadowTexture, color: '#111522', transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }), count);
  mesh.frustumCulled = false;
  mesh.raycast = () => {};
  return mesh;
}

export function masonryTexture(base: string, mortar: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!, random = seededRandom(927);
  ctx.fillStyle = mortar; ctx.fillRect(0, 0, 256, 256);
  const color = new THREE.Color(base);
  for (let row = 0; row < 16; row++) for (let col = -1; col < 9; col++) {
    ctx.fillStyle = '#' + color.clone().multiplyScalar(0.82 + random() * 0.26).getHexString();
    ctx.fillRect(col * 32 + (row % 2) * 16 + 1, row * 16 + 1, 30, 14);
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2); texture.anisotropy = 4; return texture;
}

export function lampGlows(parent: THREE.Group, positions: [number, number, number][], size = 2.5): void {
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { night: environmentUniforms.night },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;mat4 mv=modelViewMatrix*instanceMatrix;vec4 p=mv*vec4(0.,0.,0.,1.);vec2 s=vec2(length(mv[0].xyz),length(mv[1].xyz));gl_Position=projectionMatrix*(p+vec4(position.xy*s,0.,0.));}',
    fragmentShader: 'uniform float night; varying vec2 vUv; void main(){float d=length(vUv-.5)*2.;float a=exp(-d*d*7.)*smoothstep(1.,.4,d)*night;gl_FragColor=vec4(1.,.48,.16,a*.26);}',
  });
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), material, positions.length), dummy = new THREE.Object3D();
  positions.forEach((p, i) => { dummy.position.fromArray(p); dummy.scale.setScalar(size); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); });
  mesh.frustumCulled = false; mesh.raycast = () => {}; parent.add(mesh);
}

export function lawnTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d')!, image = ctx.createImageData(512, 512), random = seededRandom(8193);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const cloud = Math.sin(x * .021 + Math.sin(y * .013)) * 3 + Math.cos(y * .028 + x * .007) * 2;
    const grain = (random() - .5) * 5;
    const shade = Math.round(236 + cloud + grain);
    image.data.set([shade, shade, shade, 255], (y * 512 + x) * 4);
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(4, 3); texture.anisotropy = 8;
  return texture;
}

export function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}
