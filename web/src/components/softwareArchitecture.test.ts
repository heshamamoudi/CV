import { projectSculpture } from './softwareArchitecture';
import { sculptureForm, sculptureGeometry } from './sculptureGeometry';

it('selects the system by project identity rather than list position',()=>{
  expect(['inviteqr','selfhost-platform'].map(projectSculpture)).toEqual(['inviteqr','selfhost']);
  expect(projectSculpture('a-new-project')).toBe('delivery');
  expect(projectSculpture()).toBe('delivery');
});

it('uses distinct project targets with the same finite morph topology',()=>{
  const forms=(['selfhost','inviteqr','delivery'] as const).map(variant=>sculptureForm(1,false,0,variant));
  expect(forms[0].positions).not.toEqual(forms[1].positions);
  expect(forms[1].positions).not.toEqual(forms[2].positions);
  const meshes=forms.map(form=>sculptureGeometry(form.positions));
  for(const mesh of meshes)expect(Array.from(mesh.index!.array)).toEqual(Array.from(meshes[0].index!.array));
  for(const from of forms)for(const to of forms)for(const t of [0,.25,.5,.75,1]) {
    expect(from.positions.length).toBe(to.positions.length);
    const interpolated=from.positions.map((v,i)=>v+(to.positions[i]-v)*t);
    expect(Array.from(interpolated).every(Number.isFinite)).toBe(true);
    expect(Math.max(...interpolated)-Math.min(...interpolated)).toBeGreaterThan(3);
  }
  meshes.forEach(mesh=>mesh.dispose());
});
