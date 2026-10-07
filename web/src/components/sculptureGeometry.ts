import * as THREE from "three";

/** One continuous solid sheet. Every chapter has the same vertices and connectivity. */
export const SECTIONS = 96;
const PROFILE = 8;
export type SculptureForm = { positions: Float32Array; rotation: THREE.Quaternion; bounds: THREE.Vector3; center: THREE.Vector3; surface: THREE.Vector3[]; closed: boolean };

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
export function sculptureForm(chapter: number, portrait: boolean, tab = 0, project: 'selfhost' | 'inviteqr' | 'delivery' = 'selfhost'): SculptureForm {
  const closed = chapter === 0 || chapter === 1;
  let halfWidth = .43, depth = .19;
  let path: THREE.Vector2[];
  let euler: [number, number, number];
  if (chapter === 0) {
    // A routing circuit joins the application, API, services and workflow layers.
    path = roundedPath([[-2.05,1.15],[2.05,1.15],[2.05,-1.15],[-2.05,-1.15]],true,.12);
    halfWidth = .042; depth = .045;
    euler = [.10, -.16, -.035];
  } else if (chapter === 1) {
    // The orchestration loop becomes a guest workflow when the selected project changes.
    const ys=project==='inviteqr'?[-.35,.45,-.35]:project==='selfhost'?[.4,-.45,.4]:[0,0,0];
    path = roundedPath([[-1.65,ys[0]],[0,ys[1]],[1.65,ys[2]],[1.65,-1.12],[-1.65,-1.12]],true,.11);
    halfWidth = .038; depth = .04;
    euler = [.08, -.12, project==='inviteqr'?.025:-.025];
  } else if (chapter === 2) {
    // An ascending route: the original closed sheet opens into a winding ribbon.
    // The broad bends leave room for distinct career stations and their labels.
    path = roundedPath([[-2.65, -1.25], [-1.25, -1.25], [-.65, .05], [.75, .05], [1.35, 1.25], [2.65, 1.25]], false, .32);
    halfWidth = .34; depth = .085;
    euler = portrait ? [.22, -.16, .12] : [.34, -.18, -.055];
  } else if (chapter === 3) {
    // Two broad leaves meet at the spine of an open book.
    path = Array.from({length:SECTIONS+1},(_,i)=>new THREE.Vector2((i/SECTIONS-.5)*4.6,.06*Math.sin(i/SECTIONS*Math.PI)));
    halfWidth = 1.32; depth = .085;
    euler = [.28, -.18 + tab * .06, -.075];
  } else {
    // An envelope outline, its V-fold, and the raised opening flap share one path.
    path = roundedPath([[-2,1],[-2,-1.25],[2,-1.25],[2,1],[0,-.18],[-2,1],[0,2.12],[2,1]],false,.07);
    halfWidth = .105; depth = .075;
    euler = [.12, -.24, -.065];
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
    if (chapter === 0) z = 0;
    if (chapter === 3) z = .55 * Math.abs(t * 2 - 1);
    if (chapter === 4) z = .07;
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
  // Include every software module, its backing layers and connector ends in the fit.
  const limits = chapter===0 ? [[-2.97,-1.87,-.34],[2.97,1.88,.48]] : chapter===1 ? [[-2.40,-1.43,-.34],[2.40,1.24,.50]] : null;
  const detailLimits=limits??(chapter===3?[[-2.38,-1.72,-.12],[2.38,1.42,1.82]]:chapter===4?[[-2.4,-1.40,-.30],[2.4,2.40,.35]]:null);
  const detailBounds: [number,number,number][] = [];
  if(detailLimits) for(const x of [detailLimits[0][0],detailLimits[1][0]])
    for(const y of [detailLimits[0][1],detailLimits[1][1]])
      for(const z of [detailLimits[0][2],detailLimits[1][2]]) detailBounds.push([x,y,z]);
  for(const point of detailBounds)box.expandByPoint(vertex.set(...point).applyQuaternion(rotation));
  return { positions, rotation, bounds: box.getSize(new THREE.Vector3()), center: box.getCenter(new THREE.Vector3()), surface, closed };
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




