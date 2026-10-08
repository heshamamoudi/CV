import { architectureNodes, projectNodes, type ProjectSculpture } from './softwareArchitecture';

type Props = { lang:'en'|'ar'; project?:undefined; stages?:never } | { lang:'en'|'ar'; project:ProjectSculpture; stages:readonly string[] };

export function SoftwareLabels({lang,project,stages}:Props) {
  if(project) return <>{projectNodes[project].map((node,index)=><span className="software-node software-node-compact" data-system-node={node.id} key={node.id} aria-hidden="true"><strong dir="auto" style={{overflowWrap:'anywhere',maxWidth:'100%'}}>{stages[index]}</strong></span>)}</>;
  return <>{architectureNodes.map(node=><span className="software-node" data-system-node={node.id} key={node.id} aria-hidden="true" style={{color:node.id==='data'?'#d9f0e5':'#142b2e',letterSpacing:'-.035em'}}><strong dir={node.label===node.ar?'ltr':undefined}>{lang==='ar'?node.ar:node.label}</strong></span>)}</>;
}
