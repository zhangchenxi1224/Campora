declare module 'n8ao' {
  import { Color,PerspectiveCamera,Scene,WebGLRenderTarget } from 'three';
  import { Pass } from 'three/addons/postprocessing/Pass.js';
  export class N8AOPass extends Pass {
    constructor(scene:Scene,camera:PerspectiveCamera,width:number,height:number);
    beautyRenderTarget:WebGLRenderTarget;
    autoDetectTransparency:boolean;
    configuration:{aoRadius:number;distanceFalloff:number;intensity:number;color:Color;halfRes:boolean;gammaCorrection:boolean;transparencyAware:boolean;aoSamples:number;denoiseSamples:number;denoiseRadius:number;denoiseIterations:number;accumulate:boolean};
    setQualityMode(mode:'Performance'|'Low'|'Medium'|'High'|'Ultra'):void;
  }
}
