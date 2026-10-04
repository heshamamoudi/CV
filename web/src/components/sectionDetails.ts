import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

type Point = [number, number, number];

/** Attached, section-specific features give the shared fold a recognizable purpose. */
export function sectionDetails(baseMaterials: THREE.MeshStandardMaterial[]) {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.MeshStandardMaterial[] = [];
  const groups = Array.from({length:5},()=>new THREE.Group());
  groups.forEach((group,chapter)=>{
    const palette=baseMaterials.slice(0,3).map(material=>{
      const copy=material.clone();copy.transparent=true;copy.opacity=0;materials.push(copy);return copy;
    });
    group.userData.palette=palette;
    const add=(geometry:THREE.BufferGeometry,material:number,position:Point=[0,0,0],rotation:Point=[0,0,0])=>{
      geometries.push(geometry);
      const mesh=new THREE.Mesh(geometry,palette[material]);
      mesh.position.set(...position);mesh.rotation.set(...rotation);group.add(mesh);return mesh;
    };
    const box=(size:Point,position:Point,material=0,rotation:Point=[0,0,0])=>add(
      new RoundedBoxGeometry(...size,2,Math.min(.035,Math.min(...size)*.22)),material,position,rotation);
    const panel=(points:[number,number][],depth:number,z:number,material=0)=>{
      const shape=new THREE.Shape();shape.moveTo(...points[0]);points.slice(1).forEach(point=>shape.lineTo(...point));shape.closePath();
      return add(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:2,steps:1}),material,[0,0,z]);
    };
    if(chapter===0){
      // A connected architectural system: floors, rear supports, and one clear spine.
      for(const y of [-1.78,-.59,.60,1.78])box([3.2,.11,1.30],[0,y,-.59]);
      for(const x of [-1.54,1.54])box([.12,3.60,.12],[x,0,-1.18]);
      box([.13,3.54,.10],[-.36,0,.12],1);
      for(const [y,direction] of [[-.59,1],[.60,-1],[1.78,1]]){
        const length=direction===1?1.9:1.18;
        box([length,.075,.09],[-.36+direction*length/2,y,.13],1);
      }
      // Recessed modules sit on their floors; nothing floats outside the structure.
      box([.74,.47,.63],[-1.00,-1.48,-.55],2);
      box([1.14,.47,.63],[.48,-.30,-.55],2);
      box([.74,.47,.63],[-1.00,.89,-.55],2);
    }
    if(chapter===1){
      // The display, copper hinge and tapered-looking deck read as a working laptop.
      box([5.50,.14,1.45],[0,-1.99,.63],0,[.18,0,0]);
      box([4.62,.09,.14],[0,-1.82,-.035],1);
      box([3.73,.012,.39],[0,-1.867,.17],2,[.18,0,0]);
      box([1.10,.012,.42],[0,-1.97,.95],2,[.18,0,0]);
      for(let i=0;i<8;i++)box([.31,.014,.25],[(i-3.5)*.44,-1.844,.16],0,[.18,0,0]);
    }
    if(chapter===3){
      // An open book: two covers, a copper binding and quiet typographic rules.
      for(const side of [-1,1]){
        const angle=-side*.235;
        box([2.36,2.80,.075],[side*1.15,.035,.18],2,[0,angle,0]);
        for(let line=0;line<4;line++){
          const lineWidth=line===3?.91:1.49;
          const x=side*(line===3?1.39:1.10);
          box([lineWidth,.014,.009],[x,.65-line*.29,.55*Math.abs(x)/2.3+.104],2,[0,angle,0]);
        }
      }
      box([.055,2.66,.025],[0,.05,.103],1);
    }
    if(chapter===4){
      // A raised flap and a V-cut pocket make an unmistakably open envelope.
      panel([[-2,-1.25],[2,-1.25],[2,1],[-2,1]],.09,-.22,2);
      panel([[-2,1],[0,2.12],[2,1]],.09,-.18);
      panel([[-2,-1.25],[2,-1.25],[2,1],[0,-.18],[-2,1]],.13,.005);
    }
  });
  let activeChapter=-1;
  let fromOpacity=groups.map(()=>0);
  const smooth=(x:number)=>{const t=THREE.MathUtils.clamp(x,0,1);return t*t*(3-2*t)};
  return {
    groups,
    show(chapter:number,progress:number){
      if(chapter!==activeChapter){
        fromOpacity=groups.map(group=>(group.userData.palette as THREE.MeshStandardMaterial[])[0].opacity);
        activeChapter=chapter;
      }
      groups.forEach((group,index)=>{
        // Outgoing features dissolve while the connected surface starts folding;
        // incoming features arrive on that same clock, with no abrupt swaps.
        const opacity=index===chapter
          ? THREE.MathUtils.lerp(fromOpacity[index],1,smooth((progress-.12)/.76))
          : fromOpacity[index]*(1-smooth(progress/.36));
        group.visible=opacity>.005;
        (group.userData.palette as THREE.MeshStandardMaterial[]).forEach(material=>{material.opacity=opacity;material.depthWrite=opacity>.95});
      });
    },
    dispose(){geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose())},
  };
}



