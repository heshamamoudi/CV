import * as THREE from 'three';
import { sculptureForm, sculptureGeometry } from './sculptureGeometry';
import { introMorph, introTravel, sculptureIntroForm } from './sculptureIntro';
import { sectionDetails } from './sectionDetails';

it('untangles a finite closed beam into the exact architectural topology', () => {
  const complex = sculptureIntroForm(), clear = sculptureForm(0,false);
  expect(complex.positions.length).toBe(clear.positions.length);
  expect(Array.from(complex.positions).every(Number.isFinite)).toBe(true);
  expect(Array.from(complex.positions.slice(-24))).toEqual(Array.from(complex.positions.slice(0,24)));
  const start = sculptureGeometry(complex.positions), end = sculptureGeometry(clear.positions);
  expect(Array.from(start.index!.array)).toEqual(Array.from(end.index!.array));
  expect(complex.positions).not.toEqual(clear.positions);
  for(const progress of [0,.16,.3,.5,.72,1]) {
    const morph = introMorph(progress);
    const points = complex.positions.map((v,i)=>THREE.MathUtils.lerp(v,clear.positions[i],morph));
    expect(Array.from(points).every(Number.isFinite)).toBe(true);
    if(progress===1) expect(points).toEqual(clear.positions);
  }
  start.dispose();end.dispose();
});

it('finishes resolving before the object travels into the intro composition', () => {
  expect(introMorph(0)).toBe(0);
  expect(introMorph(.73)).toBe(1);
  expect(introTravel(.70)).toBe(0);
  expect(introTravel(1)).toBe(1);
  let previous = 0;
  for(let i=0;i<=100;i++) { const p=introTravel(i/100);expect(p).toBeGreaterThanOrEqual(previous);previous=p; }
});

it('restores all architectural components exactly after an interrupted assembly', () => {
  const palette = [0,1,2,3].map(()=>new THREE.MeshStandardMaterial());
  const details = sectionDetails(palette);
  const original = details.groups[0].children.map(mesh=>({position:mesh.position.clone(),rotation:mesh.quaternion.clone()}));
  details.assemble(.35);details.assemble(.12);details.assemble(1);
  details.groups[0].children.forEach((mesh,i)=>{
    expect(mesh.position.distanceTo(original[i].position)).toBeLessThan(1e-10);
    expect(mesh.quaternion.angleTo(original[i].rotation)).toBeLessThan(1e-7);
  });
  details.show(2,1);
  expect(details.groups[0].visible).toBe(false);
  details.dispose();palette.forEach(material=>material.dispose());
});
