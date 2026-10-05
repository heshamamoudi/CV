export type ProjectSculpture = 'selfhost' | 'inviteqr' | 'delivery';
export type SoftwareNode = { id:string; x:number; y:number; width:number; label:string; ar:string; detail:string; detailAr:string; kind:'module'|'data'|'flow'|'health'|'invite'|'check' };

export function projectSculpture(slug?:string):ProjectSculpture {
  if(slug==='selfhost-platform') return 'selfhost';
  if(slug==='inviteqr') return 'inviteqr';
  return 'delivery';
}

export const architectureNodes:SoftwareNode[] = [
  {id:'client',x:-2.05,y:1.15,width:1.65,label:'React',ar:'React',detail:'Application',detailAr:'التطبيق',kind:'module'},
  {id:'api',x:0,y:1.15,width:1.65,label:'.NET API',ar:'.NET API',detail:'Business logic',detailAr:'منطق الأعمال',kind:'module'},
  {id:'services',x:2.05,y:1.15,width:1.65,label:'Services',ar:'الخدمات',detail:'Connected systems',detailAr:'أنظمة مترابطة',kind:'module'},
  {id:'workflow',x:-2.05,y:-1.15,width:1.65,label:'Workflow',ar:'سير العمل',detail:'Aligned procedures',detailAr:'إجراءات متسقة',kind:'flow'},
  {id:'automation',x:0,y:-1.15,width:1.65,label:'Automation',ar:'الأتمتة',detail:'Integration',detailAr:'التكامل',kind:'flow'},
  {id:'data',x:2.05,y:-1.15,width:1.65,label:'Data',ar:'البيانات',detail:'Shared foundation',detailAr:'مصدر موحّد',kind:'data'},
];

export const projectNodes:Record<ProjectSculpture,SoftwareNode[]> = {
  selfhost:[
    {id:'deploy',x:-1.65,y:.4,width:1.28,label:'Deploy',ar:'النشر',detail:'',detailAr:'',kind:'module'},
    {id:'health',x:0,y:-.45,width:1.28,label:'Monitor',ar:'المراقبة',detail:'',detailAr:'',kind:'health'},
    {id:'recover',x:1.65,y:.4,width:1.28,label:'Recover',ar:'الاستعادة',detail:'',detailAr:'',kind:'data'},
  ],
  inviteqr:[
    {id:'invite',x:-1.65,y:-.35,width:1.28,label:'Invite',ar:'الدعوة',detail:'',detailAr:'',kind:'invite'},
    {id:'guest',x:0,y:.45,width:1.28,label:'Guest',ar:'الضيف',detail:'',detailAr:'',kind:'flow'},
    {id:'checkin',x:1.65,y:-.35,width:1.28,label:'Check in',ar:'الدخول',detail:'',detailAr:'',kind:'check'},
  ],
  delivery:[
    {id:'define',x:-1.65,y:0,width:1.28,label:'Define',ar:'التحديد',detail:'',detailAr:'',kind:'flow'},
    {id:'build',x:0,y:0,width:1.28,label:'Build',ar:'البناء',detail:'',detailAr:'',kind:'module'},
    {id:'deliver',x:1.65,y:0,width:1.28,label:'Deliver',ar:'التسليم',detail:'',detailAr:'',kind:'check'},
  ],
};
