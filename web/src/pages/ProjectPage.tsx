import type { ProjectDto } from '../types';

export function ProjectPage({ project }: { project: ProjectDto }) {
  return (
    <article>
      <h1>{project.title}</h1>
      <p>{project.summary}</p>
      {project.body && <p>{project.body}</p>}
      {project.technologies.length > 0 && <ul>{project.technologies.map(t => <li key={t}>{t}</li>)}</ul>}
    </article>
  );
}
