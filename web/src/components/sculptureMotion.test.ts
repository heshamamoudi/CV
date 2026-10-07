import * as THREE from 'three';
import { bookPagePoint, sculptureMotion } from './sculptureMotion';
import { sculptureForm } from './sculptureGeometry';

it('keeps the page attached to its binding throughout a curved turn',()=>{
  for(let i=0;i<=20;i++) {
    const turn=i/20;
    expect(bookPagePoint(0,.5,turn).distanceTo(new THREE.Vector3(0,0,.15))).toBeLessThan(1e-10);
    expect(bookPagePoint(1,.5,turn).toArray().every(Number.isFinite)).toBe(true);
  }
  expect(bookPagePoint(1,.5,0).x).toBeCloseTo(2.2);
  expect(bookPagePoint(1,.5,1).x).toBeCloseTo(-2.2);
  expect(bookPagePoint(1,.5,.5).z).toBeGreaterThan(1.5);
});

it('keeps the final topology alive and resolves tangled wires into clean connections',()=>{
  const motion=sculptureMotion();
  motion.update(0,1,0,false,0);
  const wire=motion.groups[0].children.find(item=>item instanceof THREE.Line) as THREE.Line;
  const tangled=Array.from(wire.geometry.getAttribute('position').array);
  motion.update(0,1,0,false,1);
  expect(Array.from(wire.geometry.getAttribute('position').array)).not.toEqual(tangled);
  const positions=motion.groups[0].children.map(item=>item.position.clone());
  motion.update(0,1,1,false,1);
  expect(motion.groups[0].children.some((item,i)=>item.position.distanceTo(positions[i])>.01)).toBe(true);
  motion.dispose();
});

it('gives paused book and message poses stable geometry and hides interrupted outgoing effects',()=>{
  const motion=sculptureMotion();
  motion.update(3,1,0,true);
  const page=motion.groups[3].getObjectByName('turning-page') as THREE.Mesh;
  const initial=Array.from(page.geometry.getAttribute('position').array);
  motion.update(3,1,5,true);
  expect(Array.from(page.geometry.getAttribute('position').array)).toEqual(initial);
  motion.update(4,.2,5,false);motion.update(0,.1,5,false);motion.update(4,1,5,true);
  const note=motion.groups[4].getObjectByName('written-note')!;
  const settled=note.position.clone();
  motion.update(4,1,8,true);
  expect(note.position).toEqual(settled);
  expect(motion.groups[0].visible).toBe(false);
  expect(motion.groups[3].visible).toBe(false);
  expect(motion.groups[4].visible).toBe(true);
  motion.dispose();
});

it('fits the moving pages and letter within the declared scene bounds',()=>{
  const motion=sculptureMotion();
  for(const chapter of [3,4]) {
    const form=sculptureForm(chapter,false);
    const minimum=form.center.clone().addScaledVector(form.bounds,-.5),maximum=form.center.clone().addScaledVector(form.bounds,.5);
    for(const time of [0,3,4.4,5.5,7]) {
      motion.update(chapter,1,time,false);
      motion.groups[chapter].updateMatrixWorld(true);
      motion.groups[chapter].traverse(object=>{
        if(!(object instanceof THREE.Mesh || object instanceof THREE.Line))return;
        object.geometry.computeBoundingBox();
        const transform=new THREE.Matrix4().makeRotationFromQuaternion(form.rotation).multiply(object.matrixWorld);
        const bounds=object.geometry.boundingBox!.clone().applyMatrix4(transform);
        for(const axis of ['x','y','z'] as const) {
          expect(bounds.min[axis]).toBeGreaterThanOrEqual(minimum[axis]-.001);
          expect(bounds.max[axis]).toBeLessThanOrEqual(maximum[axis]+.001);
        }
      });
    }
  }
  motion.dispose();
});
