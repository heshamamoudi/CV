import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { architectureRoutes } from './softwareArchitecture';

const smooth = (value:number) => THREE.MathUtils.smoothstep(value,0,1);
const point = (x:number,y:number,z=.18) => new THREE.Vector3(x,y,z);

/** A page is bent around its binding, rather than rotated as a rigid rectangle. */
export function bookPagePoint(u:number,v:number,turn:number,out=new THREE.Vector3()) {
  const angle=turn*Math.PI, x=u*2.20*Math.cos(angle);
  const curl=Math.sin(Math.PI*u)*Math.sin(angle)*.30;
  return out.set(x,(v-.5)*2.48+curl*.16,.15+Math.abs(x)*.24+Math.sin(angle)*u*1.48+curl);
}

/** Local motion belongs to the object, and shares its section and pause clocks. */
export function sculptureMotion() {
  const groups=Array.from({length:5},()=>new THREE.Group());
  const geometries:THREE.BufferGeometry[]=[];
  const materials:THREE.Material[]=[];
  const faded=new Map<THREE.Material,number>();
  const basic=(color:number,opacity=1)=>{
    const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false});
    materials.push(material);faded.set(material,opacity);return material;
  };
  const surface=(color:number)=>{
    const material=new THREE.MeshStandardMaterial({color,roughness:.52,metalness:.12,side:THREE.DoubleSide,transparent:true});
    materials.push(material);faded.set(material,1);return material;
  };
  const mesh=(parent:THREE.Object3D,geometry:THREE.BufferGeometry,material:THREE.Material)=>{
    geometries.push(geometry);const item=new THREE.Mesh(geometry,material);parent.add(item);return item;
  };
  const box=(parent:THREE.Object3D,size:[number,number,number],position:[number,number,number],material:THREE.Material)=>{
    const item=mesh(parent,new RoundedBoxGeometry(...size,2,Math.min(.035,Math.min(...size)*.2)),material);
    item.position.set(...position);return item;
  };
  const line=(parent:THREE.Object3D,points:THREE.Vector3[],color:number,opacity:number)=>{
    const geometry=new THREE.BufferGeometry().setFromPoints(points);geometries.push(geometry);
    const material=new THREE.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false});materials.push(material);faded.set(material,opacity);
    const item=new THREE.Line(geometry,material);parent.add(item);return item;
  };

  // Several dependencies converge onto one readable bus. Copper packets continue
  // through it after arrival; the system has a working state, not a frozen end pose.
  const topology=groups[0];topology.name='living-topology';
  const routes=architectureRoutes;
  const connections=routes.map((route,index)=>{
    const curve=new THREE.CatmullRomCurve3(route.map(([x,y,z])=>point(x,y,z)),false,'centripetal',.12);
    const clean=curve.getPoints(48);
    const tangled=clean.map((p,i)=>{
      const t=i/48;
      return point(p.x+Math.sin(t*Math.PI*3+index*1.8)*.72,p.y+Math.sin(t*Math.PI*4+index)*.80,Math.sin(t*Math.PI*3+index)*.65);
    });
    const wire=line(topology,clean,index<3?0x82b5a5:0xf5d2ae,index<3?.65:.7);
    const packet=mesh(topology,new THREE.SphereGeometry(.042,12,8),basic(0xffd0a0));
    const tail=Array.from({length:3},(_,i)=>mesh(topology,new THREE.SphereGeometry(.026-i*.005,8,6),basic(0xe3b07c,.40-i*.1)));
    return {wire,clean,tangled,packet,tail};
  });
  const indicators=[1.63,.22,-1.20].map(y=>{
    const status=mesh(topology,new THREE.SphereGeometry(.04,12,8),basic(0xb8ffe0));status.position.set(1.23,y,-.48);
    const halo=mesh(topology,new THREE.RingGeometry(.065,.08,24),basic(0x98e0c3,.45));halo.position.copy(status.position);halo.rotation.x=-Math.PI/2;halo.position.y+=.012;
    return {status,halo};
  });

  const book=groups[3];book.name='living-book';
  const paper=surface(0xf1edda),copper=basic(0xd9a06c,.92);
  // Fine page edges and a projecting ribbon give the book physical thickness.
  for(const side of [-1,1])for(let i=0;i<5;i++) {
    const edge=line(book,[point(side*.10,-1.30,.105-i*.014),point(side*2.25,-1.30,.645-i*.014)],0xe6dec8,.60);
    edge.name='paper-edge';
  }
  box(book,[.16,.52,.022],[1.56,-1.42,.52],copper).rotation.y=-.235;
  // An editorial diagram on the left page, away from the page's text rules.
  const diagram=[point(-1.76,.83,.585),point(-1.12,.83,.43),point(-.48,.83,.28)];
  line(book,diagram,0xb77d4f,.9);
  diagram.forEach(p=>{const dot=mesh(book,new THREE.SphereGeometry(.052,12,8),copper);dot.position.copy(p);});
  const pageGeometry=new THREE.PlaneGeometry(1,1,28,12);pageGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(29*13*3),3).setUsage(THREE.DynamicDrawUsage));
  const leaf=mesh(book,pageGeometry,paper);leaf.name='turning-page';
  const pageRules=Array.from({length:7},(_,i)=>line(book,Array.from({length:21},()=>new THREE.Vector3()),i===0?0xb77d4f:0x35564d,i===0?.85:.48));
  const pagePoint=new THREE.Vector3();
  let lastTurn=-1;
  const turnPage=(turn:number)=>{
    if(turn===lastTurn)return;lastTurn=turn;
    const positions=pageGeometry.getAttribute('position') as THREE.BufferAttribute;
    for(let iy=0;iy<=12;iy++)for(let ix=0;ix<=28;ix++) {
      bookPagePoint(ix/28,iy/12,turn,pagePoint);positions.setXYZ(iy*29+ix,pagePoint.x,pagePoint.y,pagePoint.z);
    }
    positions.needsUpdate=true;pageGeometry.computeVertexNormals();pageGeometry.computeBoundingSphere();
    pageRules.forEach((rule,index)=>{
      const values=rule.geometry.getAttribute('position') as THREE.BufferAttribute;
      for(let i=0;i<=20;i++){
        bookPagePoint(.16+i/20*(index===6?.43:.68),.78-index*.083,turn,pagePoint);
        // Offset toward the viewer, including when the leaf turns over.
        values.setXYZ(i,pagePoint.x,pagePoint.y,pagePoint.z+.012);
      }
      values.needsUpdate=true;rule.geometry.computeBoundingSphere();
    });
  };
  turnPage(0);

  const envelope=groups[4];envelope.name='living-message';
  const note=new THREE.Group();note.name='written-note';envelope.add(note);
  box(note,[3.08,2.22,.042],[0,0,-.055],surface(0xf1eddf));
  const noteInk=basic(0x35564d,.72),noteAccent=basic(0xb77d4f,.95);
  box(note,[.32,.06,.008],[-1.03,.79,-.029],noteAccent);
  for(let i=0;i<5;i++)box(note,[i===4?1.22:2.36,.025,.009],[i===4?-.57:0,.49-i*.22,-.028],noteInk);
  const seal=mesh(envelope,new THREE.CylinderGeometry(.17,.17,.045,32),surface(0xbe8452));
  seal.rotation.x=Math.PI/2;seal.position.set(0,-.38,.20);
  const trails=Array.from({length:3},(_,i)=>{
    const ring=mesh(envelope,new THREE.RingGeometry(.15,.164,48),basic(0xe2b28d,.35));
    ring.position.set(1.54,1.46,.18);ring.name=`message-ripple-${i}`;return ring;
  });
  let active=-1;
  let previousResolve=-1;
  let from=groups.map(()=>0),opacity=groups.map(()=>0);
  const position=new THREE.Vector3();
  const sample=(connection:typeof connections[number],fraction:number,out:THREE.Vector3)=>{
    const values=connection.wire.geometry.getAttribute('position');
    const index=((fraction%1)+1)%1*48,a=Math.floor(index),b=Math.min(48,a+1);
    out.fromBufferAttribute(values,a);return out.lerp(position.fromBufferAttribute(values,b),index-a);
  };
  return {
    groups,
    update(chapter:number,progress:number,time:number,paused:boolean,resolve=1,tab=0){
      if(chapter!==active){from=opacity.slice();active=chapter;}
      groups.forEach((group,index)=>{
        opacity[index]=index===chapter?THREE.MathUtils.lerp(from[index],1,smooth((progress-.20)/.65)):from[index]*(1-smooth(progress/.28));
        group.visible=opacity[index]>.005;
        group.traverse(object=>{
          if(object instanceof THREE.Mesh || object instanceof THREE.Line){
            const material=object.material as THREE.Material & {opacity:number};
            material.opacity=(faded.get(material)??1)*opacity[index];
          }
        });
      });
      if(topology.visible){
        connections.forEach((connection,index)=>{
          if(resolve!==previousResolve){
            const values=connection.wire.geometry.getAttribute('position') as THREE.BufferAttribute;
            for(let i=0;i<=48;i++){
              position.lerpVectors(connection.tangled[i],connection.clean[i],resolve);values.setXYZ(i,position.x,position.y,position.z);
            }
            values.needsUpdate=true;connection.wire.geometry.computeBoundingSphere();
          }
          const at=(paused?0:time)*.14+index*.137;
          sample(connection,at,connection.packet.position);
          connection.tail.forEach((item,i)=>sample(connection,at-(i+1)*.012,item.position));
        });
        previousResolve=resolve;
        indicators.forEach(({status,halo},i)=>{
          const beat=paused?.55:(Math.sin(time*1.8-i*.78)+1)/2;
          halo.scale.setScalar(1+beat*.7);(halo.material as THREE.MeshBasicMaterial).opacity=opacity[0]*(.18+beat*.28)*resolve;
          (status.material as THREE.MeshBasicMaterial).opacity=opacity[0]*resolve;
        });
      }
      if(book.visible){
        const cycle=(time+tab*1.45)%8.8;
        const turn=paused?0:smooth((cycle-2.8)/3.25);
        turnPage(turn);
        const visibility=paused?1:1-smooth((cycle-6.25)/.6);
        (leaf.material as THREE.MeshStandardMaterial).opacity=opacity[3]*visibility;
        pageRules.forEach(rule=>{rule.material.opacity=(faded.get(rule.material)??1)*opacity[3]*visibility;});
      }
      if(envelope.visible){
        note.position.y=paused?.84:.84+Math.sin(time*.78)*.18;
        note.rotation.z=paused?-.035:-.035+Math.sin(time*.55)*.022;
        trails.forEach((ring,i)=>{
          const cycle=paused?.28:((time*.24+i/3)%1);
          ring.scale.setScalar(1+cycle*3.8);
          (ring.material as THREE.MeshBasicMaterial).opacity=opacity[4]*(paused?.16:Math.sin(cycle*Math.PI)*.28);
        });
      }
    },
    dispose(){geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());},
  };
}
