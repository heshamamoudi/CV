import { projectSculpture, projectWorkflow } from './softwareArchitecture';
import type { ProjectDto } from '../types';
import { sculptureForm, sculptureGeometry } from './sculptureGeometry';

it('uses resolved editorial copy for any project without changing its geometry identity',()=>{
  const project={slug:'new-project',workflowTitle:'Release flow',workflowCaption:'A reviewed release.',workflowStages:['Prepare','Review','Publish']} as ProjectDto;
  expect(projectWorkflow(project,'en')).toEqual({title:'Release flow',caption:'A reviewed release.',stages:['Prepare','Review','Publish']});
  expect(projectWorkflow({...project,workflowTitle:'مسار الإصدار',workflowCaption:'إصدار تمت مراجعته.',workflowStages:['الإعداد','المراجعة','النشر']},'ar')).toEqual({title:'مسار الإصدار',caption:'إصدار تمت مراجعته.',stages:['الإعداد','المراجعة','النشر']});
  expect(projectSculpture(project.slug)).toBe('delivery');
});

it('fills missing legacy copy by language and keeps exactly three ordered stages',()=>{
  expect(projectWorkflow({slug:'inviteqr',workflowStages:['Custom',' ','Arrive','extra']} as ProjectDto,'en').stages).toEqual(['Custom','Build','Arrive']);
  expect(projectWorkflow({slug:'selfhost-platform'} as ProjectDto,'ar').stages).toEqual(['التحديد','البناء','التسليم']);
  expect(projectWorkflow(undefined,'en')).toEqual({title:'HOW IT WORKS',caption:'An idea, built into a useful result.',stages:['Define','Build','Deliver']});
});

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
