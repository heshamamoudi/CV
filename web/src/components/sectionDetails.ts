import * as THREE from "three";
import { architectureNodes, projectNodes, type ProjectSculpture } from './softwareArchitecture';
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

type Point = [number, number, number];

/** Attached, section-specific features give the shared fold a recognizable purpose. */
export function sectionDetails(baseMaterials: THREE.MeshStandardMaterial[]) {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.MeshStandardMaterial[] = [];
  const groups = Array.from({length:7},()=>new THREE.Group());
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
    if(chapter===0 || chapter===1 || chapter>=5){
      const variant:ProjectSculpture=chapter===5?'inviteqr':chapter===6?'delivery':'selfhost';
      const nodes=chapter===0?architectureNodes:projectNodes[variant];
      group.name=chapter===0?'software-architecture':variant+'-workflow';
      for(const node of nodes) {
        const x=node.x,y=node.y,w=node.width;
        box([w+.08,1.02,.075],[x,y,-.19],2).name=node.id+'-backing';
        box([w,.94,.24],[x,y,.005],0).name=node.id;
        for(const direction of [-1,1])box([.13,.065,.07],[x+direction*(w/2+.045),y,.025],1);
        // Distinct technical glyphs sit above the live, high-contrast HTML label.
        if(node.kind==='module') {
          for(let i=0;i<3;i++)box([.29,.037,.035],[x,y+.36-i*.075,.15],1);
        } else if(node.kind==='data') {
          for(let i=0;i<3;i++)add(new THREE.CylinderGeometry(.17,.17,.055,20),1,[x,y+.38-i*.095,.14]);
        } else if(node.kind==='health') {
          const points=[[-.29,.30],[-.12,.30],[-.025,.43],[.07,.21],[.15,.30],[.30,.30]];
          for(let i=1;i<points.length;i++) {
            const [ax,ay]=points[i-1],[bx,by]=points[i];
            box([Math.hypot(bx-ax,by-ay),.034,.03],[x+(ax+bx)/2,y+(ay+by)/2,.15],1,[0,0,Math.atan2(by-ay,bx-ax)]);
          }
        } else if(node.kind==='invite') {
          for(const [dx,dy] of [[-1,1],[0,1],[1,1],[-1,0],[1,0],[-1,-1],[0,-1]])box([.065,.065,.03],[x+dx*.095,y+.30+dy*.095,.15],1);
        } else if(node.kind==='check') {
          box([.18,.055,.035],[x-.10,y+.27,.15],1,[0,0,-.65]);
          box([.34,.055,.035],[x+.07,y+.31,.15],1,[0,0,.65]);
        } else {
          for(const dx of [-.23,0,.23])box([.10,.10,.04],[x+dx,y+.30,.15],1);
          box([.42,.035,.03],[x,y+.30,.14],1);
        }
        if(chapter===1 && node.kind==='module') {
          box([w,.10,.10],[x,y+.56,-.20],2);
          box([w-.14,.07,.09],[x,y+.68,-.24],1);
        }
      }
      if(chapter===0) {
        // API/business logic and the workflow engine share a visible integration bus.
        box([.065,1.25,.07],[0,0,-.02],1).name='integration-bus';
        for(const x of [-2.05,0,2.05])add(new THREE.SphereGeometry(.055,12,8),1,[x,0,.02]);
      }
    }
    if(chapter===3){
      // Cloth covers sit below layered paper; the animated leaf is a separate,
      // deformable surface so the open silhouette survives every page turn.
      for(const side of [-1,1]){
        const angle=-side*.235;
        box([2.36,2.80,.075],[side*1.15,.035,.18],2,[0,angle,0]);
        for(let line=0;line<7;line++){
          const lineWidth=line===6?.91:1.49;
          const x=side*(line===6?1.39:1.10);
          box([lineWidth,line===0?.035:.014,.009],[x,.46-line*.19,.55*Math.abs(x)/2.3+.104],line===0?1:2,[0,angle,0]);
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
  const architecture = groups[0].children.map((mesh,index)=>({
    mesh,
    position:mesh.position.clone(),
    rotation:mesh.quaternion.clone(),
    scattered:new THREE.Vector3(Math.cos(index*2.399)*1.65,Math.sin(index*2.399)*1.60,Math.sin(index*1.7)*.95),
    turn:new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.sin(index*1.1)*1.05,Math.cos(index*.8)*.95,Math.sin(index*2.1)*1.4)),
  }));
  let fromOpacity=groups.map(()=>0);
  const built = groups.map(group=>group.children.map(mesh=>mesh.position.clone()));
  let fromBuild = built.map(group=>group.map(position=>position.clone()));
  const smooth=(x:number)=>{const t=THREE.MathUtils.clamp(x,0,1);return t*t*(3-2*t)};
  return {
    groups,
    assemble(progress:number){
      architecture.forEach(({mesh,position,rotation,scattered,turn})=>{
        mesh.position.lerpVectors(scattered,position,progress);
        mesh.quaternion.copy(turn).slerp(rotation,progress);
      });
    },
    show(chapter:number,progress:number,project:ProjectSculpture='selfhost'){
      const selected=chapter===1?(project==='inviteqr'?5:project==='delivery'?6:1):chapter;
      if(selected!==activeChapter){
        fromOpacity=groups.map(group=>(group.userData.palette as THREE.MeshStandardMaterial[])[0].opacity);
        fromBuild=groups.map((group,index)=>group.children.map((mesh,i)=>{
          // Hidden pieces begin just outside their final joints, then settle in
          // order. Interruptions resume from the actual currently visible state.
          if(index===selected && (index<=1 || index>=5) && fromOpacity[index]<.005) {
            mesh.position.copy(built[index][i]);
            mesh.position.y-=index!==0?.40+(i%3)*.13:.18;
            mesh.position.z+=index!==0?.24:0;
          }
          return mesh.position.clone();
        }));
        activeChapter=selected;
      }
      groups.forEach((group,index)=>{
        // Outgoing features dissolve while the connected surface starts folding;
        // incoming features arrive on that same clock, with no abrupt swaps.
        const opacity=index===selected
          ? THREE.MathUtils.lerp(fromOpacity[index],1,smooth((progress-.12)/.76))
          : fromOpacity[index]*(1-smooth(progress/.36));
        group.visible=opacity>.005;
        if(index===selected && (index<=1 || index>=5)) group.children.forEach((mesh,i)=>{
          const delay=index!==0?(i%3)*.06:0;
          mesh.position.lerpVectors(fromBuild[index][i],built[index][i],smooth((progress-.15-delay)/(.72-delay)));
        });
        (group.userData.palette as THREE.MeshStandardMaterial[]).forEach(material=>{material.opacity=opacity;material.depthWrite=opacity>.95});
      });
    },
    dispose(){geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose())},
  };
}



