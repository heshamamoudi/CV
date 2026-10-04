import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { JourneyDto } from "../types";
import { SECTIONS, sculptureForm, sculptureGeometry } from "./sculptureGeometry";
import { sectionDetails } from "./sectionDetails";
import { CHAPTER_TRAVEL_MS } from "./useChapterTransition";

type Props = { chapter:number; paused:boolean; rtl?:boolean; journey?:JourneyDto[]; technologies?:{category:string;items:string[]}[]; selectedJourneyIndex?:number; selectedProjectIndex?:number; aboutTab?:number };
const ease=(t:number)=>t*t*t*(t*(t*6-15)+10);

/** One continuous object; only its fold, orientation and aperture change. */
export function Sculpture(props:Props) {
  const host=useRef<HTMLDivElement>(null),current=useRef(props);
  current.current=props;
  const [fallback,setFallback]=useState(false);
  useEffect(()=>{
    const el=host.current,parent=el?.parentElement;if(!el||!parent)return;
    let renderer:THREE.WebGLRenderer;
    try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:"low-power"})}catch{setFallback(true);return}
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.90;el.appendChild(renderer.domElement);
    const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-3,3,3,-3,.1,4000);
    const studio=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromScene(studio,.04);
    scene.environment=environment.texture;scene.environmentIntensity=.85;studio.dispose();pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xeaf5f0,0x173139,.6));
    const key=new THREE.DirectionalLight(0xfff2df,1.8);key.position.set(-3,5,7);scene.add(key);
    const rim=new THREE.DirectionalLight(0xc6f7ee,1.5);rim.position.set(5,1,-3);scene.add(rim);
    const materials=[
      new THREE.MeshPhysicalMaterial({color:0xbfcfc5,metalness:.68,roughness:.28,clearcoat:.28,clearcoatRoughness:.34}),
      new THREE.MeshPhysicalMaterial({color:0xb96b44,metalness:.68,roughness:.27,clearcoat:.20}),
      new THREE.MeshStandardMaterial({color:0x244c49,metalness:.4,roughness:.37}),
      new THREE.MeshStandardMaterial({color:0xb96b44,metalness:.68,roughness:.27}),
    ];
    const idle=new THREE.Group(),root=new THREE.Group();scene.add(root);root.add(idle);
    const details=sectionDetails(materials);details.groups.forEach(group=>idle.add(group));
    let width=Math.max(1,parent.clientWidth),height=Math.max(1,parent.clientHeight);
    const measureStage=()=>{
      const anchor=parent.querySelector<HTMLElement>("[data-scene-anchor]");
      if(!anchor)return null;
      const r=anchor.getBoundingClientRect(),p=parent.getBoundingClientRect();
      return {x:r.left-p.left,y:r.top-p.top,width:Math.max(1,r.width),height:Math.max(1,r.height),anchor};
    };
    let stage=measureStage();
    if(!stage){details.dispose();renderer.dispose();renderer.domElement.remove();environment.dispose();materials.forEach(material=>material.dispose());return;}
    let stageFrom={...stage},stageTarget={...stage};
    let target=sculptureForm(current.current.chapter,stage.height>stage.width*1.15,current.current.aboutTab);
    const geometry=sculptureGeometry(target.positions),mesh=new THREE.Mesh(geometry,materials);idle.add(mesh);root.quaternion.copy(target.rotation);
    const positions=geometry.getAttribute("position") as THREE.BufferAttribute;
    let fromPositions=new Float32Array(positions.array);
    const fromRotation=root.quaternion.clone(),center=target.center.clone(),fromCenter=center.clone();
    const fit=()=>Math.max(target.bounds.y,target.bounds.x/(stageTarget.width/stageTarget.height))*(current.current.chapter===1?1.10:1.32);
    let scale=stage.height/fit(),fromScale=scale,toScale=scale;
    let previous="",started=performance.now(),frame=0,last=performance.now(),phase=0,stopped=false,disposed=false,geometrySettled=false;
    const resize=()=>{width=Math.max(1,parent.clientWidth);height=Math.max(1,parent.clientHeight);renderer.setSize(width,height,false)};
    const observer=new ResizeObserver(resize);observer.observe(parent);resize();
    const pointer=new THREE.Vector2(),softPointer=new THREE.Vector2();
    const move=(event:PointerEvent)=>{if(event.pointerType==="touch")return;const r=el.getBoundingClientRect();pointer.set(THREE.MathUtils.clamp((event.clientX-r.left)/r.width-.5,-.5,.5),THREE.MathUtils.clamp((event.clientY-r.top)/r.height-.5,-.5,.5))};
    window.addEventListener("pointermove",move,{passive:true});
    const routeGeometry=new THREE.BufferGeometry(),routeMaterial=new THREE.LineBasicMaterial({color:0xb96b44,transparent:true,opacity:0});
    const route=new THREE.Line(routeGeometry,routeMaterial);idle.add(route);
    const markerMaterial=new THREE.MeshStandardMaterial({color:0xd9956d,metalness:.6,roughness:.25,transparent:true,opacity:0});
    const marker=new THREE.Mesh(new THREE.SphereGeometry(.072,16,10),markerMaterial);idle.add(marker);
    const stationGeometry=new THREE.SphereGeometry(.031,10,6),stationMaterial=new THREE.MeshBasicMaterial({color:0x315852,transparent:true,opacity:0});
    const stations:THREE.Mesh[]=[];
    let selectedAt=0,selectedTarget=0,selectedFrom=0,selectionStarted=performance.now(),previousSelection=-1,routeOpacity=0;
    const sampleSurface=(t:number,out:THREE.Vector3)=>{
      const index=THREE.MathUtils.clamp(t,0,1)*SECTIONS,a=Math.floor(index),b=Math.min(SECTIONS,a+1);
      return out.lerpVectors(target.surface[a],target.surface[b],index-a);
    };
    const dispose=()=>{
      if(disposed)return;disposed=true;observer.disconnect();window.removeEventListener("pointermove",move);renderer.domElement.removeEventListener("webglcontextlost",lost);
      geometry.dispose();details.dispose();materials.forEach(material=>material.dispose());environment.dispose();
      routeGeometry.dispose();routeMaterial.dispose();marker.geometry.dispose();markerMaterial.dispose();stationGeometry.dispose();stationMaterial.dispose();
      renderer.dispose();renderer.domElement.remove();
    };
    const lost=(event:Event)=>{event.preventDefault();stopped=true;cancelAnimationFrame(frame);setFallback(true);dispose()};
    renderer.domElement.addEventListener("webglcontextlost",lost);
    const update=(now:number)=>{
      if(stopped)return;frame=requestAnimationFrame(update);
      const dt=Math.min((now-last)/1000,.05);last=now;if(document.hidden)return;
      const {chapter,paused,journey,selectedJourneyIndex=0,aboutTab=0}=current.current;
      const measured=measureStage();if(!measured){el.style.display="none";return;}el.style.display="block";
      const portrait=measured.height>measured.width*1.15,id=`${chapter}:${portrait}:${aboutTab}`;
      if(previous!==id){
        geometrySettled=false;
        const first=previous==="";
        fromPositions=new Float32Array(positions.array);fromRotation.copy(root.quaternion);fromCenter.copy(center);fromScale=scale;
        stageFrom={...stage!};stageTarget={...measured};
        target=sculptureForm(chapter,portrait,aboutTab);toScale=stageTarget.height/fit();started=now;
        if(first){fromScale=toScale;scale=toScale;fromCenter.copy(target.center);center.copy(target.center);stageFrom={...measured};stage={...measured}}
        previous=id;materials[3].visible=!target.closed;
        if(first)started=now-CHAPTER_TRAVEL_MS;
        if(chapter===2){
          routeGeometry.setFromPoints(target.surface);
          while(stations.length<(journey?.length??0)){const station=new THREE.Mesh(stationGeometry,stationMaterial);stations.push(station);idle.add(station)}
          stations.forEach((station,i)=>{station.visible=i<(journey?.length??0);sampleSurface(.94-.88*i/Math.max(1,(journey?.length??1)-1),station.position)});
        }
      }
      const raw=paused?1:Math.min(1,(now-started)/CHAPTER_TRAVEL_MS),t=ease(raw);
      details.show(chapter,t);
      if(!geometrySettled){
        for(let i=0;i<target.positions.length;i++)positions.array[i]=THREE.MathUtils.lerp(fromPositions[i],target.positions[i],t);
        positions.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
      if(target.closed){
        const normals=geometry.getAttribute("normal") as THREE.BufferAttribute;
        for(let j=0;j<8;j++){
          const end=SECTIONS*8+j,n=new THREE.Vector3(normals.getX(j)+normals.getX(end),normals.getY(j)+normals.getY(end),normals.getZ(j)+normals.getZ(end)).normalize();
          normals.setXYZ(j,n.x,n.y,n.z);normals.setXYZ(end,n.x,n.y,n.z);
        }
        normals.needsUpdate=true;
      }
      geometrySettled=raw===1;
      }
      // Position, scale, orientation and vertices share exactly one clock and easing.
      // A full-size canvas keeps the outgoing form visible throughout its travel.
      stageTarget={...measured};
      toScale=stageTarget.height/fit();
      stage={...measured,x:THREE.MathUtils.lerp(stageFrom.x,stageTarget.x,t),y:THREE.MathUtils.lerp(stageFrom.y,stageTarget.y,t),width:THREE.MathUtils.lerp(stageFrom.width,stageTarget.width,t),height:THREE.MathUtils.lerp(stageFrom.height,stageTarget.height,t)};
      root.quaternion.copy(fromRotation).slerp(target.rotation,t);center.lerpVectors(fromCenter,target.center,t);scale=raw<1?THREE.MathUtils.lerp(fromScale,toScale,t):paused?toScale:THREE.MathUtils.damp(scale,toScale,12,dt);
      root.scale.setScalar(scale);root.position.set(stage.x+stage.width/2-width/2-center.x*scale,height/2-stage.y-stage.height/2-center.y*scale,0);
      if(!paused)phase+=dt;
      softPointer.lerp(pointer,1-Math.exp(-dt*3));
      const stillness=paused?0:ease(Math.max(0,(raw-.65)/.35));
      idle.rotation.set(softPointer.y*.022*stillness,(Math.sin(phase*.32)*.012+softPointer.x*.032)*stillness,0);idle.position.y=Math.sin(phase*.55)*.012*stillness;
      const selection=Math.max(0,Math.min((journey?.length??1)-1,selectedJourneyIndex));
      if(selection!==previousSelection){selectedFrom=selectedAt;selectedTarget=.94-.88*selection/Math.max(1,(journey?.length??1)-1);selectionStarted=now;previousSelection=selection}
      selectedAt=THREE.MathUtils.lerp(selectedFrom,selectedTarget,ease(paused?1:Math.min(1,(now-selectionStarted)/550)));
      if(chapter===2)sampleSurface(selectedAt,marker.position);
      const desiredOpacity=chapter===2?(raw>.65?(raw-.65)/.35:0):0;
      routeOpacity=chapter!==2?0:paused?desiredOpacity:THREE.MathUtils.damp(routeOpacity,desiredOpacity,8,dt);
      routeMaterial.opacity=routeOpacity*.85;markerMaterial.opacity=routeOpacity;stationMaterial.opacity=routeOpacity*.85;
      route.visible=marker.visible=routeOpacity>.005;stations.forEach((station,i)=>{station.visible=routeOpacity>.005&&i<(journey?.length??0)});
      camera.left=-width/2;camera.right=width/2;camera.top=height/2;camera.bottom=-height/2;
      camera.position.set(0,0,2000);camera.lookAt(0,0,0);camera.updateProjectionMatrix();
      // Clip only at the reading area's edges, never to the arriving object's box.
      const panel=measured.anchor.closest<HTMLElement>(".chapter-panel"),parentRect=parent.getBoundingClientRect();
      if(panel){const r=panel.getBoundingClientRect();el.style.clipPath=`inset(${Math.max(0,r.top-parentRect.top)}px 0 ${Math.max(0,parentRect.bottom-r.bottom)}px 0)`;}else el.style.clipPath="none";
      renderer.render(scene,camera);
      if(chapter===2){
        const point=new THREE.Vector3();
        measured.anchor.querySelectorAll<HTMLElement>("[data-route-station]").forEach(label=>{
          const i=Number(label.dataset.routeStation);
          sampleSurface(.94-.88*i/Math.max(1,(journey?.length??1)-1),point);idle.localToWorld(point);point.project(camera);
          label.style.left=`${(point.x+1)*width/2-measured.x}px`;label.style.top=`${(1-point.y)*height/2-measured.y}px`;label.style.opacity=String(THREE.MathUtils.smoothstep(raw,.72,1));
        });
      }
    };
    frame=requestAnimationFrame(update);
    return()=>{stopped=true;cancelAnimationFrame(frame);dispose()};
  },[]);
  return <div ref={host} className={`sculpture${fallback?" sculpture-fallback":""}`} aria-hidden="true">{fallback&&<svg viewBox="0 0 400 400" role="presentation"><defs><linearGradient id="fold-fallback" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f2f3ec"/><stop offset="1" stopColor="#78958b"/></linearGradient></defs><path d="M181 53q19-31 38 0l137 238q19 34-20 34H64q-39 0-20-34ZM200 130 108 286h184Z" fill="url(#fold-fallback)" fillRule="evenodd"/><path d="m200 130 92 156-13 16-92-157Z" fill="#b96b44"/></svg>}</div>;
}




