import type { ProjectDto } from '../types';

export type ProjectSculpture = 'selfhost' | 'inviteqr' | 'delivery';
export type SceneNode = { id:string; x:number; y:number; width:number; kind:'module'|'data'|'flow'|'health'|'invite'|'check' };
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
  {id:'client',x:-2.05,y:1.15,width:1.65,label:'React',ar:'React',detail:'Application',detailAr:'التطبيق',kind:'module'},
  {id:'api',x:0,y:1.15,width:1.65,label:'.NET API',ar:'.NET API',detail:'Business logic',detailAr:'منطق الأعمال',kind:'module'},
  {id:'services',x:2.05,y:1.15,width:1.65,label:'Services',ar:'الخدمات',detail:'Connected systems',detailAr:'أنظمة مترابطة',kind:'module'},
  {id:'workflow',x:-2.05,y:-1.15,width:1.65,label:'Workflow',ar:'سير العمل',detail:'Aligned procedures',detailAr:'إجراءات متسقة',kind:'flow'},
  {id:'automation',x:0,y:-1.15,width:1.65,label:'Automation',ar:'الأتمتة',detail:'Integration',detailAr:'التكامل',kind:'flow'},
  {id:'data',x:2.05,y:-1.15,width:1.65,label:'Data',ar:'البيانات',detail:'Shared foundation',detailAr:'مصدر موحّد',kind:'data'},
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
