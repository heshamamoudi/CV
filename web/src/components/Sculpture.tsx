import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { JourneyDto } from "../types";

type Props = { chapter: number; paused: boolean; rtl?: boolean; journey?: JourneyDto[]; technologies?: {category:string;items:string[]}[]; selectedJourneyIndex?: number; selectedProjectIndex?: number; aboutTab?: number };
type Pose = { x:number; y:number; z:number; angle:number; tilt:number; open:number; scale:number };
const rad = Math.PI / 180;
const pose = (x:number,y:number,z:number,angle=0,tilt=0,open=30,scale=1):Pose => ({x,y,z,angle,tilt,open,scale});

function poses(chapter:number, count:number, selected:number, project:number, tab:number, horizontalAtlas=false):Pose[] {
  return Array.from({length:Math.max(12,count)},(_,i)=>{
    if(i>=12&&chapter!==2)return pose(0,0,-.4,0,0,30,.001);
    if (chapter===0) {
      const bank=Math.floor(i/4), step=i%4;
      const [x,y,z,a]=[[-.38,.16,0,60],[0,-.12,.16,-30],[.34,.16,-.08,30]][bank];
      return pose(x+(step-1.5)*.06*Math.cos(a*rad),y+(step-1.5)*.06*Math.sin(a*rad),z+step*.025,a,bank===1?-11:9);
    }
    if (chapter===1) {
      const frame=Math.floor(i/6), side=i%6,w=frame?1.42:1.85,h=frame?.94:1.25;
      const [x,y,a]=[[-w/2,-h/2,0],[0,-h/2,0],[w/2,-h/2,90],[w/2,h/2,90],[0,h/2,180],[-w/2,h/2,180]][side];
      return pose(x+(frame?.36:-.26),y+(frame?-.23:.16),(project%2===frame?.3:-.1)+(frame?.32:-.2),a,side%3===0?18:0,side%3===0?43:28,frame?.86:1);
    }
    if (chapter===2) {
      const n=Math.max(1,count);
      if(i<n){
        if(horizontalAtlas){const x=(i-(n-1)/2)*.34,y=Math.sin(i*.72)*.06;return pose(x,y,.025*Math.cos(i*.65)+(i===selected?.20:0),i%2?10:-10,2,i===selected?64:25,i===selected?1.15:1)}
        const rank=n-1-i,step=n===1?0:-1.85+rank*3.7/(n-1);
        return pose(.24*Math.sin(rank*.9),step,i===selected?.23:.04,i===selected?40:70+(i%2?9:-9),2,i===selected?58:25,i===selected?1.15:1);
      }
      const k=i-n;return horizontalAtlas?pose(0,-.28-k*.08,-.18-k*.025,0,35,27,.7):pose((k-(11-n)/2)*.18,-2.05,-.18-k*.025,0,35,27,.7);
    }
    if (chapter===3){const a=i*30*rad;return pose(Math.cos(a)*1.12,Math.sin(a)*1.12,i%2?.1:-.1,i*30+90,i%2?18:-18,30+(i%3===tab?9:-3),.8)}
    const bank=Math.floor(i/6),step=i%6,sign=bank?1:-1;
    return pose(sign*(.12+step*.25),-.23+Math.sin(step/5*Math.PI)*.42,step*.025,sign*(15+step*4),sign*35,34,.91);
  });
}

