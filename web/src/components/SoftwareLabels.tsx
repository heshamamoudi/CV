import { architectureNodes, projectNodes, type ProjectSculpture } from './softwareArchitecture';

export function SoftwareLabels({lang,project}:{lang:'en'|'ar';project?:ProjectSculpture}) {
  const nodes=project?projectNodes[project]:architectureNodes;
  return <>{nodes.map(node=><span className={`software-node${project?' software-node-compact':''}`} data-system-node={node.id} key={node.id} aria-hidden="true"><strong dir={node.label===node.ar?'ltr':undefined}>{lang==='ar'?node.ar:node.label}</strong>{!project&&<small>{lang==='ar'?node.detailAr:node.detail}</small>}</span>)}</>;
}
