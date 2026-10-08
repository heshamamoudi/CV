import type { ProjectDto } from '../types';

export type ProjectSculpture = 'selfhost' | 'inviteqr' | 'delivery';
export type SceneNode = { id:string; x:number; y:number; z?:number; width:number; kind:'module'|'data'|'flow'|'health'|'invite'|'check' };
export type SoftwareNode = SceneNode & { label:string; ar:string; detail:string; detailAr:string };

export function projectSculpture(slug?:string):ProjectSculpture {
  if(slug==='selfhost-platform') return 'selfhost';
  if(slug==='inviteqr') return 'inviteqr';
  return 'delivery';
}

// Old embedded page snapshots may predate workflow fields. Geometry remains tied
// to project identity; changing editorial copy never changes the morph target.
export function projectWorkflow(project:ProjectDto|undefined,lang:'en'|'ar') {
  const ar=lang==='ar';
  const defaults=ar?['التحديد','البناء','التسليم']:['Define','Build','Deliver'];
  return {
    title:project?.workflowTitle?.trim()||(ar?'كيف يعمل':'HOW IT WORKS'),
    caption:project?.workflowCaption?.trim()||(ar?'فكرة تتحول إلى نتيجة مفيدة.':'An idea, built into a useful result.'),
    stages:defaults.map((label,index)=>project?.workflowStages?.[index]?.trim()||label),
  };
}

export const architectureNodes:SoftwareNode[] = [
  {id:'applications',x:.24,y:1.55,z:0,width:2.6,label:'Applications',ar:'التطبيقات',detail:'',detailAr:'',kind:'module'},
  {id:'orchestration',x:.02,y:.15,z:0,width:2.9,label:'Orchestration',ar:'التنسيق والتكامل',detail:'',detailAr:'',kind:'flow'},
  {id:'data',x:.14,y:-1.25,z:0,width:2.6,label:'Data',ar:'البيانات',detail:'',detailAr:'',kind:'data'},
];

// The same routes drive the physical conductors and their moving signals.
// Inputs converge at the left edge; one spine distributes the resolved flow.
export const architectureRoutes:[number,number,number][][] = [
  [[-2.95,1.20,-.28],[-2.55,1.20,-.28],[-2.15,.08,-.28],[-1.62,.08,-.28]],
  [[-3.15,.45,.24],[-2.70,.45,.24],[-2.20,.08,.24],[-1.62,.08,.24]],
  [[-2.82,-.48,.62],[-2.43,-.48,.62],[-2.05,.08,.62],[-1.62,.08,.62]],
  [[-1.62,.13,.24],[-.75,.13,-.48],[1.23,.13,-.48],[1.23,1.58,-.48]],
  [[1.23,.13,-.48],[1.23,-1.27,-.48],[.78,-1.27,-.48]],
];

export const projectNodes:Record<ProjectSculpture,SceneNode[]> = {
  selfhost:[
    {id:'deploy',x:-1.65,y:.4,width:1.28,kind:'module'},
    {id:'health',x:0,y:-.45,width:1.28,kind:'health'},
    {id:'recover',x:1.65,y:.4,width:1.28,kind:'data'},
  ],
  inviteqr:[
    {id:'invite',x:-1.65,y:-.35,width:1.28,kind:'invite'},
    {id:'guest',x:0,y:.45,width:1.28,kind:'flow'},
    {id:'checkin',x:1.65,y:-.35,width:1.28,kind:'check'},
  ],
  delivery:[
    {id:'define',x:-1.65,y:0,width:1.28,kind:'flow'},
    {id:'build',x:0,y:0,width:1.28,kind:'module'},
    {id:'deliver',x:1.65,y:0,width:1.28,kind:'check'},
  ],
};
