import * as THREE from 'three';
import { ModelBuilder } from './architecture';
import { makeMat, seededRandom, lampGlows, environmentUniforms, contactShadows } from '../materials/proceduralTextures';

export class SculpturePlaza {
  readonly group=new THREE.Group();
  readonly reflectionGroup=new THREE.Group();
  readonly seedCount=26;
  readonly silver=new THREE.MeshPhysicalMaterial({color:'#e2e8f0',metalness:.94,roughness:.12,clearcoat:1,clearcoatRoughness:.08,envMapIntensity:1.2});
  readonly gold=new THREE.MeshPhysicalMaterial({color:'#f4b942',metalness:.85,roughness:.2,clearcoat:.8,emissive:'#ff9a2e',emissiveIntensity:.2,envMapIntensity:1});
  private readonly uplights:THREE.PointLight[]=[];
  private readonly pmrem:THREE.PMREMGenerator;
  private readonly cubeTarget=new THREE.WebGLCubeRenderTarget(128,{type:THREE.HalfFloatType,generateMipmaps:true,minFilter:THREE.LinearMipmapLinearFilter});
  private readonly cubeCamera=new THREE.CubeCamera(.06,350,this.cubeTarget);
  private reflection:THREE.WebGLRenderTarget|undefined;
  private captureKey='';private changedAt=0;private capturedAt=-10;
  captureCount=0;
  constructor(parent:THREE.Group,renderer:THREE.WebGLRenderer){
    this.group.position.set(1,0,5.5);parent.add(this.group);
    const b=new ModelBuilder(),stone=makeMat('#414d50',true),rim=makeMat('#9c9e8e',true),soil=makeMat('#514b36');
    b.cylinder(4.5,4.6,.15,[0,.15,0],makeMat('#b4af99',true),64);
    b.cylinder(3.28,3.48,.22,[0,.34,0],stone,64);b.cylinder(2.92,3.15,.25,[0,.57,0],stone,64);b.cylinder(2.7,2.92,.22,[0,.8,0],stone,64);
    b.add(new THREE.TorusGeometry(4.15,.13,6,80).rotateX(Math.PI/2),rim,0,.33,0);
    b.add(new THREE.RingGeometry(3.52,4.1,64).rotateX(-Math.PI/2),soil,0,.26,0);
    this.group.add(b.finish());this.group.add(this.reflectionGroup);this.reflectionGroup.rotation.y=Math.atan2(44,20);
    for(const side of [-1,1]){
      const shell=new THREE.Mesh(shellGeometry(side),this.silver);shell.position.set(side*.31,3.42,0);shell.rotation.z=-side*.035;shell.castShadow=shell.receiveShadow=true;this.reflectionGroup.add(shell);
    }
    const random=seededRandom(735),dummy=new THREE.Object3D();
    const seeds=new THREE.InstancedMesh(new THREE.SphereGeometry(.25,12,8),this.gold,this.seedCount);
    for(let i=0;i<this.seedCount;i++){
      const row=i%7,col=Math.floor(i/7),dy=-1.7+row*.56+(random()-.5)*.12,x=(col-1.5)*.29+(random()-.5)*.08;
      dummy.position.set(x,3.42+dy,Math.sqrt(Math.max(.15,2.08**2-dy*dy-x*x))*.9+.06);dummy.scale.set(.9,1.1+random()*.15,.95);dummy.rotation.set(random(),random(),random());dummy.updateMatrix();seeds.setMatrixAt(i,dummy.matrix);
    }
    seeds.castShadow=true;this.reflectionGroup.add(seeds);
    const leaves=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.22,1),makeMat('#59734d',true),110);
    const flowers=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.09,1),makeMat('#ffffff',true),330);
    for(let i=0;i<110;i++){
      const angle=i*2.39996,r=3.64+random()*.34,x=Math.cos(angle)*r,z=Math.sin(angle)*r,y=.4+random()*.19;
      dummy.position.set(x,y,z);dummy.rotation.set(random(),angle,0);dummy.scale.set(1.5,1,1.2);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);
      for(let petal=0;petal<3;petal++){
        dummy.position.set(x+Math.cos(petal*2.1)*.09,y+.16,z+Math.sin(petal*2.1)*.09);dummy.scale.set(1.2,.45,1);dummy.updateMatrix();flowers.setMatrixAt(i*3+petal,dummy.matrix);flowers.setColorAt(i*3+petal,new THREE.Color(i%5===0?'#c65142':'#e9ba34'));
      }
    }
    leaves.castShadow=true;this.group.add(leaves,flowers);
    const shadow=contactShadows(1,.5);dummy.position.set(0,.27,0);dummy.scale.set(6.6,1,6.6);dummy.rotation.set(0,0,0);dummy.updateMatrix();shadow.setMatrixAt(0,dummy.matrix);this.group.add(shadow);
    const points:[number,number,number][]=[[-2.8,.5,2.3],[2.8,.5,2.3]];
    for(const p of points){const light=new THREE.PointLight('#ffc16c',1.2,2.7,2);light.position.fromArray(p);this.group.add(light);this.uplights.push(light);}
    lampGlows(this.group,points,1.5);
    this.pmrem=new THREE.PMREMGenerator(renderer);this.pmrem.compileCubemapShader();
  }
  update(time:number,timeOfDay:number,season:string,renderer:THREE.WebGLRenderer,scene:THREE.Scene):void{
    this.gold.emissiveIntensity=.04+environmentUniforms.night.value*.35;this.uplights.forEach(l=>l.intensity=.05+environmentUniforms.night.value*1.4);
    const key=`${season}:${Math.round(timeOfDay*100)}`;
    if(key!==this.captureKey){this.captureKey=key;this.changedAt=time;}
    if((!this.reflection||time-this.changedAt>1.05)&&time-this.capturedAt>.9){
      this.group.updateWorldMatrix(true,true);this.cubeCamera.position.set(0,3.45,0).applyMatrix4(this.group.matrixWorld);
      const visible=this.reflectionGroup.visible;this.reflectionGroup.visible=false;
      const toneMapping=renderer.toneMapping;renderer.toneMapping=THREE.NoToneMapping;
      this.cubeCamera.update(renderer,scene);
      const reflection=this.pmrem.fromCubemap(this.cubeTarget.texture);
      this.silver.envMap=reflection.texture;this.gold.envMap=reflection.texture;
      if(!this.reflection){this.silver.needsUpdate=true;this.gold.needsUpdate=true;}
      this.reflection?.dispose();this.reflection=reflection;this.reflectionGroup.visible=visible;renderer.toneMapping=toneMapping;this.capturedAt=time;this.captureCount++;
      if(this.captureCount>1)this.changedAt=Infinity;
    }
  }
}
function shellGeometry(side:number):THREE.BufferGeometry{
  const rows=32,columns=40,positions:number[]=[],indices:number[]=[],uvs:number[]=[];
  const layerSize=(rows+1)*(columns+1);
  for(let layer=0;layer<2;layer++)for(let row=0;row<=rows;row++)for(let col=0;col<=columns;col++){
    const theta=row/rows*Math.PI,gap=.16+.06*Math.sin(theta*3)+.025*Math.sin(theta*7),phi=gap/2+col/columns*(Math.PI-gap),r=layer===0?2.44:2.23;
    positions.push(side*r*Math.sin(theta)*Math.sin(phi),r*Math.cos(theta),r*Math.sin(theta)*Math.cos(phi));uvs.push(col/columns,row/rows);
  }
  const triangle=(a:number,b:number,c:number,reverse:boolean)=>indices.push(a,reverse?c:b,reverse?b:c);
  for(let layer=0;layer<2;layer++)for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
    const a=layer*layerSize+row*(columns+1)+col,b=a+columns+1,reverse=(side<0)!==(layer===1);
    triangle(a,b,a+1,reverse);triangle(b,b+1,a+1,reverse);
  }
  for(const edge of [0,columns])for(let row=0;row<rows;row++){
    const a=row*(columns+1)+edge,b=a+columns+1,reverse=(side<0)!==(edge===0);
    triangle(a,a+layerSize,b,reverse);triangle(b,a+layerSize,b+layerSize,reverse);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