/** A persistent 24-facet Fold which follows a measured chapter stage. */
export function Sculpture(props:Props) {
  const host=useRef<HTMLDivElement>(null), current=useRef(props);
  current.current=props;
  const [fallback,setFallback]=useState(false);
  useEffect(()=>{
    const el=host.current;if(!el)return;
    const anchor=el.parentElement?.querySelector<HTMLElement>("[data-scene-anchor]");
    const place=()=>{if(!anchor)return;const r=anchor.getBoundingClientRect(),p=el.parentElement!.getBoundingClientRect();Object.assign(el.style,{left:`${r.left-p.left}px`,top:`${r.top-p.top}px`,width:`${r.width}px`,height:`${r.height}px`})};
    place();const observer=new ResizeObserver(place);if(anchor)observer.observe(anchor);observer.observe(el.parentElement!);window.addEventListener("resize",place);
    return()=>{observer.disconnect();window.removeEventListener("resize",place)};
  },[props.chapter]);
  useEffect(()=>{
    const el=host.current;if(!el)return;
    let renderer:THREE.WebGLRenderer;
    try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:"low-power"})}catch{setFallback(true);return}
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;el.appendChild(renderer.domElement);
    const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-3,3,3,-3,.01,100);
    camera.position.z=14;scene.add(new THREE.AmbientLight(0xe8f6ee,2.2));
    const key=new THREE.DirectionalLight(0xffffff,3.8);key.position.set(-3,6,9);scene.add(key);
    const fill=new THREE.DirectionalLight(0x84bdc0,1.4);fill.position.set(5,-3,4);scene.add(fill);
    const idle=new THREE.Group(),root=new THREE.Group();scene.add(idle);idle.add(root);
    const mats=[0xd8e5de,0x315852,0xd89169].map((color,i)=>new THREE.MeshStandardMaterial({color,metalness:.4,roughness:i===2?.38:.43,side:THREE.DoubleSide,emissive:i===2?0x2b1005:0}));
    const shape=new THREE.Shape();shape.moveTo(-.62,-.24);shape.lineTo(.47,-.24);shape.lineTo(.62,.24);shape.lineTo(-.47,.24);shape.closePath();
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:true,bevelSize:.015,bevelThickness:.012,bevelSegments:1,steps:1,curveSegments:1});geometry.translate(0,0,-.0175);
    const leaves=Array.from({length:Math.max(12,props.journey?.length??0)},(_,i)=>{const bank=Math.floor(i/4),baseMaterial=mats[i===11?2:bank===1?1:0],flapMaterial=mats[bank===0?1:0],group=new THREE.Group(),base=new THREE.Mesh(geometry,baseMaterial),flap=new THREE.Group(),other=new THREE.Mesh(geometry,flapMaterial);base.position.y=.24;other.position.y=-.24;flap.add(other);group.add(base);group.add(flap);root.add(group);return{group,flap,base,other,baseMaterial,flapMaterial}});
    const spineGeometry=new THREE.BufferGeometry(),spineMaterial=new THREE.LineBasicMaterial({color:0xd89169,transparent:true,opacity:.58}),spine=new THREE.LineSegments(spineGeometry,spineMaterial);scene.add(spine);
    const traveler=new THREE.Mesh(new THREE.OctahedronGeometry(.14,0),mats[2]);scene.add(traveler);
    const box=new THREE.Box3(),center=new THREE.Vector3(),size=new THREE.Vector3();
    let width=1,height=1,last=performance.now(),frame=0,phase=0,prior="",transitionAt=performance.now(),travelerStarted=performance.now();
    let from=poses(0,1,0,0,0),to=from;
    const fromRotation=new THREE.Quaternion(),toRotation=new THREE.Quaternion();
    const travelerFrom=new THREE.Vector3(),travelerTo=new THREE.Vector3();
    const resize=()=>{width=Math.max(1,el.clientWidth);height=Math.max(1,el.clientHeight);renderer.setSize(width,height,false)};
    const observer=new ResizeObserver(resize);observer.observe(el);resize();
    const pointer=new THREE.Vector2(),move=(e:PointerEvent)=>{if(e.pointerType!=="touch")pointer.set((e.clientX/innerWidth-.5)*2,(e.clientY/innerHeight-.5)*2)};
    window.addEventListener("pointermove",move,{passive:true});
    const lost=(e:Event)=>{e.preventDefault();setFallback(true)};renderer.domElement.addEventListener("webglcontextlost",lost);
    const update=(now:number)=>{
      frame=requestAnimationFrame(update);const dt=Math.max(0,Math.min((now-last)/1000,.05));last=now;
      if(document.hidden||!el.clientWidth||!el.clientHeight)return;
      const {chapter,paused,journey,selectedJourneyIndex,selectedProjectIndex,aboutTab}=current.current;
      const selected=Math.max(0,selectedJourneyIndex??0),count=journey?.length??1,horizontalAtlas=chapter===2&&width>height,id=`${chapter}:${count}:${selected}:${selectedProjectIndex??0}:${aboutTab??0}:${horizontalAtlas}`;
      if(id!==prior){
        from=leaves.map(({group,flap})=>pose(group.position.x,group.position.y,group.position.z,group.rotation.z/rad,group.rotation.y/rad,flap.rotation.x/rad,group.scale.x));
        to=poses(chapter,count,selected,selectedProjectIndex??0,aboutTab??0,horizontalAtlas);fromRotation.copy(root.quaternion);
        toRotation.setFromEuler(new THREE.Euler(chapter===0?12*rad:0,chapter===0?-18*rad:0,0));transitionAt=now;prior=id;
        leaves.forEach((leaf,i)=>{leaf.base.material=chapter===2?(i===selected||![2,5,8].includes(i)?mats[0]:mats[1]):leaf.baseMaterial;leaf.other.material=chapter===2&&i===selected?mats[2]:chapter===2?mats[0]:leaf.flapMaterial});
        if(chapter===2){travelerFrom.copy(traveler.position);const station=to[Math.min(selected,Math.max(1,count)-1)];travelerTo.set(station.x,station.y,.34);travelerStarted=now}
        const points:number[]=[];if(chapter===2)for(let i=0;i<count-1;i++){const a=to[i],b=to[i+1],dx=b.x-a.x,dy=b.y-a.y,length=Math.max(.001,Math.hypot(dx,dy)),ox=-dy/length*.035,oy=dx/length*.035;points.push(a.x+ox,a.y+oy,.52,b.x+ox,b.y+oy,.52,a.x-ox,a.y-oy,.52,b.x-ox,b.y-oy,.52,a.x+ox,a.y+oy,.52,a.x-ox,a.y-oy,.52,b.x+ox,b.y+oy,.52,b.x-ox,b.y-oy,.52)}
        spineGeometry.setAttribute("position",new THREE.Float32BufferAttribute(points,3));
      }
      if(!paused)phase+=dt;
      const raw=paused?1:Math.min(1,Math.max(0,(now-transitionAt)/850)),ease=raw*raw*(3-2*raw);
      leaves.forEach(({group,flap},i)=>{
        const f=from[i],t=to[i],s=paused?1:Math.min(1,Math.max(0,(now-transitionAt-i*14)/750)),e=s*s*(3-2*s);
        group.position.set(THREE.MathUtils.lerp(f.x,t.x,e),THREE.MathUtils.lerp(f.y,t.y,e),THREE.MathUtils.lerp(f.z,t.z,e));
        group.rotation.set(0,THREE.MathUtils.lerp(f.tilt,t.tilt,e)*rad,THREE.MathUtils.lerp(f.angle,t.angle,e)*rad);
        group.scale.setScalar(THREE.MathUtils.lerp(f.scale,t.scale,e));flap.rotation.x=THREE.MathUtils.lerp(f.open,t.open,e)*rad;
      });
      root.quaternion.copy(fromRotation).slerp(toRotation,ease);
      if(!paused){idle.rotation.set(pointer.y*2*rad,THREE.MathUtils.clamp(Math.sin(phase*.42)*2*rad+pointer.x*2*rad,-4*rad,4*rad),0);root.position.y=Math.sin(phase*.6)*.025}else{idle.rotation.set(0,0,0);root.position.y=0}
      spine.visible=chapter===2;traveler.visible=chapter===2;
      if(chapter===2){const travel=paused?1:Math.min(1,(now-travelerStarted)/450),e=travel*travel*(3-2*travel);traveler.position.lerpVectors(travelerFrom,travelerTo,e);traveler.position.z=.58}
      box.setFromObject(idle);if(spine.visible)box.expandByObject(spine);if(traveler.visible)box.expandByObject(traveler);box.getCenter(center);box.getSize(size);
      const aspect=width/height,visibleHeight=Math.max(size.y,size.x/aspect,1.5)*1.25;
      camera.left=-visibleHeight*aspect/2;camera.right=-camera.left;camera.top=visibleHeight/2;camera.bottom=-camera.top;
      camera.position.set(center.x,center.y,center.z+14);camera.lookAt(center);camera.updateProjectionMatrix();renderer.render(scene,camera);
    };
    frame=requestAnimationFrame(update);
    return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener("pointermove",move);renderer.domElement.removeEventListener("webglcontextlost",lost);geometry.dispose();spineGeometry.dispose();spineMaterial.dispose();mats.forEach(m=>m.dispose());traveler.geometry.dispose();renderer.dispose();renderer.domElement.remove()};
  },[]);
  return <div ref={host} className={`sculpture${fallback?" sculpture-fallback":""}`} aria-hidden="true">{fallback&&<svg viewBox="0 0 400 400" role="presentation"><path d="M60 270 170 70h110L170 270Z" fill="#d8e5de"/><path d="m170 270 55-95 115 95-55 90Z" fill="#315852"/><path d="m225 175 55-95 70 46-55 95Z" fill="#d89169"/></svg>}</div>;
}

