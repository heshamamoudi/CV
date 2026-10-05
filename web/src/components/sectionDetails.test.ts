import * as THREE from 'three';
import { sculptureForm } from './sculptureGeometry';
import { sectionDetails } from './sectionDetails';

it('fits every software and project variant inside its declared rotated bounds', () => {
  const palette=[0,1,2,3].map(()=>new THREE.MeshStandardMaterial());
  const details=sectionDetails(palette);
  for(const [chapter,variant,index] of [[0,'selfhost',0],[1,'selfhost',1],[1,'inviteqr',5],[1,'delivery',6]] as const) {
    details.show(chapter,1,variant);
    const form=sculptureForm(chapter,false,0,variant);
    const minimum=form.center.clone().addScaledVector(form.bounds,-.5);
    const maximum=form.center.clone().addScaledVector(form.bounds,.5);
    details.groups[index].updateMatrixWorld(true);
    for(const item of details.groups[index].children) {
      const mesh=item as THREE.Mesh;
      mesh.geometry.computeBoundingBox();
      const transform=new THREE.Matrix4().makeRotationFromQuaternion(form.rotation).multiply(mesh.matrixWorld);
      const bounds=mesh.geometry.boundingBox!.clone().applyMatrix4(transform);
      for(const axis of ['x','y','z'] as const) {
        expect(bounds.min[axis]).toBeGreaterThanOrEqual(minimum[axis]-.001);
        expect(bounds.max[axis]).toBeLessThanOrEqual(maximum[axis]+.001);
      }
    }
  }
  details.dispose();palette.forEach(material=>material.dispose());
});

it('settles the selected project after interrupted variant and chapter transitions', () => {
  const palette=[0,1,2,3].map(()=>new THREE.MeshStandardMaterial());
  const details=sectionDetails(palette);
  const finished=details.groups.map(group=>group.children.map(mesh=>mesh.position.clone()));
  details.show(0,1);details.show(1,.30,'selfhost');details.show(1,.15,'inviteqr');details.show(1,.2,'selfhost');details.show(1,1,'inviteqr');
  details.groups[5].children.forEach((mesh,i)=>expect(mesh.position.distanceTo(finished[5][i])).toBeLessThan(1e-8));
  expect(details.groups[0].visible).toBe(false);
  expect(details.groups[1].visible).toBe(false);
  expect(details.groups[5].visible).toBe(true);
  details.dispose();palette.forEach(material=>material.dispose());
});
