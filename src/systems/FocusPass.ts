import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

export class FocusPass extends ShaderPass {
  constructor(camera: THREE.PerspectiveCamera) {
    super({
      uniforms: {
        tDiffuse: { value: null }, tDepth: { value: null }, focusDistance: { value: 90 },
        cameraNear: { value: camera.near }, cameraFar: { value: camera.far },
        texel: { value: new THREE.Vector2(1 / 1200, 1 / 800) },
        focusBand: { value: 24 }, maxBlur: { value: .45 },
      },
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `uniform sampler2D tDiffuse; uniform sampler2D tDepth; uniform float focusDistance;
        uniform float cameraNear; uniform float cameraFar; uniform vec2 texel; uniform float maxBlur;
        uniform float focusBand; varying vec2 vUv;
        #include <packing>
        float distanceAt(vec2 uv){return -perspectiveDepthToViewZ(texture2D(tDepth,uv).x,cameraNear,cameraFar);}
        void main(){
          vec3 center=texture2D(tDiffuse,vUv).rgb;float depth=distanceAt(vUv);
          float coc=smoothstep(focusBand,focusBand*3.,abs(depth-focusDistance));
          if(depth>150.||coc<.06){gl_FragColor=vec4(center,1.);return;}
          vec3 sum=center*2.;float total=2.;
          for(int i=0;i<8;i++){
            float a=float(i)*2.399963;float r=sqrt((float(i)+.5)/8.);
            vec2 uv=vUv+vec2(cos(a),sin(a))*r*coc*maxBlur*texel;
            float neighbor=distanceAt(uv);
            float weight=1.-smoothstep(focusBand*.5,focusBand*1.6,abs(neighbor-depth));
            sum+=texture2D(tDiffuse,uv).rgb*weight;total+=weight;
          }
          gl_FragColor=vec4(sum/total,1.);
        }`,
    });
  }
  updateFocus(depth: number, overview: boolean, flying: boolean, pixelRatio: number): void {
    this.uniforms.focusDistance.value = depth;
    this.uniforms.focusBand.value = Math.max(2.4, depth * (overview ? .25 : .15)) * (flying ? 1.35 : 1);
    this.uniforms.maxBlur.value = (flying ? .35 : overview ? .4 : .95) * pixelRatio;
  }
  override setSize(width: number, height: number): void {
    this.uniforms.texel.value.set(1 / width, 1 / height);
  }
}
