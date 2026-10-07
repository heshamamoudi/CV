import * as THREE from 'three';
import { SECTIONS, type SculptureForm } from './sculptureGeometry';

/** A closed woven beam with exactly the architectural frame's vertex order.
 * Nothing is swapped at the reveal: these vertices become sculptureForm(0). */
export function sculptureIntroForm(): SculptureForm {
  const curve = (t: number) => {
    const a = t * Math.PI * 2;
    const radius = 1.62 + .46 * Math.cos(3 * a);
    return new THREE.Vector3(radius * Math.cos(2 * a), radius * Math.sin(2 * a), .86 * Math.sin(3 * a));
  };
  const positions = new Float32Array((SECTIONS + 1) * 8 * 3);
  const profile = [[.055,.055],[-.055,.055],[-.075,.035],[-.075,-.035],[-.055,-.055],[.055,-.055],[.075,-.035],[.075,.035]];
  const surface: THREE.Vector3[] = [];
  for (let i = 0; i <= SECTIONS; i++) {
    const t = i / SECTIONS, point = curve(t);
    const tangent = curve(t + .0001).sub(curve(t - .0001)).normalize();
    const across = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
    const normal = new THREE.Vector3().crossVectors(tangent, across).normalize();
    surface.push(point.clone().addScaledVector(normal, .08));
    profile.forEach(([w,d], j) => point.clone().addScaledVector(across,w).addScaledVector(normal,d).toArray(positions,(i*8+j)*3));
  }
  // Share the seam exactly, including its bevels, so the early object is watertight.
  positions.set(positions.slice(0,24),positions.length-24);
  const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(.48,-.48,-.18));
  const box = new THREE.Box3(), vertex = new THREE.Vector3();
  for (let i=0;i<positions.length;i+=3) box.expandByPoint(vertex.fromArray(positions,i).applyQuaternion(rotation));
  return { positions, rotation, bounds: box.getSize(new THREE.Vector3()), center: box.getCenter(new THREE.Vector3()), surface, closed:true };
}

export const introEase = (value: number) => {
  const t = THREE.MathUtils.clamp(value,0,1);
  return t*t*t*(t*(t*6-15)+10);
};

export const introMorph = (progress: number) => introEase((progress-.16)/.56);
export const introTravel = (progress: number) => introEase((progress-.70)/.30);
