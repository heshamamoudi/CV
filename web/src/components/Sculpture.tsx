import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { JourneyDto } from "../types";
import { SECTIONS, sculptureForm, sculptureGeometry } from "./sculptureGeometry";

type Props = { chapter:number; paused:boolean; rtl?:boolean; journey?:JourneyDto[]; technologies?:{category:string;items:string[]}[]; selectedJourneyIndex?:number; selectedProjectIndex?:number; aboutTab?:number };
const ease=(t:number)=>t*t*t*(t*(t*6-15)+10);

/** One continuous object; only its fold, orientation and aperture change. */
export function Sculpture(props:Props) {
  const host=useRef<HTMLDivElement>(null),current=useRef(props);
  current.current=props;
  const [fallback,setFallback]=useState(false);
  useEffect(()=>{
    const el=host.current;if(!el)return;
    const anchor=el.parentElement?.querySelector<HTMLElement>("[data-scene-anchor]");
    if(!anchor){el.style.display="none";return;}
    const place=()=>{
      const parent=el.parentElement;if(!parent)return;
      const r=anchor.getBoundingClientRect(),p=parent.getBoundingClientRect();
      let left=Math.max(r.left,0),right=Math.min(r.right,innerWidth),top=Math.max(r.top,0),bottom=Math.min(r.bottom,innerHeight);
      for(let node=anchor.parentElement;node&&node!==parent;node=node.parentElement){
        const style=getComputedStyle(node),clipsX=/auto|scroll|hidden|clip/.test(style.overflowX),clipsY=/auto|scroll|hidden|clip/.test(style.overflowY);
        if(clipsX||clipsY){const bounds=node.getBoundingClientRect();if(clipsX){left=Math.max(left,bounds.left);right=Math.min(right,bounds.right)}if(clipsY){top=Math.max(top,bounds.top);bottom=Math.min(bottom,bounds.bottom)}}
      }
      el.style.display=right>left&&bottom>top?"block":"none";el.style.transition="none";
      el.style.clipPath=`inset(${Math.max(0,top-r.top)}px ${Math.max(0,r.right-right)}px ${Math.max(0,r.bottom-bottom)}px ${Math.max(0,left-r.left)}px)`;
      Object.assign(el.style,{left:`${r.left-p.left}px`,top:`${r.top-p.top}px`,width:`${r.width}px`,height:`${r.height}px`});
    };
    let animationFrame=0;
    const followAnimation=()=>{
      animationFrame=0;place();let node:HTMLElement|null=anchor,animating=false;
      while(node){if(node.getAnimations().some(a=>a.playState==="running"||a.pending)){animating=true;break;}node=node.parentElement;}
      if(animating)animationFrame=requestAnimationFrame(followAnimation);
    };
    place();
    const observer=new ResizeObserver(place);observer.observe(anchor);if(el.parentElement)observer.observe(el.parentElement);
    const startAnimationFollow=()=>{if(!animationFrame)animationFrame=requestAnimationFrame(followAnimation)};
    window.addEventListener("resize",place);window.addEventListener("scroll",place,true);
    const parents:HTMLElement[]=[];for(let node:HTMLElement|null=anchor;node;node=node.parentElement)parents.push(node);
    parents.forEach(node=>{node.addEventListener("animationstart",startAnimationFollow);node.addEventListener("transitionrun",startAnimationFollow)});
    startAnimationFollow();
    return()=>{observer.disconnect();cancelAnimationFrame(animationFrame);window.removeEventListener("resize",place);window.removeEventListener("scroll",place,true);parents.forEach(node=>{node.removeEventListener("animationstart",startAnimationFollow);node.removeEventListener("transitionrun",startAnimationFollow)})};
  },[props.chapter,props.rtl,props.journey?.length]);

  useEffect(()=>{
    const el=host.current;if(!el)return;
    let renderer:THREE.WebGLRenderer;
    try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:"low-power"})}catch{setFallback(true);return}
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.90;el.appendChild(renderer.domElement);
    const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-3,3,3,-3,.1,60);
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
    const idle=new THREE.Group(),root=new THREE.Group();scene.add(idle);idle.add(root);
    let width=Math.max(1,el.clientWidth),height=Math.max(1,el.clientHeight);
    let target=sculptureForm(current.current.chapter,height>width*1.15,current.current.aboutTab);
    const geometry=sculptureGeometry(target.positions),mesh=new THREE.Mesh(geometry,materials);root.add(mesh);root.quaternion.copy(target.rotation);
    const positions=geometry.getAttribute("position") as THREE.BufferAttribute;
    let fromPositions=new Float32Array(positions.array);
    const fromRotation=root.quaternion.clone(),center=target.center.clone(),fromCenter=center.clone();
    const fit=()=>Math.max(target.bounds.y,target.bounds.x/(width/height))*(current.current.chapter===1?1.10:1.26);
    let viewHeight=fit(),fromHeight=viewHeight,toHeight=viewHeight;
    let previous="",started=performance.now(),frame=0,last=performance.now(),phase=0,stopped=false,disposed=false;
    const resize=()=>{width=Math.max(1,el.clientWidth);height=Math.max(1,el.clientHeight);renderer.setSize(width,height,false)};
    const observer=new ResizeObserver(resize);observer.observe(el);resize();
    const pointer=new THREE.Vector2(),softPointer=new THREE.Vector2();
    const move=(event:PointerEvent)=>{if(event.pointerType==="touch")return;const r=el.getBoundingClientRect();pointer.set(THREE.MathUtils.clamp((event.clientX-r.left)/r.width-.5,-.5,.5),THREE.MathUtils.clamp((event.clientY-r.top)/r.height-.5,-.5,.5))};
    window.addEventListener("pointermove",move,{passive:true});
    const routeGeometry=new THREE.BufferGeometry(),routeMaterial=new THREE.LineBasicMaterial({color:0xb96b44,transparent:true,opacity:0});
    const route=new THREE.Line(routeGeometry,routeMaterial);root.add(route);
    const markerMaterial=new THREE.MeshStandardMaterial({color:0xd9956d,metalness:.6,roughness:.25,transparent:true,opacity:0});
    const marker=new THREE.Mesh(new THREE.SphereGeometry(.072,16,10),markerMaterial);root.add(marker);
    const stationGeometry=new THREE.SphereGeometry(.031,10,6),stationMaterial=new THREE.MeshBasicMaterial({color:0x315852,transparent:true,opacity:0});
    const stations:THREE.Mesh[]=[];
    let selectedAt=0,selectedTarget=0,selectedFrom=0,selectionStarted=performance.now(),previousSelection=-1,routeOpacity=0;
    const sampleSurface=(t:number,out:THREE.Vector3)=>{
      const index=THREE.MathUtils.clamp(t,0,1)*SECTIONS,a=Math.floor(index),b=Math.min(SECTIONS,a+1);
      return out.lerpVectors(target.surface[a],target.surface[b],index-a);
    };
    const dispose=()=>{
      if(disposed)return;disposed=true;observer.disconnect();window.removeEventListener("pointermove",move);renderer.domElement.removeEventListener("webglcontextlost",lost);
      geometry.dispose();materials.forEach(material=>material.dispose());environment.dispose();
      routeGeometry.dispose();routeMaterial.dispose();marker.geometry.dispose();markerMaterial.dispose();stationGeometry.dispose();stationMaterial.dispose();
      renderer.dispose();renderer.domElement.remove();
    };
    const lost=(event:Event)=>{event.preventDefault();stopped=true;cancelAnimationFrame(frame);setFallback(true);dispose()};
    renderer.domElement.addEventListener("webglcontextlost",lost);
    const update=(now:number)=>{
      if(stopped)return;frame=requestAnimationFrame(update);
      const dt=Math.min((now-last)/1000,.05);last=now;if(document.hidden||el.style.display==="none")return;
      const {chapter,paused,journey,selectedJourneyIndex=0,aboutTab=0}=current.current;
      const portrait=height>width*1.15,id=`${chapter}:${portrait}:${aboutTab}:${width}:${height}`;
      if(previous!==id){
        const first=previous==="";
        fromPositions=new Float32Array(positions.array);fromRotation.copy(root.quaternion);fromCenter.copy(center);fromHeight=viewHeight;
        // A chapter can move the object into a much narrower stage. Fit the outgoing
        // form once in that new aspect ratio before morphing, so it never gets cropped.
        const outgoing=new THREE.Box3(),vertex=new THREE.Vector3(),aspect=width/height;
        for(let i=0;i<fromPositions.length;i+=3)outgoing.expandByPoint(vertex.fromArray(fromPositions,i).applyQuaternion(fromRotation));
        fromHeight=Math.max(fromHeight,2*Math.max(Math.abs(outgoing.min.y-center.y),Math.abs(outgoing.max.y-center.y),Math.abs(outgoing.min.x-center.x)/aspect,Math.abs(outgoing.max.x-center.x)/aspect)*1.15);
        target=sculptureForm(chapter,portrait,aboutTab);toHeight=fit();started=now;
        if(first){fromHeight=toHeight;viewHeight=toHeight;fromCenter.copy(target.center);center.copy(target.center)}
        previous=id;materials[3].visible=chapter===2||chapter===4;
        if(chapter===2){
          routeGeometry.setFromPoints(target.surface);
          while(stations.length<(journey?.length??0)){const station=new THREE.Mesh(stationGeometry,stationMaterial);stations.push(station);root.add(station)}
          stations.forEach((station,i)=>{station.visible=i<(journey?.length??0);sampleSurface(.06+.88*i/Math.max(1,(journey?.length??1)-1),station.position)});
        }
      }
      const raw=paused?1:Math.min(1,(now-started)/1150),t=ease(raw);
      if(raw<1||positions.array[0]!==target.positions[0]){
        for(let i=0;i<target.positions.length;i++)positions.array[i]=THREE.MathUtils.lerp(fromPositions[i],target.positions[i],t);
        positions.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
      }
      if(chapter!==2&&chapter!==4){
        const normals=geometry.getAttribute("normal") as THREE.BufferAttribute;
        for(let j=0;j<8;j++){
          const end=SECTIONS*8+j,n=new THREE.Vector3(normals.getX(j)+normals.getX(end),normals.getY(j)+normals.getY(end),normals.getZ(j)+normals.getZ(end)).normalize();
          normals.setXYZ(j,n.x,n.y,n.z);normals.setXYZ(end,n.x,n.y,n.z);
        }
        normals.needsUpdate=true;
      }
      root.quaternion.copy(fromRotation).slerp(target.rotation,t);center.lerpVectors(fromCenter,target.center,t);viewHeight=THREE.MathUtils.lerp(fromHeight,toHeight,t);
      if(!paused)phase+=dt;
      softPointer.lerp(pointer,1-Math.exp(-dt*3));
      idle.rotation.set(paused?0:softPointer.y*.045,paused?0:Math.sin(phase*.32)*.025+softPointer.x*.065,0);idle.position.y=paused?0:Math.sin(phase*.55)*.025;
      const selection=Math.max(0,Math.min((journey?.length??1)-1,selectedJourneyIndex));
      if(selection!==previousSelection){selectedFrom=selectedAt;selectedTarget=.06+.88*selection/Math.max(1,(journey?.length??1)-1);selectionStarted=now;previousSelection=selection}
      selectedAt=THREE.MathUtils.lerp(selectedFrom,selectedTarget,ease(paused?1:Math.min(1,(now-selectionStarted)/550)));
      if(chapter===2)sampleSurface(selectedAt,marker.position);
      const desiredOpacity=chapter===2?(raw>.65?(raw-.65)/.35:0):0;
      routeOpacity=paused?desiredOpacity:THREE.MathUtils.damp(routeOpacity,desiredOpacity,8,dt);
      routeMaterial.opacity=routeOpacity*.85;markerMaterial.opacity=routeOpacity;stationMaterial.opacity=routeOpacity*.85;
      route.visible=marker.visible=routeOpacity>.005;stations.forEach((station,i)=>{station.visible=routeOpacity>.005&&i<(journey?.length??0)});
      const aspect=width/height;camera.left=-viewHeight*aspect/2;camera.right=-camera.left;camera.top=viewHeight/2;camera.bottom=-camera.top;
      camera.position.set(center.x,center.y,14);camera.lookAt(center.x,center.y,0);camera.updateProjectionMatrix();renderer.render(scene,camera);
    };
    frame=requestAnimationFrame(update);
    return()=>{stopped=true;cancelAnimationFrame(frame);dispose()};
  },[]);
  return <div ref={host} className={`sculpture${fallback?" sculpture-fallback":""}`} aria-hidden="true">{fallback&&<svg viewBox="0 0 400 400" role="presentation"><defs><linearGradient id="fold-fallback" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f2f3ec"/><stop offset="1" stopColor="#78958b"/></linearGradient></defs><path d="M181 53q19-31 38 0l137 238q19 34-20 34H64q-39 0-20-34ZM200 130 108 286h184Z" fill="url(#fold-fallback)" fillRule="evenodd"/><path d="m200 130 92 156-13 16-92-157Z" fill="#b96b44"/></svg>}</div>;
}

