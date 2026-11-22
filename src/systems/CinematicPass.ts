import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { environmentUniforms } from '../materials/proceduralTextures';

export function createCinematicPass(): ShaderPass {
  const pass = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, night: environmentUniforms.night },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform sampler2D tDiffuse;uniform float night;varying vec2 vUv;
      void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;float l=dot(c,vec3(.2126,.7152,.0722));
      c*=mix(vec3(.91,.98,1.07),vec3(1.04,1.015,.97),smoothstep(.08,.85,l));
      c=mix(vec3(l),c,1.045);float edge=smoothstep(.23,.74,length((vUv-.5)*vec2(1.05,1.)));
      c*=1.-edge*mix(.17,.28,night);gl_FragColor=vec4(max(c,vec3(0.)),1.);}`,
  });
  pass.uniforms.night = environmentUniforms.night;
  return pass;
}
