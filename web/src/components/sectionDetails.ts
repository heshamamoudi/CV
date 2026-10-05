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
      group.name='solution-bridge';
      // Three independently grounded inputs meet one continuous load-bearing span.
      for(const x of [-1.94,1.94]) box([1.38,.18,2.50],[x,-1.53,0],2).name='foundation';
      for(const [i,z] of [-.82,0,.82].entries()) {
        box([.66,1.08,.49],[-1.93,-.89,z],0).name=`input-pier-${i+1}`;
        box([.82,.12,.61],[-1.93,-.30,z],1);
      }
      box([.85,1.08,1.86],[1.92,-.89,0],0).name='unified-support';
      box([4.90,.18,2.26],[0,-.23,0],0).name='solution-span';
      // Visible copper circulation collects the separate input lanes at a junction.
      for(const z of [-.82,0,.82]) {
        const curve=new THREE.CatmullRomCurve3([
          new THREE.Vector3(-2.48,-.10,z),new THREE.Vector3(-1.38,-.10,z),
          new THREE.Vector3(-.45,-.10,z*.45),new THREE.Vector3(.26,-.10,0),
        ]);
        add(new THREE.TubeGeometry(curve,20,.043,6,false),1).name='input-route';
      }
      box([2.20,.085,.14],[1.32,-.10,0],1).name='resolved-route';
      box([.28,.14,.32],[.27,-.09,0],1).name='junction';
      // One small keystone emphasizes the resolved load path at the crown.
      box([.42,.21,.60],[0,1.84,0],1).name='keystone';
    }
    if(chapter===1){
      group.name='constructive-assembly';
      box([5.04,.22,2.04],[-.055,-1.60,-.27],2).name='build-foundation';
      // Three substantial volumes rise from the same foundation. Open joints show
      // how a useful whole is built; no screen, keyboard, hinge or display frame.
      for(let i=0;i<3;i++) {
        const x=-1.585+i*1.53, height=.84+i*1.11;
        box([1.28,height,1.18],[x,-1.46+height/2,-.58],i===1?2:0).name=`building-block-${i+1}`;
        box([1.40,.12,1.30],[x,-1.40+height,-.58],1).name=`joining-beam-${i+1}`;
        // Narrow recessed joints convey assembled material rather than a solid chart.
        for(let course=1;course<=i;course++)box([1.29,.032,1.19],[x,-1.46+course*1.02,-.58],2).name='construction-joint';
      }
      // A single copper route climbs the completed steps, connecting effort to output.
      box([.08,1.13,.08],[-.82,.10,.18],1);
      box([.08,1.13,.08],[.71,1.20,.18],1);
      for(const [x,y] of [[-1.585,-.46],[-.055,.65],[1.475,1.76]])box([1.48,.08,.08],[x,y,.18],1);
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
    show(chapter:number,progress:number){
      if(chapter!==activeChapter){
        fromOpacity=groups.map(group=>(group.userData.palette as THREE.MeshStandardMaterial[])[0].opacity);
        fromBuild=groups.map((group,index)=>group.children.map((mesh,i)=>{
          // Hidden pieces begin just outside their final joints, then settle in
          // order. Interruptions resume from the actual currently visible state.
          if(index===chapter && index<=1 && fromOpacity[index]<.005) {
            mesh.position.copy(built[index][i]);
            mesh.position.y-=index===1?.40+(i%3)*.13:.18;
            mesh.position.z+=index===1?.24:0;
          }
          return mesh.position.clone();
        }));
        activeChapter=chapter;
      }
      groups.forEach((group,index)=>{
        // Outgoing features dissolve while the connected surface starts folding;
        // incoming features arrive on that same clock, with no abrupt swaps.
        const opacity=index===chapter
          ? THREE.MathUtils.lerp(fromOpacity[index],1,smooth((progress-.12)/.76))
          : fromOpacity[index]*(1-smooth(progress/.36));
        group.visible=opacity>.005;
        if(index===chapter && index<=1) group.children.forEach((mesh,i)=>{
          const delay=index===1?(i%3)*.06:0;
          mesh.position.lerpVectors(fromBuild[index][i],built[index][i],smooth((progress-.15-delay)/(.72-delay)));
        });
        (group.userData.palette as THREE.MeshStandardMaterial[]).forEach(material=>{material.opacity=opacity;material.depthWrite=opacity>.95});
      });
    },
    dispose(){geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose())},
  };
}



