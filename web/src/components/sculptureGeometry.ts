import * as THREE from "three";

/** One continuous solid sheet. Every chapter has the same vertices and connectivity. */
export const SECTIONS = 96;
const PROFILE = 8;
export type SculptureForm = { positions: Float32Array; rotation: THREE.Quaternion; bounds: THREE.Vector3; center: THREE.Vector3; surface: THREE.Vector3[] };

function roundedPath(points: [number, number][], closed: boolean, cut: number) {
  const path = new THREE.Path();
  const p = points.map(([x, y]) => new THREE.Vector2(x, y));
  if (!closed) path.moveTo(p[0].x, p[0].y);
  for (let i = 0; i < p.length; i++) {
    if (!closed && (i === 0 || i === p.length - 1)) {
      if (i) path.lineTo(p[i].x, p[i].y);
      continue;
    }
    const before = p[i].clone().lerp(p[(i + p.length - 1) % p.length], cut);
    const after = p[i].clone().lerp(p[(i + 1) % p.length], cut);
    if (i === 0) path.moveTo(before.x, before.y);
    else path.lineTo(before.x, before.y);
    path.quadraticCurveTo(p[i].x, p[i].y, after.x, after.y);
  }
  if (closed) path.closePath();
  return path.getSpacedPoints(SECTIONS);
}

export function sculptureForm(chapter: number, portrait: boolean, tab = 0): SculptureForm {
  const closed = chapter === 0 || chapter === 1 || chapter === 3;
  let halfWidth = .43, depth = .19;
  let path: THREE.Vector2[];
  let euler: [number, number, number];
  if (chapter === 0) {
    path = roundedPath([[0, 1.95], [-1.95, -1.35], [1.95, -1.35]], true, .30);
    halfWidth = .46; depth = .23;
    euler = [.34, -.60, -.12];
  } else if (chapter === 1) {
    path = roundedPath([[2.55, 1.66], [-2.55, 1.66], [-2.55, -1.66], [2.55, -1.66]], true, .11);
    halfWidth = .23; depth = .19;
    euler = [.04, -.055, -.015];
  } else if (chapter === 2) {
    // An ascending route: the original closed sheet opens into a winding ribbon.
    // The broad bends leave room for distinct career stations and their labels.
    path = roundedPath([[-2.65, -1.25], [-1.25, -1.25], [-.65, .05], [.75, .05], [1.35, 1.25], [2.65, 1.25]], false, .32);
    halfWidth = .34; depth = .085;
    euler = portrait ? [.22, -.16, .12] : [.34, -.18, -.055];
  } else if (chapter === 3) {
    path = roundedPath([[1.5, 1.65], [-1.5, 1.65], [-1.5, -1.65], [1.5, -1.65]], true, .32);
    halfWidth = .55; depth = .23;
    euler = [.32, .42 + tab * .06, -.24];
  } else {
    path = roundedPath([[-1.95, 1.18], [-1.95, -1.25], [1.95, -1.25], [1.95, 1.18]], false, .24);
    halfWidth = .40; depth = .22;
    euler = [.38, -.32, -.10];
  }
  const positions = new Float32Array((SECTIONS + 1) * PROFILE * 3);
  const surface: THREE.Vector3[] = [];
  const bevel = Math.min(.045, depth * .45);
  // The broad front, four narrow bevels, copper inner wall, and a teal reverse.
  const profile = [[halfWidth - bevel, depth], [-halfWidth + bevel, depth], [-halfWidth, depth - bevel], [-halfWidth, -depth + bevel], [-halfWidth + bevel, -depth], [halfWidth - bevel, -depth], [halfWidth, -depth + bevel], [halfWidth, depth - bevel]];
  for (let i = 0; i <= SECTIONS; i++) {
    const t = i / SECTIONS;
    const before = path[i === 0 ? closed ? SECTIONS - 1 : 0 : i - 1];
    const after = path[i === SECTIONS ? closed ? 1 : SECTIONS : i + 1];
    const tangent = after.clone().sub(before).normalize();
    const across = new THREE.Vector3(tangent.y, -tangent.x, 0);
    let z = 0, twist = 0;
    if (chapter === 0) { z = .24 * Math.sin(t * Math.PI * 2); twist = .15 * Math.sin(t * Math.PI * 2); }
    if (chapter === 3) { z = .38 * Math.sin(t * Math.PI * 2); twist = .24 * Math.cos(t * Math.PI * 2); }
    if (chapter === 4) z = .22 * Math.cos(t * Math.PI * 2);
    if (chapter === 2) {
      z = .22 * Math.sin(t * Math.PI * 3);
      twist = .10 * Math.sin(t * Math.PI * 4);
    }
    const normal = new THREE.Vector3(-across.x * Math.sin(twist), -across.y * Math.sin(twist), Math.cos(twist));
    across.multiplyScalar(Math.cos(twist)); across.z = Math.sin(twist);
    const center = new THREE.Vector3(path[i].x, path[i].y, z);
    surface.push(center.clone().addScaledVector(normal, depth + .025));
    profile.forEach(([w, d], j) => {
      const v = center.clone().addScaledVector(across, w).addScaledVector(normal, d);
      v.toArray(positions, (i * PROFILE + j) * 3);
    });
  }
  const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(...euler));
  const box = new THREE.Box3(), vertex = new THREE.Vector3();
  for (let i = 0; i < positions.length; i += 3) box.expandByPoint(vertex.fromArray(positions, i).applyQuaternion(rotation));
  return { positions, rotation, bounds: box.getSize(new THREE.Vector3()), center: box.getCenter(new THREE.Vector3()), surface };
}

export function sculptureGeometry(positions: Float32Array) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions.slice(), 3).setUsage(THREE.DynamicDrawUsage));
  const indices: number[] = [];
  for (let side = 0; side < PROFILE; side++) {
    const start = indices.length, next = (side + 1) % PROFILE;
    for (let i = 0; i < SECTIONS; i++) {
      const a = i * PROFILE + side, b = (i + 1) * PROFILE + side, c = (i + 1) * PROFILE + next, d = i * PROFILE + next;
      indices.push(a, b, d, b, c, d);
    }
    geometry.addGroup(start, indices.length - start, side === 2 ? 1 : side === 3 || side === 4 ? 2 : 0);
  }
  const start = indices.length;
  for (let j = 1; j < PROFILE - 1; j++) {
    indices.push(0, j + 1, j);
    const end = SECTIONS * PROFILE; indices.push(end, end + j, end + j + 1);
  }
  geometry.addGroup(start, indices.length - start, 3);
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}
